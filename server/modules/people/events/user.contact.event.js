'use strict';
//
//  contact.user.event.js
//
//  Created by khanhpq on 2016-02-26.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    moment = require('moment'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    peolpe_enums = require('../resources/enums.res'),
    utils = require('../../core/resources/utils'),
    utils_contact = require('../resources/utils'),
    validator = require('../validator/user.contact.validator'),
    UserContact = mongoose.model('UserContact');


var getTypeContact = function(options, rc){
    var rc = rc;
     if(options.phone){
        rc.type = peolpe_enums.UserContactType.phone;
        rc.value = options.phone;

        if(rc.value && options.code == 84){
            rc.value = '(+84)' + rc.value.replace(/^0/g, '');
        }else{
            if(options.code != '' && options.code != null && options.code != undefined){
                rc.value = '(+' + options.code + ')' + rc.value;
            }else{
                rc.value = utils_contact.convertPhoneValue(rc.value);
            }
        }
    }else if(options.facebook){
        rc.type = peolpe_enums.UserContactType.facebook;
        rc.value = options.facebook;
    }else if(options.email){
        rc.type = peolpe_enums.UserContactType.email;
        rc.value = options.email;
    }
    return rc;
}

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========
module.exports = (emitter) => {
    emitter.on('evt.user.contact.add_contact_user', (options, callback) => {
        var rc = {
            ed_user_id: options.idOwner,
            user_id: options.user_id,
            is_requester: options.is_requester || false,
            is_primary: options.is_primary
        };

        rc = getTypeContact(options, rc);
        
        var userContact = new UserContact(rc);
        validator.validate_add(userContact, function(err, result){
            if (err) {
                return callback(err);
            }

//            tmp_data.save('add_contact_user', options.idOwner, userContact, userContact, (err, result) =>{
//                if(err){
//                    console.error(err, "save contact user fail");
//                }
//                return;
//            });
            userContact._id = undefined;
            userContact.upd_time = +moment.utc();
            userContact.add_time = +moment.utc();
            UserContact.findOneAndUpdate(
                {
                    ed_user_id: userContact.ed_user_id, 
                    type: userContact.type,
                    value: userContact.value
                },
                userContact, 
                {
                    upsert: true,
                    new: true
            }, (err, result)=>{
                if(err){
                    console.error(err, "save contact user fail");
                }
                return;
            });
        });
    });
    
    emitter.on('evt.user.contact.find_or_add_contact_user', (options) => {
        var rc = {
            ed_user_id: options.idOwner,
            user_id: options.user_id,
            is_requester: options.is_requester || false,
            is_primary: options.is_primary
        };

        rc = getTypeContact(options, rc);
        
        UserContact.update({
            //user_id: rc.user_id,
            ed_user_id: rc.ed_user_id,
            value: rc.value,
            //type: rc.type
        }, {
            $setOnInsert: rc,
            $set: {
                upd_time: +moment.utc()
            }
        }, {
            upsert: true
        }, (err, rresult) => {
            if (err) {
                console.error(err, "save contact fail: " + JSON.stringify(rc));
                return;
            }
        });

        /*UserContact.findOne({
            //user_id: rc.user_id,
            ed_user_id: rc.ed_user_id,
            value: rc.value,
            //type: rc.type
        }).exec((err, result) => {
            if (err) {
                console.error(err, "find or save contact user fail");
                return;
            }
            
            if(result){
               return; 
            }
            
            var userContact = new UserContact(rc);
            userContact.save((err) => {
                if (err) {
                    console.error(err, "save contact fail: " + JSON.stringify(rc));
                    return;
                }
            });
        });*/
    });
};
