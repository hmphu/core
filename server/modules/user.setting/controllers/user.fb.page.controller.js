'use strict';
//
//  user.fb.page.controller.js
//  handle fb page controller
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
    UserFbPage = mongoose.model('UserFbPage'),
    https = require('https'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    userSetting = require('../../user.setting/controllers/user.setting.controller'),
    validator = require('../validator/user.fb.page.validator'),
    utils = require('../../core/resources/utils'),
    fb_res = require('../../core/resources/fb'),
    cache = require(path.resolve('./config/lib/redis.cache'));

/**
 * process callback from facebook when add new page, get all page of user
 * process reauthorize
 * response all fb page
 * @author: khanhpq
 */
exports.callback = (req, res, next) => {
    // init params
    if(req.query && req.query.error){
        var response = `<html><body>Response facebook pages<script type='text/javascript'> var data = ${JSON.stringify(req.query)};localStorage.setItem('fbPages',JSON.stringify(data));</script></body></html>`;
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});

        res.write(response, 'utf8'); 
        res.end();    
        return;
    }
    
    var code = req.query.code,
        idOwner = utils.getParentUserId(req.user),    
//        redirect_uri = `${config.izi.protocal}://${config.facebook.subdomainCallback}.${config.izi.domain}:${config.izi.port}${config.facebook.pageCallbackURL}`;
        apiUrl = utils.getFullUrl(req.user),
        redirect_uri = `${apiUrl}${config.facebook.pageCallbackURL}`;
    if (!code) {
        return next("user.fb_page.code.error");
    }
    
	new Promise(function(resolve, reject) {
        //get access_token
        fb_res.getAccessTokenByCode(redirect_uri, code, function(err, result){
            if (err) {
                return reject( JSON.stringify(err));
            }
            resolve(result.access_token);
        });
            
    }).then(function(access_token) {
        
        return new Promise(function(resolve, reject) {
             fb_res.fetch(access_token, 'me/accounts', function(err, pages){
                if (err) {
                    return reject( JSON.stringify(err));
                }
                resolve(pages);
            });
        });
    }).then(function(fbPages) {

        return new Promise(function(resolve, reject) {

            var pages = fbPages.data;
            var new_pages = [];
            var tasks = [];

            // check pages exist
            pages.forEach((fb_page) => {
                var promise = new Promise((resolve, reject) => {
                    UserFbPage.findOne({page_id: fb_page.id}, (err, fbPage) => {
                        if(err){
                            return reject( JSON.stringify(err));
                        }

                        //return pages not exist
                        if(!fbPage){
                            new_pages[new_pages.length] = {
                                page_id: fb_page.id,
                                type: fb_page.category,
                                name: fb_page.name,
                                access_token: fb_page.access_token,
                                valid_token: true
                            }
                        }

                        resolve();
                    });
                });
                tasks.push(promise);
            });

            Promise.all(tasks).then(function(pages) {
                var response = `<html><body>Response facebook pages<script type='text/javascript'> var data = ${JSON.stringify(new_pages)};localStorage.setItem('fbPages',JSON.stringify(data));</script></body></html>`;
                res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                
                res.write(response, 'utf8'); 
                res.end();
                //res.json(new_pages);

            }, function(reason) {
                reject(reason);
            });

        });
        
    }, function(reason) {
        next(reason);
    });
};


/**
 * add new a fb page
 * @author: khanhpq
 */
exports.add = (req, res, next) => {

    var idOwner = utils.getParentUserId(req.user),
    body = req.body;
    
    var fb = (req.user.settings.features || {channels:{facebooks: {current_no: 0, quantity: 0}}}).channels.facebooks;
    if(fb.current_no >= fb.quantity){
        return next(new TypeError('people.user.max_support_fb'));
    }

    if(!body.access_token){
        return next(new TypeError('fb.access_token.not_found'));
    }
    
     UserFbPage.findOne({page_id: body.page_id}, (err, fbPage) => {
        if(err){
            return next( err);
        }

        if(fbPage){
            return next(new TypeError('fb.add.fb_existed'));
        }

        fb_res.getExchangeToken(body.access_token, function(err, fb_info){
            if (err) {
                return next(err);
            }

            fb_res.pageSubscribedApp(fb_info.access_token, body.page_id, function(err, result){
                if (err) {
                    return next(err);
                }
                
                if(result && result.success === true){
                    
                    var fb_page = new UserFbPage({
                        ed_user_id: idOwner,
                        page_id: body.page_id,
                        name: body.name,
                        type: body.type,
                        page_settings: body.page_settings,
                        access_token: fb_info.access_token,
                        is_active: true
                    });
                    var current_no = (req.user.settings.features || {channels:{facebooks: {current_no: 0, quantity: 0}}}).channels.facebooks.current_no;
                    emitter.emit('evt.user.setting.update.max_support_fb', {
                        idOwner: idOwner,
                        current_max_support_fb: current_no + 1,
                        callback: function(err, result){
                            if(err){
                                console.error(err,'user.current_max_support_fb.update_fail');
                                return;
                            }
                            var update = {channels:{facebooks:{current_no: current_no +1}}};
                            req.user.settings.features = req.user.settings.features || {};
                            req.user.settings.features = _.assign(req.user.settings.features, update);
                        }
                    });

                    cache.saveAndUpdateCache(`fb_pages`, fb_page.page_id, fb_page, (errsave) => {
                        if(errsave){
                            return next(errsave);
                        }
                        res.json({
                            _id: fb_page._id,
                            page_id: body.page_id,
                            name: body.name,
                            is_active: true
                        });
                    });
                    
                }else{
                    console.error(res.error, 'Failed to pageSubscribedApp');
                    return next(new TypeError('fb.add.fail_subscribed'));
                }
            });
        });
     });
};


/**
 * show all fb page of owner id
 * @author: khanhpq
 */
exports.list = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user),
        params = {
            query: {
                ed_user_id: idOwner,
                is_active: req.query.is_active == '1' ? true: (req.query.is_active == undefined ? true : false)
            },
            select: "-access_token",
            skip: req.query.skip,
            sort_order: req.query.sort_order,
            limit: req.query.limit
        };

    if(req.query.name){
        if (mongoose.Types.ObjectId.isValid(req.query.name)) {
            params.query._id = req.query.name;
        }else{
            params.query['$or']= [
                {
                    name: new RegExp(decodeURI(req.query.name), "i")
                },{
                    page_id: new RegExp(decodeURI(req.query.name), "i")
                }
            ]
        }
    }
    utils.findByQuery(UserFbPage, params).exec((err, fbPages) =>{
        if(err){
            return next(err);
        }
        res.json(fbPages);
    });
};

/**
 * show all fb page of owner id
 * @author: khanhpq
 */
exports.count = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);

    new Promise(function(resolve, reject) {
        UserFbPage.count({
            ed_user_id: idOwner,
            is_active: true
        }, function (err, count) {
            if (err) {
                return reject(errsave);
            }
            resolve(count);
        });
    }).then(function(count_active) {

        return new Promise(function(resolve, reject) {
            UserFbPage.count({
                ed_user_id: idOwner,
                is_active: false
            }, function (err, count) {
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
 * deactive or active fb page
 * @author: khanhpq
 */
exports.toggle = (req, res, next) => {
    var fb_page = req.fb_page,
        idOwner = utils.getParentUserId(req.user),
        is_active = null;
    
    if(req.query && req.query.is_active != undefined){
        is_active = req.query.is_active;
    }
    
    // double click -> return error
    if(is_active != fb_page.is_active){
        return next(new TypeError('fb.toggle.invalid'));
    }
    
    fb_page.is_active = !fb_page.is_active;
    var fb = (req.user.settings.features || {channels:{facebooks: {current_no: 0, quantity: 0}}}).channels.facebooks;
    if(fb_page.is_active && fb.current_no >= fb.quantity){
        return next(new TypeError('people.user.max_support_fb'));
    }
    
    cache.saveAndUpdateCache(`fb_pages`, fb_page.page_id, fb_page, (errsave) => {
        if(errsave){
            return next(errsave);
        }
        var is_removePage = false;
        
        if(fb_page.is_active === false){
            fb_res.removePage(fb_page.access_token, fb_page.page_id, function(err, result){
                if (err) {
                    if(err.code == 190){
                        is_removePage = true;
                    }else{
                        return next(err);
                    }
                }

//                if(!result){
//                    return next(new TypeError('fb.page.remove.failed'));
//                }
            
                cache.removeCache(`fb_pages`, fb_page.page_id, (errsave) => {
                    if (errsave) {
                        return next(errsave);
                    }

                    fb_page.access_token = undefined;
                    var current_no = (req.user.settings.features || {channels:{facebooks: {current_no: 0, quantity: 0}}}).channels.facebooks.current_no;
                    emitter.emit('evt.user.setting.update.max_support_fb', {
                        idOwner: idOwner,
                        current_max_support_fb: current_no == 0? 0:current_no - 1,
                        callback: function(err, result){
                            if(err){
                                console.error(err,'user.current_max_support_fb.update_fail');
                                return;
                            }
                            var update = {channels:{facebooks:{current_no: current_no == 0? 0:current_no - 1}}};
                            req.user.settings.features = req.user.settings.features || {};
                            req.user.settings.features = _.assign(req.user.settings.features, update);
                        }
                    });
                    
                    if(is_removePage){
                        cache.removeDataAndCache(`fb_pages`, fb_page.page_id, fb_page, null, function(err, result){
                            if (err) {
                                return next(err);
                            }

                            res.json({is_success: false});
                        });                         
                    }else{
                        res.json(fb_page);
                    }
                });
            });
        }else{
            fb_res.pageSubscribedApp(fb_page.access_token, fb_page.page_id, function(err, result){
                if (err) {
                    if(err.code == 190){
                        is_removePage = true;
                    }else{
                        return next(err);
                    }
                }
                
                fb_page.access_token = undefined;
                
                var current_no = (req.user.settings.features || {channels:{facebooks: {current_no: 0, quantity: 0}}}).channels.facebooks.current_no;
                emitter.emit('evt.user.setting.update.max_support_fb', {
                    idOwner: idOwner,
                    current_max_support_fb: current_no + 1,
                    callback: function(err, result){
                        if(err){
                            console.error(err,'user.current_max_support_fb.update_fail');
                            return;
                        }
                        var update = {channels:{facebooks:{current_no: current_no == 0? 0:current_no + 1}}};
                        req.user.settings.features = req.user.settings.features || {};
                        req.user.settings.features = _.assign(req.user.settings.features, update);
                    }
                });
                
                if(is_removePage){
                    cache.removeDataAndCache(`fb_pages`, fb_page.page_id, fb_page, null, function(err, result){
                        if (err) {
                            return next(err);
                        }

                        res.json({is_success: false});
                    });                         
                }else{
                    res.json(fb_page);
                }
            })
        }
    });
};

/**
 * get fb page
 * @author: dientn
 */
exports.getPage = (req, res, next) => {
    var fb_page = req.fb_page;
    res.json(fb_page);
};

/**
 * edit fb page setting
 * @author: dientn
 */
exports.editPageSetting =[
    (req, res, next)=>{
        validator.settings(req.body, next);
    },
    (req, res, next) => {
        var fb_page = req.fb_page,
            idOwner = utils.getParentUserId(req.user);
        fb_page.page_settings = _.assign(fb_page.page_settings, req.body);
        cache.saveAndUpdateCache(`fb_pages`, fb_page.page_id, fb_page, (errsave) =>{
            if(errsave){
                return next(errsave);
            }
            fb_page.access_token = undefined;
            res.json(fb_page);
        });
//        fb_page.save((err)=>{
//            if(err) return next(err);
//            res.json(fb_page);
//        });
        
    }
];

/**
 * unlink fb page
 * @author: khanhpq
 */
exports.remove = (req, res, next) => {
    var fb_page = req.fb_page,
        idOwner = utils.getParentUserId(req.user);

    cache.removeDataAndCache(`fb_pages`, fb_page.page_id, fb_page, null, function(err, result){
        if (err) {
            return next(err);
        }
        
        res.json({is_succes: true});
    }); 
};

/**
 * get access token facebook page
 * @author: vupl
 */
exports.getAccessToken = (data, next) =>{
    var query = {
        is_active: data.is_active,
        page_id: data.page_id
    };
    if(!utils.isEmpty(data.ed_user_id)){
        query['ed_user_id'] = data.ed_user_id;
    }
    cache.findOneWithCache(`fb_pages`, data.page_id, UserFbPage, query, (err, result) =>{
        if(err){
            console.error(err, "Failed to get access token facebook page");
            return next(err);
        }
        if(result && !_.isEqual(data.ed_user_id, result.ed_user_id)){
            return next(new TypeError('Access token is not yours'));
        }
        return next(null, result);
    });
};

/**
 *
 * author : khanhpq
 */
exports.fbPageByID = (req, res, next, id) => {

    var idOwner = utils.getParentUserId(req.user);
    
    // check the validity of fb_page id
    if (!mongoose.Types.ObjectId.isValid(id.toString())) {
        return next(new TypeError('user.fb.id.objectId'));
    }
    
    // find fb_page by its id
    UserFbPage.findById(id).exec((err, fbPage) => {
        if (err){
            return next(err);
        }

        //Check is owner
        if (!fbPage || !_.isEqual(fbPage.ed_user_id, idOwner)) {
            return next(new TypeError('user.fb.id.notFound'));
        }
        req.fb_page = fbPage;
        next();
    });
};
