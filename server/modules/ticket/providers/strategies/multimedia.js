'use strict';
//
//  multimedia.js
//  feed multimedia data for ticket schema
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//
var _ = require('lodash'),
    path = require('path'),
    mongoose = require('mongoose'),
    Sms = mongoose.model('Sms'),
    enumsContactType = require('../../../people/resources/enums.res'),
    requesterContact = require(path.resolve('./modules/people/controllers/people.user.contact.controller'));


/**
 * set voip channel to provider
 * author : thanhdhgu
 */
exports.voip = (data) => {
    return {
        from : data.from,
        to: data.to,
        record_file: data.record_file,
        call_id: data.call_id,
        call_type: data.call_type
    };
};

/**
 * set voip channel to provider
 * author : thanhdh
 */
exports.sms = (data) => {
    return {
        phone_no : data.phone_no,
        uid: data.uid
    };
};

/**
 * validate provider data sms
 * author : vupl
 */
exports.validateDataSms = (data, global, next) =>{
    Sms.findOne({ed_user_id: global.data.ed_user_id}, (err, result) =>{
        if(err){
            console.error(err);
            return next(err);
        }
        if(!result || !result.is_active){
            return next(new TypeError('ticket_comment.provider_data.notFound'));
        }
        let data_requester = {
            ed_user_id: global.data.ed_user_id,
            type: enumsContactType.UserContactType.phone,
            user_id: global.data.requester_id,
            value: data.phone_no
        }
        requesterContact.findContact(data_requester, (err_find, result_find) =>{
            if(err_find){
                console.error(err_find);
                return next(err_find);
            }
            if(!result_find){
                return next(new TypeError('ticket_comment.provider_data.notFound'));
            }
            return next(null, result_find);
        });
    });
}
