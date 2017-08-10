'use strict';
//
// dashboard.controller.js
// handle dashboard data
//
// Created by dientn on 2016-02-02.
// Copyright 2016 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash');
var path = require("path");
var moment = require('moment');
var utils = require('../../../core/resources/utils');
var ticketEnums = require('../../../ticket/resources/enums');
var mongoose = require('mongoose');
var PaymentHist = mongoose.model('PaymentHist');
var Plan = mongoose.model('UserSetting');
var enums = require('../../resources/enums.res');


// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========


// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * @author: dientn get invvoice
 */
exports.getInvoices = [
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        var query = { 
            ed_user_id: idOwner
        };
        var fields = {
            "upd_time": 1,
            "add_time": 1,
            "payment_status": 1,
            "payment_method": 1,
            "price": 1,
            "plan": 1
        };
        PaymentHist.find(query, fields, (err, results)=>{
            if(err){
                return next(err);
            }
            
            res.json( results );
        });
    }
];

/*
 * @author: dientn get plan info
 */
exports.getPlanInfo = (req, res, next) =>{
    Plan.populate(req.user.settings, "plan_id", (err, settings)=>{
        if(err || !settings){
            return next(err || new TypeError("dashboard.plan_notfound"));
        }
        
        var emails = (settings.features || {channels:{emails: {current_no: 0, quantity: 0}}}).channels.emails;
        var result = {
            plan_name:  settings.plan_id.name,
            is_trial: settings.is_trial,
            is_sms_active: settings.is_sms_active,
            plan_expiration: settings.plan_expiration,
            current_agent: settings.current_agent_no,
            current_max_support: emails.current_no,
            max_agent: settings.max_agent_no,
            max_support: emails.quantity,
        };
        
        res.json(result);
    });

};