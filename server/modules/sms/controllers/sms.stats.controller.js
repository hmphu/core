'use strict';
//
//  user.setting.controller.js
//  handle core system routes
//
//  Created by dientn on 2015-12-23.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    utils = require('../../core/resources/utils'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    validate = require('../validator/sms.validator'),
    enums = require('../resources/enums.sms'),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq'));

exports.report_sms_stats = [
    (req, res, next) =>{
        validate.validate_sms_report_query_data(req.body, next);
    },
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        rbSender(config.rabbit.sender.exchange.report, {
            topic: 'izi-core-sms-report',
            payload: {
                report: enums.SMS_Report.sms_stats,
                idOwner: idOwner,
                user_id: req.user._id,
                data: req.body
            }
        });
        res.json({is_success: true});
    }
];

exports.report_sms_total_send_and_received = [
    (req, res, next) =>{
        validate.validate_sms_report_query_data(req.body, next);
    },
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        rbSender(config.rabbit.sender.exchange.report, {
            topic: 'izi-core-sms-report',
            payload: {
                report: enums.SMS_Report.total_sms_send_and_received,
                idOwner: idOwner,
                user_id: req.user._id,
                data: req.body
            }
        });
        res.json({is_success: true});
    }
];

exports.report_sms_by_carrier = [
    (req, res, next) =>{
        validate.validate_sms_report_query_data(req.body, next);
    },
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        rbSender(config.rabbit.sender.exchange.report, {
            topic: 'izi-core-sms-report',
            payload: {
                report: enums.SMS_Report.sms_carrier,
                idOwner: idOwner,
                user_id: req.user._id,
                data: req.body
            }
        });
        res.json({is_success: true});
    }
]
