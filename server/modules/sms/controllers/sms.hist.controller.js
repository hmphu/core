'use strict';
//
//  sms.hist controller.js
//  handle core system routes
//
//  Created by vupl on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    moment = require('moment'),
    mongoose = require('mongoose'),
    SmsHist = mongoose.model('SmsHist'),
    Sms = mongoose.model('Sms'),
    SmsCarrier = mongoose.model('SmsCarrier'),
    path = require('path'),
    moment = require('moment'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    config = require(path.resolve('./config/config')),
    utils = require('../../core/resources/utils'),
    enums = require('../resources/enums.sms'),
    validate = require('../validator/sms.validator'),
    cache = require(path.resolve('./config/lib/redis.cache')),
    sendmail = require('../../core/resources/sendmail');

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========
var getCostByBrandDefault = (query) =>{
    return new Promise((resolve, reject) =>{
        query.brand_name = config.sms.SMS_BRAND;
        var stage = [
            {
                $match: query
            },{
                $project: {
                    "_id": "$_id",
                    "cost": {
                        $sum: {
                            $multiply: ["$sms_count", "$cost"]
                        }
                    },
                    "sms_count": "$sms_count",
                    "sms_carrier" : "$sms_carrier"
                }
            },{
                $group: {
                    "_id": "$sms_carrier",
                    "brand_default_cost": {
                        $sum: "$cost"
                    },
                    "brand_default_total_sms": {
                        $sum: "$sms_count"
                    }
                }
            },{
                $lookup: {
                    "from": config.dbTablePrefix.concat('sms_carrier'),
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "sms_carrier_docs"
                }
            },{
                $unwind: "$sms_carrier_docs"
            },{
                $project: {
                    "_id" : "$sms_carrier_docs._id",
                    "sms_carrier": "$sms_carrier_docs.sms_carrier",
                    "brand_default_cost" : "$brand_default_cost",
                    "brand_default_total_sms" : "$brand_default_total_sms"
                }
            }
        ];
        SmsHist.aggregate(stage).exec((err, result) => {
            if (err) {
                return reject(err);
            }
            return resolve(result);
        });
    });
};

var getCostByBrand = (query) =>{
    return new Promise((resolve, reject) =>{
        query.brand_name = { $ne : config.sms.SMS_BRAND};
        var stage = [
            {
                $match: query
            },{
                $project: {
                    "_id": "$_id",
                    "cost": {
                        $sum: {
                            $multiply: ["$sms_count", "$cost"]
                        }
                    },
                    "sms_count": "$sms_count",
                    "sms_carrier" : "$sms_carrier"
                }
            },{
                $group: {
                    "_id": "$sms_carrier",
                    "brand_cost": {
                        $sum: "$cost"
                    },
                    "brand_total_sms": {
                        $sum: "$sms_count"
                    }
                }
            },{
                $lookup: {
                    "from": config.dbTablePrefix.concat('sms_carrier'),
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "sms_carrier_docs"
                }
            },{
                $unwind: "$sms_carrier_docs"
            }
        ];
        SmsHist.aggregate(stage).exec((err, result) => {
            if (err) {
                return reject(err);
            }
            return resolve(result);
        });
    });
};

var getMonthFeeSmsCarrier = (sms_carrier, sms_info, is_monthly_brand) =>{
    return new Promise((resolve, reject) =>{
        if(is_monthly_brand){
            _.forEach(sms_carrier.customer_types, (item) =>{
                if(item.customer_type == sms_info.customer_type){
                    return resolve(item.monthly_fee);
                }
            })
        } else {
            return resolve(0);
        }
    })
}

var getCost = (sms_carrier, data, is_monthly_brand, idOwner, sms_info, next) =>{
    var query = {
        ed_user_id: idOwner,
        add_time: {
            $gte: data.from_date,
            $lte: data.to_date
        },
        is_io: true,
        status_delivered: enums.SMS_Status_Response.DELIVERED,
        sms_carrier: sms_carrier._id
    }
    Promise.all([
        getCostByBrandDefault(query),
        getCostByBrand(query),
        getMonthFeeSmsCarrier(sms_carrier, sms_info, is_monthly_brand)
    ]).then(result =>{
        if(result[0].length == 0 && result[1].length == 0){
            return next(null, null);
        } else {
            var res_data = {
                sms_carrier: '',
                brand_default_cost: 0,
                brand_default_total_sms: 0,
                brand_cost: 0,
                brand_total_sms: 0,
                monthly_fee : result[2]
            }
            var brand_default = _.head(result[0]),
                brand = _.head(result[1]);
            if(result[0].length > 0){
                res_data.sms_carrier = brand_default.sms_carrier;
            } else {
                if(result[1].length > 0){
                    res_data.sms_carrier = brand.sms_carrier;
                }
            }
            res_data.brand_default_cost = result[0].length > 0 ? brand_default.brand_default_cost : 0;
            res_data.brand_default_total_sms = result[0].length > 0 ? brand_default.brand_default_total_sms : 0;
            res_data.brand_cost = result[1].length > 0 ? brand.brand_cost : 0;
            res_data.brand_total_sms = result[1].length > 0 ? brand.brand_total_sms : 0;
            return next(null, res_data);
        }

    }).catch(error =>{
        return next(error)
    });
};


var getCostByCarrier = (data, idOwner) =>{
    return new Promise((resolve, reject) =>{
        var is_monthly_brand = true;
        var query = {
            ed_user_id: idOwner
        };
        var res_data = [];
        cache.findOneWithCache(idOwner, 'user.setting.sms', Sms, query, (err, sms) =>{
            if( err || !sms){
                return reject(err);
            }
            if(utils.isEmpty(sms.brand)){
                is_monthly_brand = false;
            } else {
                if(utils.isEmpty(sms.brand.time_active[0])){
                    is_monthly_brand = false;
                } else {
                    _.forEach(sms.brand.time_active, (item) =>{
                        var now_day = +moment.utc();
                        if(item.end_time == null){
                            if(now_day > data.from_date || data.from_date == now_day && item.start_time < data.to_date){
                                is_monthly_brand = item.is_active;
                            }
                        } else {
                            if(item.start_time > data.from_date || item.start_time == data.from_date && item.start_time < data.to_date){
                                is_monthly_brand = item.is_active;
                            }
                        }
                    });
                }
            }
            SmsCarrier.find({}, (error, smsCarrier) =>{
                if(err){
                    return reject(err);
                }
                var fetchSmsCarrier = (sms_carrier, index) =>{
                    if(utils.isEmpty(sms_carrier[index])){
                        return resolve(res_data);
                    }
                    getCost(sms_carrier[index], data, is_monthly_brand, idOwner, sms, (err, result) =>{
                        if(err){
                            fetchSmsCarrier(sms_carrier, ++index);
                        }
                        if(!utils.isEmpty(result)){
                            res_data.push(result);
                        }
                        fetchSmsCarrier(sms_carrier, ++index);
                    });
                }
                fetchSmsCarrier(smsCarrier, 0);
            });
        });
    });
};

var getHist = (data, is_send, idOwner) =>{
    return new Promise((resolve, reject) =>{
        var query = {
            ed_user_id: idOwner,
            add_time: {
                $gte: data.from_date,
                $lte: data.to_date
            },
            is_io: is_send,
            status_delivered: enums.SMS_Status_Response.DELIVERED
        };
        SmsHist.find(query, (err, result) =>{
            if(err){
                return reject(err);
            }
            var total = 0;
            _.forEach(result, (item) =>{
                total += item.sms_count;
            });
            return resolve(total);
        })
    });
}
//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========
/*
 * save sms hist
 * @author: vupl
 */
exports.add = (data) =>{
    var smsHist = new SmsHist(data);
    tmp_data.save('save_sms_hist', data.ed_user_id, smsHist, smsHist, (err, result) =>{
        if(err){
            console.error(err, "save_sms_hist");
            return;
        }
        return;
    });
};


/*
 * get list sms hist
 * @author: vupl
 */
exports.listHistory = [
    (req, res, next) =>{
        validate.validate_sms_report_query_data(req.body, next);
    },
    (req, res, next) =>{
        var params = {
            query:{
                ed_user_id: utils.getParentUserId(req.user),
                is_io: true,
                status_delivered: enums.SMS_Status_Response.DELIVERED
            },
            select: '_id brand_name sms_carrier status_delivered sms_count phone_number add_time',
            populate: ({
                include: 'sms_carrier',
                fields: 'sms_carrier sms_number'
            }),
            sort: 'add_time',
            skip: req.query.skip,
            limit: req.query.limit || config.paging.limit,
            sort_order: -1
        };
        if(req.query.skip){
            params.query['add_time'] = {
                $lt: req.query.skip,
                $gt: req.body.from_date
            }
        }else {
            params.query['add_time'] = {
                $lte: req.body.to_date,
                $gte: req.body.from_date
            }
        }
        utils.findByQuery(SmsHist, params).exec(function (err, result) {
            if (err) {
                return next(err);
            }
            res.json(result);
        });
    }
];

/*
 * get detail sms history
 * @author: vupl
 */
exports.getDetailHistory = [
    (req, res, next) =>{
        validate.validate_sms_report_query_data(req.body, next);
    },
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        Promise.all([
            getCostByCarrier(req.body, idOwner),
            getHist(req.body, true, idOwner),
            getHist(req.body, false, idOwner)
        ]).then(result =>{
            var res_data = {
                total_sms_send: result[1],
                total_sms_received: result[2],
                total_fee_sms_carrier: 0,
                total_cost: 0,
                brand_monthly_fee: config.sms.BRAND_MONTHLY_FEE,
                sms_carrier: result[0]
            };
            _.forEach(result[0], (item) =>{
                res_data.total_fee_sms_carrier += item.monthly_fee;
                res_data.total_cost += item.brand_cost + item.brand_default_cost
            });
            res.json(res_data);
        }).catch(error =>{
            console.error(error, "Failed get detail history sms");
            return next(error);
        })
    }
]
