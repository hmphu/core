'use strict';
//
//  mail.js
//  feed mail data for ticket schema
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//
var _ = require('lodash'),
    path = require('path'),
    enumsContactType = require('../../../people/resources/enums.res'),
    requesterContact = require(path.resolve('./modules/people/controllers/people.user.contact.controller'));
/**
 * set mail channel to provider
 * author : thanhdh
 */
exports.setReceiveMail = (data) => {
    return {
        receive_support_mail : data.support_mail,
        ccs : data.ccs || [],
        ex_ccs : data.ex_ccs || [],
        ex_to: (data.ex_to || []).concat(data.ex_watchers || []),
        from_email: data.from.address,
        email_uid: data.attributes.uid,
        ref_ticket : data.ref_ticket,
        message_id: data.messageId
    };
};

/**
 * set mail channel to provider
 * author : thanhdh
 */
exports.setSendMail = (data) => {
    return {
        ex_ccs : data.ex_ccs || [],
        ex_to: (data.ex_to || []).concat(data.ex_watchers || []),
        to_email: data.to_email,
        from_email: data.from_data,
        message_id: data.messageId
    };
};

/**
 * validate provider data sms
 * author : vupl
 */
exports.validateDataMail = (data, global, next) =>{
    let data_requester = {
        ed_user_id: global.data.ed_user_id,
        type: enumsContactType.UserContactType.email,
        user_id: global.data.requester_id,
        value: data.to_email
    };

    requesterContact.findContact(data_requester, (err_find, result_find) =>{
        if(err_find){
            console.error(err_find);
            return next(new TypeError('ticket_comment.provider_data.notFound'));
        }
        if(!result_find){
            return next(new TypeError('ticket_comment.provider_data.notFound'));
        }
        return next(null, result_find);
    })
}
