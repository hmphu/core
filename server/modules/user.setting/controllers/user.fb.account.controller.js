'use strict';
//
//  user.fb.account.controller.js
//  handle fb account controller
//
//  Created by khanhpq on 2015-12-25.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    UserFbAccount = mongoose.model('UserFbAccount'),
    utils = require('../../core/resources/utils'),
    fb_res = require('../../core/resources/fb'),
    cache = require(path.resolve('./config/lib/redis.cache'));

/**
 * process callback from facebook when add new account, get all account of user
 * process reauthorize
 * response all fb account
 * @author: khanhpq
 */
exports.callback = (req, res, next) => {
    // init params
    if(req.query && req.query.error){
        var response = `<html><body>Response facebook users<script type='text/javascript'> var data = ${JSON.stringify(req.query)};localStorage.setItem('fbAccount',JSON.stringify(data));</script></body></html>`;
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
        res.write(response, 'utf8'); 
        res.end();
        return;
    }

    var code = req.query.code,
        state = JSON.parse(decodeURIComponent(req.query.state || "{}")),
        idOwner = utils.getParentUserId(req.user),
        apiUrl = utils.getFullUrl(req.user),
        redirect_uri = `${apiUrl}${config.facebook.userCallbackURL}`;
    
    if (!code) {
        return next(new TypeError("user.fb_account.code.error"));
    }

    redirect_uri += "?state="+ encodeURIComponent(JSON.stringify(state));
    /*if(state.is_public != undefined && !state.is_public){
        redirect_uri += "?state="+ encodeURIComponent(JSON.stringify(state));
    }*/

	new Promise(function(resolve, reject) {
        //get access_token
        fb_res.getAccessTokenByCode(redirect_uri, code, function(err, result){
            if (err) {
                console.error(err, "Failed to get getAccessTokenByCode");
                return reject(new TypeError('fb.auth.failed'));
            }
            resolve(result.access_token);
        });
            
    }).then(function(tmp_access_token) {

        return new Promise(function(resolve, reject) {
            fb_res.getExchangeToken(tmp_access_token, function(err, result){
                if (err) {
                    console.error(err, "Failed to get getExchangeToken");
                    return reject(new TypeError('fb.auth.getExchangeToken.failed'));
                }
                resolve(result.access_token);
            });
        });

    }).then(function(access_token) {
        
        return new Promise(function(resolve, reject) {
            fb_res.fetch(access_token, 'me', function(err, result){
                if (err) {
                    return reject(new TypeError('fb.fetch.failed'));
                }

                UserFbAccount.findOne({ed_user_id: idOwner, fb_id: result.id}, (err, fbAcc) => {
                    if (err) {
                        return reject(err);
                    }
                    //if not found -> create new fb account
                    //else reauthorize
                    //else if exist with different is_public -> error
                    
                    if(fbAcc && fbAcc.is_public != (state.is_public === 1)){
                        //return new TypeError('fb.account_existed');
                        var response = `<html><body>Response facebook users<script type='text/javascript'> var data = ${JSON.stringify({
                            error: true, text: 'fb.account_existed'
                        })};localStorage.setItem('fbAccount',JSON.stringify(data));</script></body></html>`;
                        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                        res.write(response, 'utf8'); 
                        return res.end();
                    }
                        
                    if(!fbAcc){
                        fbAcc = new UserFbAccount();
                    }
                    fbAcc.ed_user_id = idOwner;
                    fbAcc.fb_id = result.id;
                    fbAcc.name = result.name;
                    fbAcc.access_token = access_token;
                    fbAcc.is_public = state.is_public === 1 ? true : false;
                    fbAcc.user_id = req.user._id;

                    cache.saveAndUpdateCache(`fb_account_${idOwner}`, fbAcc.fb_id, fbAcc, (errsave) => {
                        if(errsave){
                            return next(errsave);
                        }
                        var fbAccount = {
                            _id: fbAcc._id,
                            fb_id: fbAcc.fb_id,
                            name: fbAcc.name,
                            is_active: true
                        };
                        var response = `<html><body>Response facebook users<script type='text/javascript'> var data = ${JSON.stringify(fbAccount)};localStorage.setItem('fbAccount',JSON.stringify(data));</script></body></html>`;
                        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                        res.write(response, 'utf8'); 
                        res.end();
                    });
                });
            });
        });
    }, function(reason) {
        next(reason);
    });    
};

/**
 * show all fb account of owner id
 * @author: khanhpq
 */
exports.list = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user),
        params = {
            query: {
                ed_user_id: idOwner,
                is_active: req.query.is_active == '1'? true: false
            },
            select: '-access_token',
            skip: req.query.skip,
            sort_order: req.query.sort_order,
            limit: req.query.limit
        };

    if(req.query.is_public == '1'){
        params.query.is_public = true;
    }else if(req.query.is_public == '0'){
        params.query.is_public = false;
        params.query.user_id = req.user._id;
    }else{
       params.query['$or']= [
            {
                is_public: true
            },{
                user_id: req.user._id
            }];
        }

    utils.findByQuery(UserFbAccount, params).exec((err, fbAccounts) =>{
        if(err){
            return next(err);
        }
        res.json(fbAccounts);
    });
};

/**
 * read fb account
 * @author: khanhpq
 */
exports.read = (req, res, next) => {
    res.json(req.fb_account);
};

/**
 * count all fb user of owner id
 * @author: khanhpq
 */
exports.count = (req, res, next) => {
    var query = {
        ed_user_id: utils.getParentUserId(req.user),
    };
    
    if(req.query.is_public == '1'){
        query.is_public = true;
    }else if(req.query.is_public == '0'){
        query.is_public = false;
        query.user_id = req.user._id;
    }else{
        query['$or']= [
        {
            is_public: true
        },{
            user_id: req.user._id
        }];
    }
    
    new Promise(function(resolve, reject) {
        query.is_active = true;
        UserFbAccount.count(query, function (err, count) {
            if (err) {
                return reject(errsave);
            }
            resolve(count);
        });
    }).then(function(count_active) {

        return new Promise(function(resolve, reject) {
            query.is_active = false;
            UserFbAccount.count(query, function (err, count) {
                if (err) {
                    return reject(err);
                }
                res.json({count_inactive: count, count_active: count_active});
            });
        });
    }, function(reason) {
        next(reason);
    });
};


/**
 * deactive or active fb account
 * @author: khanhpq
 */
exports.toggle = (req, res, next) => {
    var fb_account = req.fb_account,
        idOwner = utils.getParentUserId(req.user);
    
    fb_account.is_active = !fb_account.is_active;
    
    cache.saveAndUpdateCache(`fb_account_${idOwner}`, fb_account.fb_id, fb_account, (errsave) => {
        if(errsave){
            return next(errsave);
        }

        if(fb_account.is_active === false){
            cache.removeCache(`fb_account_${idOwner}`, fb_account.fb_id, (errsave) => {
                if(errsave){
                    return next(errsave);
                }

                fb_account.access_token = undefined;
                res.json(fb_account);
            });
        }else{
            fb_account.access_token = undefined;
            res.json(fb_account);
        }
    });
};

/**
 * unlink fb account
 * @author: khanhpq
 */
exports.remove = (req, res, next) => {
    var fb_account = req.fb_account,
        idOwner = utils.getParentUserId(req.user);
    
    cache.removeDataAndCache(`fb_account_${idOwner}`, fb_account.fb_id, fb_account, null, function(err, result){
        if (err) {
            return next(err);
        }
        
        res.json({is_succes: true});
    });
};

/*
 * get access token facebook user
 * @author: vupl
 */
exports.getAccessToken = (data, next) =>{
    var query = {
        ed_user_id: data.ed_user_id,
        fb_id: data.fb_id,
        is_active: data.is_active
    };
    cache.findOneWithCache(`fb_account_${data.ed_user_id}`, data.fb_id, UserFbAccount, query, (err, result) =>{
        if(err){
            console.error(err, "Failed to get access token facebook user");
            return next(err);
        }
        return next(null, result);
    });
};

/**
 *
 * author : khanhpq
 */
exports.fbAccountByID = (req, res, next, id) => {
    // check the validity of fb_account id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('user.fb.id.objectId'));
    }
    
    var idOwner = utils.getParentUserId(req.user);
    // find fb_account by its id
    UserFbAccount.findById(id).exec((err, fbAccount) => {
        if (err){
            return next(err);
        }

        //Check is owner
        if (!fbAccount || !_.isEqual(fbAccount.ed_user_id, idOwner)) {
            return next(new TypeError('user.fb.id.notFound'));
        }
        req.fb_account = fbAccount;
        next();
    });
};
