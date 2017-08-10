'use strict';
//
// app.quick.sms.controller.js
// handle app send sms mutiple
//
// Created by dientn on 2017-02-18.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash');
var fs = require('fs');
var fs_extra = require('fs-extra');
var path = require("path");
var moment = require('moment');
var utils = require('../../core/resources/utils');
var config = require(path.resolve('./config/config'));
var rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq'));
var mongoose = require('mongoose');
var UserContact  = mongoose.model('UserContact');



// export ticket to pdf form file
exports.sendSms = [
    (req, res, next)=> {
        var idOwner = utils.getParentUserId(req.user);
        var content = req.body.content;
        
        if(!content){
            return next(new TypeError("content_invalid"));
        }
        return next();
    },
    (req, res, next)=>{
        var idOwner = utils.getParentUserId(req.user);
        var custom_settings = req.body.custom_fields || {};
        var data = Object.assign(req.body, {ed_user_id: idOwner, type: 'sms'});
        rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-core-sms-contact', payload: { filter: data } });
        return res.json({success: true});
    }
];


exports.importFile = [
    (req, res, next)=>{
        if (!req.file) {
            return next(new TypeError('common.upload_file.no_file'));
        }
        // wrong format
        var extension = req.file.extension;
        var idOwner = utils.getParentUserId(req.user);
        var data = Object.assign(req.body, {ed_user_id: idOwner, file: req.file});
        rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-core-sms-contact', payload: data });
        return res.json({success: true});
    }
];