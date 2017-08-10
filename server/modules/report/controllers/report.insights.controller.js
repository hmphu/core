'use strict';
//
// report.controller.js
// handle core system routes
//
// Created by khanhpq
// Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    moment = require('moment'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    enums = require('../../core/resources/enums.res'),
    Utils = require('../../core/resources/utils'),
    translation  = require('../../biz.rule/resources/translate.res'),    
    enums_report = require('../resources/enums'),
    Report = mongoose.model('Report'),
    cache = require(path.resolve('./config/lib/redis.cache'));

var setTicketFieldCond = function(data){
    data.data_series.forEach(serier => {
        serier.all_conditions.forEach(o => {
            if(o.master && o.master.values){
                o.ticket_field_type = o.master.values.type;
            }
        });
    });

    return data;
}

var report_query = function(report, req_user){
    var start = null, end = null, is_add_time = false, is_comment_time = false, is_solved = false;
    var $or = [];
    var timezone = req_user.time_zone.value * 60 * 60 * 1000;
    
    if(report.is_fixed_date){
        start = report.from_date || +moment.utc();
        end = report.to_date || +moment.utc();
    }else{
        if(report.relative_day === 1){ // 24h
            start = +moment.utc().startOf('day').subtract(1, 'day') - timezone;
            end = +moment.utc().endOf('day')  - timezone;
        } else {
            start = +moment.utc().startOf('day').subtract(report.relative_day, 'day') - timezone;
            end = +moment.utc().endOf('day').subtract(1, 'day') - timezone;
        }
    }
    
    report.data_series.forEach(function(o){
        switch(o.state){
            case 1:
                is_add_time = true;
                break;
            case 2:
                is_comment_time = true;
                break;
            case 3:
                is_solved = true;
                break;
        }
    });

    if(is_add_time){
        $or.push({
            add_time: {$lte: end, $gte: start}
        });
    }
    if(is_comment_time){
        $or.push({
            comment_time: {$lte: end, $gte: start}
        });
    }
    if(is_solved){
        $or.push({
            "stats.date.status.Solved": {$lte: end, $gte: start}
        });
    }

    return {
        $or: $or
    };
};


/**
 * add a new report author : khanhpq
 */
exports.add = (req, res, next) =>{
    if(!req.body.is_fixed_date){
        req.body.relative_day = enums_report.ReportPeriod[req.body.relative_day];
    }
    
    if(req.body.group_by != enums_report.GroupBy.time){
        delete req.body.group_by_time
    }
    req.body = setTicketFieldCond(req.body);

    var report = new Report(req.body),
        idOwner = Utils.getParentUserId(req.user);
    report.ed_user_id = idOwner;
    report.is_active = true;

    report.save((errsave) => {
        if(errsave){
            return next(errsave);
        }
        cache.removeCache(idOwner, "report_insight", (errsave) => {
            if(errsave){
                console.error(errsave, 'report.insight.remove_cache_fail');
            }
        });
        res.json(report);
    });
};

/**
 * clone report author : khanhpq
 */
exports.clone = (req, res, next) => {
    req.report.name += "_" + translation[req.user.language || "en"].clone;
    res.json(req.report);
};

/**
 * show current report author : khanhpq
 */
exports.read = (req, res, next) => {
    var report = req.report.toObject();
    res.json(report);
};

/**
 * update the current report author : khanhpq
 */
exports.update = (req, res, next) => {
    var report = req.report,
        idOwner = Utils.getParentUserId(req.user);

    if(req.body){
        delete req.body.ed_user_id;
        delete req.body.is_active;
        
        if(req.body.report_time_to == 24){
            req.body.report_time_to = 0;
        }
    }
    
    if(!req.body.is_fixed_date){
        req.body.relative_day = enums_report.ReportPeriod[req.body.relative_day];
    }

    req.body = setTicketFieldCond(req.body);

    // Merge existing report
    var new_report = _.assign(report, req.body);
    
    new_report.save((errsave) => {
        if(errsave){
            return next(errsave);
        }

        cache.removeCache(idOwner, "report_insight", (errsave) => {
            if(errsave){
                console.error(errsave, 'report.insight.remove_cache_fail');
            }
        });
        res.json(new_report);
    });
};

/**
 * deactive or active report
 * @author: khanhpq
 */
exports.toggle = (req, res, next) => {
    var report = req.report,
        idOwner = Utils.getParentUserId(req.user);
    
    report.is_active = !report.is_active;
    
    report.save((errsave) => {
        if(errsave){
            return next(errsave);
        }
        
        cache.removeCache(idOwner, "report_insight", (errsave) => {
            if(errsave){
                console.error(errsave, 'report.insight.remove_cache_fail');
            }
        });
        res.json(report);
    });
};

/**
 * remove all report inactive author : khanhpq
 */
exports.deleteInactive = (req, res, next) => {
    var idOwner = Utils.getParentUserId(req.user),
        tasks = [];
    
    Report.find({
        ed_user_id: idOwner,
        is_active: false
    }).exec((err, arr_report) =>{
        if(err){
            return next(err);
        }
        
        arr_report.forEach((report) => {
            var promise = new Promise((resolve, reject) => {
                report.remove(function (err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                 });
            });
            tasks.push(promise);
        });

        Promise.all(tasks).then(function(result) {
            cache.removeCache(idOwner, "report_insight", (errsave) => {
                if(errsave){
                    console.error(errsave, 'report.insight.remove_cache_fail');
                }
            });
            res.json({is_succes: true});

        }, function(reason) {
            return next(reason);
        });
         
    });
};

/**
 * logically delete the current report author : khanhpq
 */
exports.delete = (req, res, next) => {
    var report = req.report,
        idOwner = Utils.getParentUserId(req.user);

    report.remove(function (err) {
        if (err) {
            return next(err);
        }
        
        cache.removeCache(idOwner, "report_insight", (errsave) => {
            if(errsave){
                console.error(errsave, 'report.insight.remove_cache_fail');
            }
        });
        res.json({is_succes: true});
    });
};

/*
 * Count all reports @author: khanhpq
 */
exports.count = function (req, res, next) {
    var idOwner = Utils.getParentUserId(req.user);
    
    new Promise(function(resolve, reject) {
        Report.count({
            ed_user_id: idOwner,
            is_active: true
        }, function (err, count) {
            if (err) {
                return reject(err);
            }
            resolve(count);
        });
            
    }).then(function(count_active) {

        return new Promise(function(resolve, reject) {
            Report.count({
                ed_user_id: idOwner,
                is_active: false
            }, function (err, count) {
                if (err) {
                    return reject(err);
                }
                res.json({count_inactive: count, count_active: count_active});
            });
        });
        
    }, function(reason) {
        next(reason);
    });
};

/*
 * Get all reports @author: khanhpq
 */
exports.list = function (req, res, next) {
    var idOwner = Utils.getParentUserId(req.user),
        params = {
            query: {
                ed_user_id: idOwner,
                is_active: req.params.is_active == 1? true: false
            },
            sort: 'add_time',
            select: '_id position name is_active add_time upd_time',
            skip: req.query.skip,
            //sort_order: 1,
            limit: req.query.limit || config.paging.limit
        },
        tasks = [];
    Utils.findByQuery(Report, params).exec(function (err, reports) {
        if (err) {
            return next(err);
        }
        reports = _.concat([],reports);
        reports.forEach((report) => {
            var promise = new Promise((resolve, reject) => {
                resolve( {
                    _id: report._id,
                    upd_time: report.upd_time,
                    add_time: report.add_time,
                    name: report.name,
                    is_active: report.is_active
                });
            });
            tasks.push(promise);
        });

        Promise.all(tasks).then(function(result) {
            res.json(result);

        }, function(reason) {
            return next(reason);
        });
    });
};

/**
 * report middleware
 */
exports.reportByID = (req, res, next, id) => {

    // check the validity of report id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('report.insight.id_notfound'));
    }

    var idOwner = Utils.getParentUserId(req.user);
    // find report by its id
    Report.findById(id).exec((err, report) => {
        if (err){
            return next(err);
        }
        if (!report || !_.isEqual(report.ed_user_id, idOwner)) {
            return next(new TypeError('report.insight.id_notfound'));
        }
        req.report = report;
        next();
    });
};
