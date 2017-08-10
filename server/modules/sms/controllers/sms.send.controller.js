'use strict';
//
//  sms.controller.js
//  handle core system routes
//
//  Created by vupl on 2016-02-29.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    Sms = mongoose.model('Sms'),
    SmsCarrier = mongoose.model('SmsCarrier'),
    sanitizeHtml = require('sanitize-html'),
    path = require('path'),
    moment = require('moment'),
    config = require(path.resolve('./config/config')),
    enums = require('../resources/enums.sms'),
    enumsTicket = require('../../ticket/resources/enums'),
    utilsSms = require('../resources/utils.sms'),
    http = require('../../core/resources/http'),
    utils = require('../../core/resources/utils'),
    cache = require(path.resolve('./config/lib/redis.cache')),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    smsProvider = require('../provider/index.provider');

/**
 * process sms sending
 * author : vupl
 */
var processSendSms = (params, next) =>{
    var sms_info = params.sms_info;
    var hists = params.hists;
    var data = params.data;

    var brandName = (sms_info.brand && sms_info.brand.name && sms_info.brand.is_active) ? sms_info.brand.name : config.sms.SMS_BRAND;
    var data_send = smsProvider.settingSend(sms_info.provider);

    if (data.content.length > config.sms.SMS_MAX_LENGTH){
        data.content = data.content.substring(0, config.sms.SMS_MAX_LENGTH);
    }

    data_send.data.submission.sms.push({
        id: utils.generateUUID(),
        brandname: brandName,
        text: sanitizeHtml(utilsSms.RemoveAccentsDiacritics(data.content.replace(/&#39;/g, "'")), {
                    allowedTags: [],
                    allowedAttributes: []
                }),
        to: data.phone_no.replace(/\(\+84\)/, "0")
    });

    http(data_send, (err, smsResponse) =>{
        if (err) {
            console.log("err", err);
            return next(err, null);
        }
        console.log(JSON.stringify(smsResponse));
        if (smsResponse.status_code != 200) {
            return next(smsResponse.status_code, null);
        }
        for (var i = 0; i < smsResponse.submission.sms.length; i++) {
            if (smsResponse.submission.sms[i].error_message && smsResponse.submission.sms[i].error_message != "") {
                return next(new TypeError(smsResponse.submission.sms[i].error_message), null);
            }
        }
        var hist_ = {
            ed_user_id: data.ed_user_id,
            phone_number: data.phone_no,
            content: data_send.data.submission.sms[0].text,
            is_io: enums.SMS_Type.Send,
            brand_name: brandName,
            customer_type: sms_info.customer_type,
            sms_carrier: hists.sms_carrier,
            country_code: hists.country_code || "",
            uid: data_send.data.submission.sms[0].id,
            status_delivered: enums.SMS_Status_Response.WAITTING,
            status_sended: enums.SMS_Status_Response_Callback.Success,
            ticket_id: data._id,
            comment_id: data.comment ? data.comment._id : undefined,
            provider: sms_info.provider
         };
        if (1 <= data_send.data.submission.sms[0].text.length && data_send.data.submission.sms[0].text.length <= 160) {
            hist_.sms_count = 1;
        } else if (160 < data_send.data.submission.sms[0].text.length && data_send.data.submission.sms[0].text.length <= 306) {
            hist_.sms_count = 2;
        } else {
            hist_.sms_count = 3;
        }
        if(hist_.brand_name = config.sms.SMS_BRAND){
            hist_.cost = config.sms.SMS_BRAND_DEFAULT_COST;
        } else {
            for (var i = 0; i < hists.customer_types.length; i++) {
                if (hists.customer_types[i].customer_type == hist_.customer_type) {
                    hist_.cost = hists.customer_types[i].cost_send;
                }
            }
        }
        emitter.emit('evt.sms.saveHist', hist_);
        emitter.emit('evt.ticket.comment.update', hist_, enumsTicket.Provider.sms);

        return next(null, hist_);
    });
};

/**
 * send sms
 * author : vupl
 */
exports.send = (data) =>{
    var query = {
        ed_user_id: data.ed_user_id
    }
    cache.findOneWithCache(data.ed_user_id, 'user.setting.sms', Sms, query, (err, sms_info) =>{
        if(err){
            console.error(err, "sms.findOne.error");
            return;
        }
        if(!sms_info){
            return;
        }
        var head_phone = data.phone_no.replace(/\(\+84\)/, "0");
        if (head_phone.length == 11) {
            head_phone = head_phone.substring(0, 4);
        }

        if (head_phone.length == 10) {
            head_phone = head_phone.substring(0, 3);
        }
        SmsCarrier.findOne({
            sms_number: config.sms.SMS_NUMBER,
            provider: sms_info.provider,
            sms_head_number: head_phone
        }, (err_smscarrier, smsCarrier) =>{
            if (err_smscarrier) {
                console.error(err_smscarrier, `SmsCarrier error: headphone is ${head_phone}`);
                return;
            }
            if (!smsCarrier) {
                console.error(`cannot find SmsCarrier with headphone ${head_phone}`);
                return;
            }
            var params = {
                sms_info: sms_info,
                hists: {
                    sms_carrier: smsCarrier._id,
                    country_code: 84,
                    customer_types: smsCarrier.customer_types
                },
                data: data
            };
            processSendSms(params, (err_process, result_process) =>{
                if(err_process){
                    console.error(err_process, "sms.send.err_process");
                    return;
                }
                return;
            });
        });
    });
}
