'use strict';
//
//  user.setting.controller.js
//  handle core system routes
//
//  Created by dientn on 2015-12-23.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    utils = require('../../core/resources/utils'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    UserSetting = mongoose.model('UserSetting'),
    path = require('path'),
    cache = require(path.resolve('./config/lib/redis.cache'));

/**
 * read user setting
 * author : dientn
 */
exports.read = (req, res, next) =>{
    var userSetting = req.user.settings|| {};
    res.json(userSetting);
};


/**
 * add a new user setting
 * author : dientn
 */
exports.add = (idOwner, data, next) =>{
    var userSetting = new UserSetting(data);
    userSetting.ed_user_id = idOwner;
    tmp_data.save('setting_add_setting', idOwner, userSetting, userSetting, (err, result) =>{
        if(err){
            return next(err);
        }
        next(null, userSetting);
    });
};

/**
 * update the current user setting
 * author : dientn
 */
exports.update = (idOwner, data, next) => {
    // find by id owner
    UserSetting.findOne({ed_user_id: idOwner}, (err, userSetting) => {
        if (err) {
            return next(err);
        }
        // Merge existing user setting
        userSetting = _.assign(userSetting, data);

        cache.saveAndUpdateCache(idOwner, 'user.setting.setting', userSetting, (errSave) => {
            if(errSave){
                return next(errSave);
            }
            return next(null, userSetting);
        });
    });
};

/**
 * get the current user setting
 * author : dientn
 */
exports.userSettingByOwnerId = (idOwner, next) => {
    var query = {
        ed_user_id : idOwner
    };
    // find user setting by its owner id
    cache.findOneWithCache(idOwner, 'user.setting.setting', UserSetting, query, (err, userSetting) => {
        if (err){
            return next(err);
        }
        return next(null, userSetting);
    });
};
