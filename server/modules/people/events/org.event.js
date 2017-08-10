'use strict';
//
//  org.event.js
//
//  Created by khanhpq on 2016-02-26.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    utils = require('../../core/resources/utils'),
    UserBranding = mongoose.model('UserBranding'),
    User = mongoose.model('User'),
    Org = mongoose.model('Organization');

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

module.exports = (emitter) => {
    emitter.on('evt.people.org.add_org_requester', (options, callback) => {
        UserBranding.findOne({
            ed_user_id: options.idOwner
        }).exec((err, branding) =>{
            if(err){
                console.error(err, "find user branding fail");
                return callback(err, null);
            }

            if(!branding || !branding.is_auto_org){
                return callback(null, null);
            }
            
            Org.findOne({
                ed_user_id: options.idOwner,
                domains: options.domain
            }).exec((err, org) =>{
                if(err){
                    console.error(err, "find org by domain fail");
                }

                if(org){
                    User.findOne({
                        _id: options.requester._id
                    }).exec((err, user) =>{
                        user.org_id = org._id
                        user.save((err) => {
                            if (err) {
                                console.error(err, "save org to requester fail");
                                return callback(err, null);
                            }
                            return callback(null, org);
                        });
                    });
                }else{
                    
                    return callback(null, null);
                }

            });
        });
    });
};
