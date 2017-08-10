'use strict';
//
// sla.controller.js
// handle core system routes
//
// Created by khanhpq on 2015-12-17.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    translation  = require('../resources/translate.res'),
    mongoose = require('mongoose'),
    Sla = mongoose.model('Sla'),
    biz_utils = require('../resources/utils'),
    Utils = require('../../core/resources/utils'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    cache = require(path.resolve('./config/lib/redis.cache'));

/**
 * add a new sla author : khanhpq
 */
exports.add = [
    (req, res, next) => {
        Sla.count({
            ed_user_id: Utils.getParentUserId(req.user),
            is_active: true
        }, function (err, count) {
            if (err) {
                return next(err);
            }

            if (count >= config.bizRule.maxItem) {
                return next(new TypeError('biz_rule.sla.update_max_fail'));
            }
            next();
        });
    },
    (req, res, next) =>{
        Sla.findOne({
            ed_user_id: Utils.getParentUserId(req.user)
        }).
        select("_id ed_user_id position").
        sort({position: -1}).
        exec((err, result) => {
            if (err) {
                return next(err);
            }
            
            if(!result){
                req.body.position = 0;
                return next();
            }
            req.body.position = result.position + 1;
            next();
        });
    },
    (req, res, next) =>{
        req.body = biz_utils.removeEmptyCond(req.body);
        var sla = new Sla(req.body),
            idOwner = Utils.getParentUserId(req.user);
        
        sla.deactive = false;
        sla.is_active = true;
        sla.ed_user_id = idOwner;
        sla.user_id = req.user._id;

        sla.save((errsave) => {
            if(errsave){
                return next(errsave);
            }
            
            cache.removeCache(idOwner, "sla", (errsave) => {
                if(errsave){
                    console.error(errsave, 'biz_rule.sla.remove_cache_fail');
                }
            });
            var current_no = ((((req.user.settings.features || {}).productivity || {}).slas || {}).current_no || 0);
            emitter.emit('evt.user.setting.update.max_sla', {
                idOwner: idOwner,
                current_sla_no: current_no + 1,
                callback: function(err, result){
                    if(err){
                        console.error(err, 'biz_rule.sla.update_max_fail');
                    }
                    var update = {productivity:{slas:{current_no: current_no + 1}}};
                    req.user.settings.features = req.user.settings.features || {};
                    req.user.settings.features = _.assign(req.user.settings.features, update);
                }
            });
            res.json(sla);
        });
    }
];

/**
 * clone sla author : khanhpq
 */
exports.clone = (req, res) => {
    req.sla.name += "_" + translation[req.user.language || "en"].clone;
    res.json(req.sla);
};

/**
 * show current sla author : khanhpq
 */
exports.read = (req, res) => {
    res.json(req.sla);
};

/**
 * update the current sla author : khanhpq
 */
exports.update = [
    (req, res, next) => {
        if(req.body && req.body.is_active){
            Sla.count({
                ed_user_id: Utils.getParentUserId(req.user),
                is_active: true
            }, function (err, count) {
                if (err) {
                    return next(err);
                }

                if (count >= config.bizRule.maxItem) {
                    return next(new TypeError('biz_rule.sla.update_max_fail'));
                }
                next();
            });
        }else{
            next();
        }
    },
    (req, res, next) => {
        var current_no = ((((req.user.settings.features || {}).productivity || {}).slas || {}).current_no || 0);
        var sla = req.sla,
            idOwner = Utils.getParentUserId(req.user),
            current_sla_no = current_no,
            is_toogle = _.isBoolean(req.sla.is_active) && _.isBoolean(req.body.is_active) && req.sla.is_active != req.body.is_active;
        
        if(req.body){
            delete req.body.position;
            delete req.body.ed_user_id;
            delete req.body.user_id;
            req.body = biz_utils.removeEmptyCond(req.body);
        }

        // Merge existing sla
        sla = _.assign(sla, req.body);

        if(req.body.all_conditions || req.body.any_conditions){
            sla.all_conditions = [];
            sla.any_conditions = [];

            req.body.all_conditions.forEach(item => { sla.all_conditions.push(item); })
            req.body.any_conditions.forEach(item => { sla.any_conditions.push(item); })
        }
        
        sla.save((errsave) => {
            if(errsave){
                return next(errsave);
            }
            
            if(is_toogle){
                
                if(req.body.is_active === false){
                    current_sla_no = current_no == 0 ? 0 : (current_no - 1);
                }else{
                    current_sla_no = current_no + 1;
                }

                emitter.emit('evt.user.setting.update.max_sla', {
                    idOwner: idOwner,
                    current_sla_no: current_sla_no,
                    callback: function(err, result){
                        if(err){
                            console.error(err, 'biz_rule.sla.update_max_fail');
                        }
                        var update = {productivity:{slas:{current_no: current_sla_no}}};
                        req.user.settings.features = req.user.settings.features || {};
                        req.user.settings.features = _.assign(req.user.settings.features, update);
                    }
                });
            }
            
            cache.removeCache(idOwner, "sla", (err) => {
                if(err){
                    console.error(err, 'biz_rule.sla.remove_cache_fail');
                }
            });
            
            res.json(sla);
        });
    }
];


/**
 * remove all sla inactive author : khanhpq
 */
exports.deleteInactive = (req, res, next) => {
    var idOwner = Utils.getParentUserId(req.user),
        tasks = [];
    
    Sla.find({
        ed_user_id: idOwner,
        is_active: false
    }).exec((err, arr_sla) =>{
        if(err){
            return next(err);
        }
        
        arr_sla.forEach((sla) => {
            var promise = new Promise((resolve, reject) => {
                sla.remove(function (err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
            tasks.push(promise);
        });

        Promise.all(tasks).then(function(slas) {
            cache.removeCache(idOwner, "sla", (errsave) => {
                if(errsave){
                    console.error(errsave, 'biz_rule.sla.remove_cache_fail');
                }
            });
            res.json({is_succes: true});

        }, function(reason) {
            return next(reason);
        });
         
    });
};

/**
 * logically delete the current sla author : khanhpq
 */
exports.delete = (req, res, next) => {
    var sla = req.sla,
        idOwner = Utils.getParentUserId(req.user);

    sla.remove(function (err) {
        if (err) {
            return next(err);
        }
        
        if(sla.is_active){
            var current_no = ((((req.user.settings.features || {}).productivity || {}).slas || {}).current_no || 0);
            emitter.emit('evt.user.setting.update.max_sla', {
                idOwner: idOwner,
                current_sla_no: current_no == 0 ? 0 : (current_no - 1),
                callback: function(err, result){
                    if(err){
                        console.error(err, 'biz_rule.sla.update_max_fail');
                    }
                    var update = {productivity:{slas:{current_no: current_no == 0? 0: current_no -1}}};
                    req.user.settings.features = req.user.settings.features || {};
                    req.user.settings.features = _.assign(req.user.settings.features, update);
                }
            }); 
        }
        
        cache.removeCache(idOwner, "sla", (errsave) => {
            if(errsave){
                console.error(errsave, 'biz_rule.sla.remove_cache_fail');
            }
        });
        
        res.json({is_success: true});
    });
};

/*
 * Get all slas @author: khanhpq
 */
exports.list = function (req, res, next) {
    var idOwner = Utils.getParentUserId(req.user),
        sort_by_arr = {
            add_time: -1,
            upd_time: -1,
            position: 1
        },
        params = {
            query: {
                ed_user_id: idOwner,
                is_active: req.params.is_active == 1? true: false
            },
            sort: '-add_time',
            select: '_id position name is_active add_time upd_time',
            skip: req.query.skip,
            sort_order: req.query.sort_order,
            limit: req.query.limit || config.paging.limit
        };
    
    // Sort by
    if (req.params.sla_sort_by) {
        params.sort = sort_by_arr[req.params.sla_sort_by] != undefined ? req.params.sla_sort_by : 'position';
        params.sort_order = sort_by_arr[req.params.sla_sort_by] || 1;
    }
    
    Utils.findByQuery(Sla, params).exec(function (err, slas) {
        if (err) {
            return next(err);
        }

        res.json(slas);
    });
};

/*
 * Count all slas @author: khanhpq
 */
exports.count = function (req, res, next) {
    var idOwner = Utils.getParentUserId(req.user);

    new Promise(function(resolve, reject) {
        Sla.count({
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
            Sla.count({
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

/**
 * reoder sla author: khanhpq
 */
exports.reorder = (req, res, next) => {
    biz_utils.bizSort( true, Sla, "sla", Utils.getParentUserId(req.user), req.params.biz_id_from, req.params.biz_id_to, function(err){
        if(err){
            return next(err);
        }
        
        res.json({
            message: "biz_rule.sla.reorder_success"
        });
    });
};

/**
 * SLA middleware
 */
exports.slaByID = (req, res, next, id) => {

    // check the validity of sla id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('biz_rule.sla.id_notfound'));
    }

    var idOwner = Utils.getParentUserId(req.user);
    // find sla by its id
    Sla.findById(id).exec((err, sla) => {
        if (err){
            return next(err);
        }
        if (!sla || !_.isEqual(sla.ed_user_id, idOwner)) {
            return next(new TypeError('biz_rule.sla.id_notfound'));
        }
        req.sla = sla;
        next();
    });
};
