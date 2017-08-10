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
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    translation = require('../resources/translate.res'),
    Group = mongoose.model('Group'),
    utils = require('../../core/resources/utils'),
    GroupUser = mongoose.model('GroupUser');

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========
module.exports = (emitter) => {
    emitter.on('evt.group.add_group', (user) => {
        var idOwner = utils.getParentUserId(user);
        var t = user.language || "en";
        var group = new Group();
        group.ed_user_id = idOwner;
        group.name = translation[t].support;
        tmp_data.save('group_add', idOwner, group, group, (errGroup, resultGroup) =>{
            if(errGroup){
                console.error(errGroup, "save group");
            }
            var group_user = new GroupUser();
            group_user.ed_user_id = idOwner;
            group_user.user_id = user._id;
            group_user.group_id = resultGroup._id;
            group_user.is_default = true;
            tmp_data.save('group_user_add', idOwner, group_user, group_user, (errGroupUser, resultGroupUser) =>{
                if(errGroupUser){
                    console.error(errGroupUser, "save group user");
                }
                return;
            })
        });
    });
};
