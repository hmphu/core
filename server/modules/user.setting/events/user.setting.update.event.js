'use strict';
//
//  user.setting.event.js
//  handle user.setting events
//
//  Created by khanhpq on 2015-01-04.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    path = require('path'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    userSetting  = require('../controllers/user.setting.controller'),
    UserSetting = mongoose.model('UserSetting'),
    cache = require(path.resolve('./config/lib/redis.cache'));

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

module.exports = (emitter) => {
    emitter.on('evt.user.setting.update.max_agent', (options) => {
        cache.findOneWithCache(options.idOwner, 'user.setting.setting', UserSetting, { ed_user_id: options.idOwner }, (err, resultSetting) =>{
            
             /*UserSetting.update({_id: options.idOwner}, {current_agent_no: agent_no}, (err, resutt)=>{
                if(err){
                    console.error(err,'user.current_agent_no.update_fail');
                    return;
                }*/
            
            
            var agent_no = resultSetting.current_agent_no += options.agent_no;
            userSetting.update(options.idOwner, {current_agent_no: agent_no}, function(err, result){
                if(err){
                    console.error(err,'user.current_agent_no.update_fail');
                    return;
                }
                options.callback(null, true);
            });
        });
    });

    emitter.on('evt.user.setting.update.max_support', (options) => {
        var userSetting = require('../../user.setting/controllers/user.setting.controller');
        userSetting.userSettingByOwnerId(options.idOwner, (err, setting)=>{
            var update = setting._doc;
            delete update.__v;
            if(update.features && update.features.channels && update.features.channels.emails){
                update.features.channels.emails.current_no = options.current_max_support;
            }
            userSetting.update( options.idOwner, update, ( err, setting )=>{
                if(err){
                console.error(err,'user.current_max_support.update_fail');
                return;
            }
            options.callback(null, true);
            } );
        });
    });
    
    emitter.on('evt.user.setting.update.max_support_fb', (options) => {
        var userSetting = require('../../user.setting/controllers/user.setting.controller');
        userSetting.userSettingByOwnerId(options.idOwner, (err, setting)=>{
            var update = setting._doc;
            delete update.__v;
            if(update.features && update.features.channels && update.features.channels.facebooks){
                update.features.channels.facebooks.current_no = options.current_max_support_fb;
            }
            userSetting.update( options.idOwner, update, ( err, setting )=>{
                if(err){
                console.error(err,'user.current_max_support_fb.update_fail');
                return;
            }
            options.callback(null, true);
            } );
        });
    });
    
    emitter.on('evt.user.setting.update.max_automation', (options) => {
        var userSetting = require('../../user.setting/controllers/user.setting.controller');
        userSetting.userSettingByOwnerId(options.idOwner, (err, setting)=>{
            var update = setting._doc;
            delete update.__v;
            if(update.features && update.features.productivity && update.features.productivity.automations){
                update.features.productivity.automations.current_no = options.current_auto_no;
            }
            userSetting.update( options.idOwner, update, ( err, setting )=>{
                if(err){
                console.error(err,'user.current_automation_no.update_fail');
                return;
            }
            options.callback(null, true);
            } );
        });
    });
    
    emitter.on('evt.user.setting.update.max_trigger', (options) => {
        var userSetting = require('../../user.setting/controllers/user.setting.controller');
        userSetting.userSettingByOwnerId(options.idOwner, (err, setting)=>{
            var update = setting._doc;
            delete update.__v;
            if(update.features && update.features.productivity && update.features.productivity.triggers){
                update.features.productivity.triggers.current_no = options.current_trigger_no;
            }
            userSetting.update( options.idOwner, update, ( err, setting )=>{
                if(err){
                console.error(err,'user.current_trigger_no.update_fail');
                return;
            }
            options.callback(null, true);
            } );
        });
    });

    emitter.on('evt.user.setting.update.max_sla', (options) => {
        var userSetting = require('../../user.setting/controllers/user.setting.controller');
        userSetting.userSettingByOwnerId(options.idOwner, (err, setting)=>{
            var update = setting._doc;
            delete update.__v;
            if(update.features && update.features.productivity && update.features.productivity.slas){
                update.features.productivity.slas.current_no = options.current_sla_no;
            }
            userSetting.update( options.idOwner, update, ( err, setting )=>{
                if(err){
                console.error(err,'user.current_sla_no.update_fail');
                return;
            }
            options.callback(null, true);
            } );
        });
    });
};
