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
var mongoose = require('mongoose'),
    _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    utils = require('../../core/resources/utils'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    cache = require(path.resolve('./config/lib/redis.cache')),
    validate = require('../validator/voip.validator'),
    enums = require('../../voip/resources/enums'),
    VoipSetting = mongoose.model('VoipSetting'),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq'));

/**
 * list agent activity voip
 * author vupl
 */
exports.reportAgentActivity = [
    (req, res, next) => {
        var idOwner = utils.getParentUserId(req.user);
        
        var query = {
            ed_user_id : idOwner
        };
        
        cache.findOneWithCache(idOwner, 'user.setting.voip', VoipSetting, query, (err, result) => {
            if (err) {
                return next(err);
            }
            
            req.body.provider = result.provider;
            
            validate.validate_report_query_data(req.body, next);
        });
    },
    (req, res, next) => {
        var idOwner = utils.getParentUserId(req.user);
        var skip = req.query.skip || config.paging.skip;
        
        rbSender(config.rabbit.sender.exchange.report, {
            topic: 'izi-core-voip-report',
            payload: {
                report: enums.VoipReport.agent_activity,
                idOwner: idOwner,
                user_id: req.user._id,
                data: req.body,
                skip: skip
            }
        });
        
        res.json({is_success: true});
    }
];


/**
 * list queue activity voip
 * author vupl
 */
exports.reportQueueActivity = [
    (req, res, next) => {
        var idOwner = utils.getParentUserId(req.user);
        
        var query = {
            ed_user_id : idOwner
        };
        
        cache.findOneWithCache(idOwner, 'user.setting.voip', VoipSetting, query, (err, result) => {
            if (err) {
                return next(err);
            }
            
            req.body.provider = result.provider;
            
            validate.validate_report_query_data(req.body, next);
        });
    },
    (req, res, next) => {
        var idOwner = utils.getParentUserId(req.user);
        
        rbSender(config.rabbit.sender.exchange.report, {
            topic : 'izi-core-voip-report',
            payload : {
                report : enums.VoipReport.queue_activity,
                idOwner : idOwner,
                user_id : req.user._id,
                data : req.body
            }
        });
        
        res.json({ is_success : true });
    }
];
