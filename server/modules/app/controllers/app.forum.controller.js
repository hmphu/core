'use strict';
//
// app.controller.js
// handle apps data
//
// Created by dientn on 2016-02-02.
// Copyright 2016 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash');
var path = require('path');
var moment = require('moment');
var utils = require('../../core/resources/utils');
var config = require(path.resolve('./config/config'));
var mongoose = require('mongoose');
var CustomSetting = mongoose.model('CustomSetting');


// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========


// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

exports.listForum = (req, res, next)=>{
    return res.json([]);
};

/*
 * @author: dientn get all custom field is text or link
 */
exports.listCustomFields = (req, res, next)=>{
    var params = {
        query: {
            ed_user_id: utils.getParentUserId(req.user),
            provider: 'ticket',
            is_active: true,
            cs_type: 'text',
            $or: [
                {
                    'cs_type_data.is_link': true
                },
                {
                    'cs_type_data.is_edittable': true
                }
            ]
        },
        select: 'field_key name',
        skip: req.query.skip,
        sort_order: 1,
        sort: 'position',
        limit: req.query.limit || config.paging.limit
    };

    utils.findByQuery(CustomSetting, params).exec(function (err, custom_settings) {
        if (err) {
            return next(err);
        }
        res.json(custom_settings);
    });
};