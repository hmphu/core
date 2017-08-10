'use strict';
//
//  notify.controller.js
//  handle dashboard notification 
//
//  Created by dientn on 2016-02-24.
//  Copyright 2016 Fireflyinnov. All rights reserved.
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
var SysNotify = mongoose.model('SystemNotify');
var common = require('../common.controller');
var enums = require('../../resources/enums.res');
var config = require(path.resolve('./config/config'));


/*
    @author: dientn
    get ticket 
*/
exports.getSysNotifies = [
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        utils.findByQuery(SysNotify, {ed_user_id: idOwner}).exec(( err, notifies )=>{
            if(err){
                return next(err);
            }
            res.json({notifies: notifies});
        });
    }
];