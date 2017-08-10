'use strict';
//
//  user.status.controller.js
//  handle user status setting routes
//
//  Created by vupl on 2015-12-28.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    UserStatus = mongoose.model('UserStatus'),
    utils = require('../../core/resources/utils');

/**
 * add a new user status setting
 * author : vupl
 */
exports.change = (req, res, next) => {
    // remove sensitive data
    if(req.body){
        delete req.body.user_id;
    }
    // init variable
    var idOwner = utils.getParentUserId(req.user);
    var user_id = req.user._id;

    // check the existing of user status and save new status
    UserStatus.findOne({ed_user_id: idOwner, user_id: user_id}, (err, userStatus) =>{
        if(err){
            return next(err);
        }
        if(!userStatus){
            userStatus = new UserStatus();
            userStatus.ed_user_id = idOwner;
            userStatus.user_id = user_id;
        }
        if(req.body.status.voip){
            userStatus.status.voip = req.body.status.voip;
        }
        if(req.body.status.chat){
            userStatus.status.chat = req.body.status.chat;
        }
        if(req.body.status.account){
            userStatus.status.account = req.body.status.account;
        }
        userStatus.save((err) =>{
            if(err){
                return next(err);
            }
            res.json(userStatus);
        });
    });
};

/**
 * show user status current setting
 * author : vupl
 */
exports.read = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var user_id = req.user._id;
    UserStatus.findOne({ed_user_id : idOwner,user_id : user_id}, (err, userStatus) => {
        if(err){
            return next(err);
        }
        res.json(userStatus);
    });
};

/**
 * delete user status current
 * author : vupl
 */
exports.delete = (req, res, next) => {
    var idOwnew = utils.getParentUserId(req.user);
    var user_id = req.user._id;
    UserStatus.remove({ed_user_id : idOwnew, user_id: user_id}, (err, userStatus) =>{
        if(err){
            return next(err);
        }
        res.json(userStatus);
    })
}
