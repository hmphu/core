'use strict';
//
//  user.mail.controller.js
//  handle user mail setting routes
//
//  Created by dientn on 2015-12-25.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    UserMail = mongoose.model('UserMail'),
    path = require('path'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    utils = require('../../core/resources/utils'),
    validator = require('../validator/user.mail.validator'),
    cache = require(path.resolve('./config/lib/redis.cache'));

/**
 * add a new mail setting
 * author : dientn
 */
exports.add = (idOwner, data, next) => {
    var mailSetting  = new UserMail(data);
    mailSetting.ed_user_id = idOwner;

    tmp_data.save('setting_add_mail', idOwner, mailSetting, mailSetting, (err, result) =>{
        if(err){
            return next(err);
        }
        next(null, mailSetting);
    });
};

/**
 * show current mail setting
 * author : dientn
 */
exports.read = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: idOwner
    };
    cache.findOneWithCache(idOwner, 'user.setting.mail', UserMail, query, (err, mailSetting) =>{
        if(err){
            return next(err);
        }
        res.json(mailSetting);
    })
};

/**
 * update the current branding settting by id owner
 * author : dientn
 */

exports.update = [
    (req, res, next)=>{
        if(req.body.mail && _.isString(req.body.mail.is_using_html) && _.isEmpty(req.body.mail.is_using_html)){
            delete req.body.mail.is_using_html;
        }
        validator(req.body, next);
    },
    (req, res, next) => {
        var idOwner = utils.getParentUserId(req.user);
        delete req.body.__v;
        delete req.body.upd_time;
        UserMail.findOne({ed_user_id : idOwner}, (err, mailSetting) => {
            if(err){
                return next(err);
            }
            
            if(req.body.mail){
                req.body.mail = _.assign(mailSetting.mail, req.body.mail);
            }
            
            mailSetting = _.assign(mailSetting, req.body);
            cache.saveAndUpdateCache(idOwner, 'user.setting.mail', mailSetting, (err) =>{
                if(err){
                    return next(err);
                }
                res.json(mailSetting);
            })
        });
    }
];

/**
 * get the current user setting mail
 * author : vupl
 */
exports.userMailByOwnerId = (idOwner, next) =>{
    var query = {
        ed_user_id: idOwner
    }

    cache.findOneWithCache(idOwner, 'user.setting.mail', UserMail, query, (err, result) =>{
        if(err){
            console.error(err);
            return next(err);
        }
        return next(null, result);
    });
}
