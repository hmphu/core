'use strict';
//
//  user.api.controller.js
//  handle user api setting routes
//
//  Created by dientn on 2015-12-25.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    UserApi = mongoose.model('UserApi'),
    path = require('path'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    utils = require('../../core/resources/utils'),
    cache = require(path.resolve('./config/lib/redis.cache'));

/**
 * add a new api setting
 * author : dientn
 */
exports.add = (idOwner, data, next) =>{
    var apiSetting = new UserApi(data);
    apiSetting.ed_user_id = idOwner;

    tmp_data.save('setting_add_api', idOwner, apiSetting, apiSetting, (err, result) =>{
        if(err){
            return next(err);
        }
        next(null, apiSetting);
    });
};

/**
 * show current api setting
 * author : dientn
 */
exports.read = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: idOwner
    };
    cache.findOneWithCache(idOwner, 'user.setting.api', UserApi, query, (err, apiSetting) =>{
        if(err){
            return next(err);
        }
        res.json(apiSetting);
    });
};

/**
 * toggle api setting by id owner
 * author : dientn
 */
exports.toggle = (req, res, next) => {
    if(!_.isBoolean(req.body.is_enable)){
        return next(new TypeError("user.api.is_enable.invalid"));
    }
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: idOwner
    };
    
    UserApi.findOne({ed_user_id: idOwner}, (err, apiSetting) =>{
        if(err){
            return next(err);
        }
        
        if(!apiSetting){
            return next(new TypeError('user.api.not_found'));
        }
        apiSetting.is_enable = req.body.is_enable;
        cache.saveAndUpdateCache(idOwner, 'user.setting.api', apiSetting, (errSave) =>{
            if(errSave){
                return next(errSave);
            }
            res.json(apiSetting);
        });
    });
};


/**
 * remove api setting by id owner
 * author : dientn
 */
exports.remove = (idOwner, next) => {

    UserApi.remove({ed_user_id : idOwner}, (err, raw) => {
        if(err){
            return next(err);
        }

        next(null, raw)
    });
};

/**
 * add api token
 * author : dientn
 */
exports.addToken = (req, res, next) => {
    // init variables
    var idOwner = utils.getParentUserId(req.user);
    var token = mongoose.Types.ObjectId();
    token = utils.hashString(token.toString(), "sha1");

    UserApi.findOne({ed_user_id : idOwner}, (err, apiSetting) => {
        if(err){
            return next(err);
        }
        apiSetting.is_enable = 1;
        apiSetting.access_token = apiSetting.access_token || [];
        apiSetting.access_token.push({
            value: token
        });
        cache.saveAndUpdateCache(idOwner, 'user.setting.api', apiSetting, (errSave) =>{
            if(errSave){
                return next(errSave);
            }
            res.json(_.find(apiSetting.access_token, (o)=>{
                    return  o.value == token;
            }));
        });
    });
};

/**
 * delete api token
 * author : dientn
 */
exports.removeToken = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var token = req.params.token;

    UserApi.findOne({ed_user_id: idOwner}, (err, apiSetting) =>{
        if(err){
            return next(err);
        }
        
        if(!apiSetting.is_enable){
            return next(new TypeError('user.api.is_disable'));
        }
        
        apiSetting.access_token = apiSetting.access_token.filter((apiToken)=> {
            return apiToken.value != token;
        });
        cache.saveAndUpdateCache(idOwner, 'user.setting.api', apiSetting, (errSave) =>{
            if(errSave){
                return next(errSave);
            }
            res.json("user.api.remove_success");
        });
    });
};
