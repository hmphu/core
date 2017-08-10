'use strict';
//
//  user event.js
//
//  Created by khanhpq on 2015-01-04.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    utils = require('../../core/resources/utils'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    enums = require('../../core/resources/enums.res'),
    biz_utils = require('../../biz.rule/resources/utils'),
    filterCond = require('../resources/filter.cond'),
    FilterUserView = mongoose.model('FilterUserView'),
    ViewUser = mongoose.model('ViewUser'),
    moment = require('moment');

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

exports.list = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: mongoose.Types.ObjectId(idOwner),
        view_id: req.view._id
    };

    var stage = [];
    var stage1 = {
        $match: query
    };
    var stage2 ={
        $sort: {
            [req.view.order_by]: req.view.order_ascending ? 1 : -1
        }
    };
    var stage3 = {
        $project: {
            "_id": "$_id",
            "view_id": "$view_id",
            "user_id": "$user_id",
            "org_id" : "$org_id",
            "group_id" : "$group_id",
            "add_time": "$add_time"
        }
    };
    var stage4 = {
        $lookup: {
            "from": config.dbTablePrefix.concat("user"),
            "localField": "user_id",
            "foreignField": "_id",
            "as": "user_info"
        }
    };
    var stage5 = {
        $lookup: {
            "from": config.dbTablePrefix.concat("organization"),
            "localField": "org_id",
            "foreignField": "_id",
            "as": "org_info"
        }
    };

    var stage6 = {
        $lookup: {
            "from": config.dbTablePrefix.concat("user_contact"),
            "localField": "user_id",
            "foreignField": "user_id",
            "as": "contact_info"
        }
    };

    
    var stage7 = {
        $unwind: {
            "path": "$user_info",
            "preserveNullAndEmptyArrays": true
        }
    };

    var stage8 = {
        $unwind: {
            "path": "$org_info",
            "preserveNullAndEmptyArrays": true
        }
    }

    var stage9 = {
        $project: {
            "_id": "$user_id",
            "name": "$user_info.name",
            "is_requester": "$user_info.is_requester",
            "is_suspended": "$user_info.is_suspended",
            "org": {
                "_id": "$org_info._id",
                "name": "$org_info.name"
            },
            "contacts": "$contact_info",
            "add_time": "$user_info.add_time"
            //"add_time": "$add_time"
        }
    };

    var stageLimit = {
        $limit: isNaN(req.query.limit) ? config.paging.limit: Number(req.query.limit)
    };
    var stageSkip = {};
    if(req.query.skip){
        if(req.view.order_ascending){
            stageSkip = {
                $match:{
                    [req.view.order_by]: {
                        $gt: Number(req.query.skip || 0)
                    }
                }
            };
        }else{
            stageSkip = {
                $match:{
                    [req.view.order_by]: {
                        $lte: Number(req.query.skip || +moment())
                    }
                }
            };
        }

        stage = [stage1, stage2, stageSkip, stageLimit, stage3, stage4, stage5 , stage6, stage7, stage8, stage9];
    }else{
        stage = [stage1, stage2, stageLimit, stage3, stage4, stage5 , stage6, stage7, stage8, stage9];
    }

    FilterUserView.aggregate(stage).allowDiskUse(true).exec((err, result) =>{
        
        if(err){
            console.error(err);
            return next(err);
        }
        res.json(result);
    });
}

exports.count = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: mongoose.Types.ObjectId(idOwner),
        view_id: req.view._id
    };
    
    FilterUserView.count(query).exec((err, count)=>{
        if(err){
            return next(err);
        }
        res.json(count);
    });
};

exports.getDetail = (req, res, next) =>{
    res.json(req.view);
}

exports.viewUserById = (req, res, next, id) => {
    // check the validity of view id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('view.user.id.objectId'));
    }
    ViewUser.findOne({
        _id: mongoose.Types.ObjectId(id),
        is_active: true,
        ed_user_id: utils.getParentUserId(req.user)
    }).exec((err, view) =>{
        if(err){
            return next(err);
        }
        if(!view){
            return next(new TypeError('view.user.not_found'));
        }
        req.view = view;
        next();
    });
};
