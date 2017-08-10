'use strict';
//
//  group.user.event.js
//
//  Created by khanhpq on 2016-02-26.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    mongoose = require('mongoose'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    utils = require('../../core/resources/utils'),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq')),
    Group = mongoose.model('Group'),
    GroupUser = mongoose.model('GroupUser');

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========
module.exports = (emitter) => {
    emitter.on('evt.group.add_group_user', (options) => {
        var group_user = new GroupUser();
        group_user.ed_user_id = options.ed_user_id;
        group_user.user_id = options.user_id;
        group_user.group_id = options.group_id;
        group_user.is_default = options.is_default || false;
        
        tmp_data.save('group_user_add', options.ed_user_id, group_user, group_user, (err, result) =>{
            if(err){
                console.error(err, "save group user");
            }
            return;
        });
    });
    
    emitter.on('evt.user.group_user_toggle_suspended', (options) => {
        
        GroupUser.find({
            ed_user_id: options.idOwner,
            user_id: options.user._id
        }).exec((err, result) =>{
            if(err){
                console.error(err, "find group user error");
            }
            var tasks = [];
            result.forEach((group_user) => {
                var promise = new Promise((resolve, reject) => {

                    group_user.is_suspended = options.user.is_suspended;
                    group_user.save((err) => {
                        if (err) {
                            return reject(err);
                        }
                        
                        emitter.emit('evt.group_user.mongo-people-online', {
                            ed_user_id: group_user.ed_user_id,
                            group_id: group_user.groupId,
                            user_id: group_user.userId,
                            type: group_user.is_suspended ? "unsuspended_agent" : "suspended_agent"
                        });

                        resolve();
                    });
                });
                tasks.push(promise);
            });
            
            Promise.all(tasks).then(function(result) {
            }, function(reason) {
                console.error(reason, "update suspended group user error");
            });

        });
    });

    emitter.on('evt.group.add_group_user_default', (options) => {

        GroupUser.findOne({ed_user_id: options.idOwner, user_id: options.idOwner, is_default: true}, (err, group) => {
            if (err) {
                console.error(err, "save group user");
                return;
            }

            if (!group) {
                console.error("user.group.not_found_evt");
                return;
            }

            var group_user = new GroupUser({
                ed_user_id: options.idOwner,
                user_id: options.user_id,
                is_default: true,
                group_id: group.group_id
            });

            tmp_data.save('add_group_user_default', options.ed_user_id, group_user, group_user, (err, result) =>{
                if(err){
                    console.error(err, "save group user");
                }
                return;
            });
        });
    });
    
    emitter.on('evt.group.update_group_user_default', (options) => {

        GroupUser.findOne({ed_user_id: options.idOwner,
                           group_id: options.group_id,
                           user_id: options.user_id}, (err, group) => {
            if (err) {
                console.error(err, "update group user");
                return;
            }

            if (!group) {
                console.error("user.group.not_found_evt");
                return;
            }

            var group_user = new GroupUser({
                ed_user_id: options.idOwner,
                user_id: options.user_id,
                is_default: true,
                group_id: group.group_id
            });

            tmp_data.save('update_group_user_default', options.ed_user_id, group_user, group_user, (err, result) =>{
                if(err){
                    console.error(err, "update group user");
                }
                return;
            });
        });
    });
    
    emitter.on('evt.group_user.mongo-people-online', (options) => {
        rbSender(config.rabbit.sender.exchange.batch, { 
            topic : 'izi-mongo-people-online', 
            doc : {
                op: 'd',
                o: {
                    ed_user_id: options.idOwner,
                    group_id: options.group_id,
                    user_id: options.user_id
                }
            }
        });
    });
};
