'use strict';
//
// trigger.controller.js
// handle core system routes
//
// Created by khanhpq on 2016-01-15.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    enums = require('../../core/resources/enums.res'),
    Trigger = mongoose.model('Trigger'),
    Utils = require('../../core/resources/utils'),
    translation  = require('../resources/translate.res'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    biz_utils = require('../resources/utils'),
    cache = require(path.resolve('./config/lib/redis.cache'));


var setTicketFieldCond = function(conds){
    conds.forEach(o => {
        if(o.master && o.master.values){
            o.ticket_field_type = o.master.values.type;
        }
    });
    return conds;
}

/**
 * add a new trigger author : khanhpq
 */
exports.add = [
    (req, res, next) => {
        Trigger.count({
            ed_user_id: Utils.getParentUserId(req.user),
            is_active: true
        }, function (err, count) {
            if (err) {
                return next(err);
            }

            if (count >= config.bizRule.maxItem) {
                return next(new TypeError('biz_rule.trigger.max_item'));
            }
            next();
        });
    },
    (req, res, next) =>{
        Trigger.findOne({
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
    (req, res, next) => {
        req.body = biz_utils.removeEmptyCond(req.body);

        if(req.body.any_conditions){
            req.body.any_conditions = setTicketFieldCond(req.body.any_conditions);
        }
        
        if(req.body.all_conditions){
            req.body.all_conditions = setTicketFieldCond(req.body.all_conditions);
        }
        
        var trigger = new Trigger(req.body),
            idOwner = Utils.getParentUserId(req.user);

        trigger.deactive = false;
        trigger.ed_user_id = idOwner;
        trigger.user_id = req.user._id;
        trigger.is_active = true;
        
        trigger.save((errsave) => {
            if(errsave){
                return next(errsave);
            }
            
            cache.removeCache(idOwner, "trigger", (errsave) => {
                if(errsave){
                    console.error(errsave, 'biz_rule.trigger.remove_cache_fail');
                }
            });
            
            var current_trigger_no = ((((req.user.settings.features || {}).productivity || {}).triggers || {}).current_no || 0) + 1;
            emitter.emit('evt.user.setting.update.max_trigger', {
                idOwner: idOwner,
                current_trigger_no: current_trigger_no,
                callback: function(err, result){
                    if(err){
                        console.error(err, 'biz_rule.trigger.update_max_fail');
                    }
                    var update = {productivity:{triggers:{current_no: current_trigger_no}}};
                    req.user.settings.features = req.user.settings.features || {};
                    req.user.settings.features = _.assign(req.user.settings.features, update);
                }
            });
            res.json(trigger);
        });
    }
];

/**
 * clone trigger author : khanhpq
 */
exports.clone = (req, res) => {
    req.trigger.name += "_" + translation[req.user.language || "en"].clone;
    res.json(req.trigger);
};

/**
 * show current trigger author : khanhpq
 */
exports.read = (req, res) => {
    res.json(req.trigger);
};

/**
 * update the current trigger author : khanhpq
 */
exports.update =  [
    (req, res, next) => {
        if(req.body && req.body.is_active){
            var is_toogle = _.isBoolean(req.trigger.is_active) && _.isBoolean(req.body.is_active) && req.trigger.is_active != req.body.is_active;
            Trigger.count({
                ed_user_id: Utils.getParentUserId(req.user),
                is_active: true
            }, function (err, count) {
                if (err) {
                    return next(err);
                }

                if (is_toogle && req.body.is_active && count >= config.bizRule.maxItem) {
                    return next(new TypeError('biz_rule.trigger.max_item'));
                }
                next();
            });
        }else{
            next();
        }
    },
    (req, res, next) => {
        var current_no = ((((req.user.settings.features || {}).productivity || {}).triggers || {}).current_no || 0);
        var trigger = req.trigger,
            idOwner = Utils.getParentUserId(req.user),
            current_trigger_no = current_no,
            is_toogle = _.isBoolean(req.trigger.is_active) && _.isBoolean(req.body.is_active) && req.trigger.is_active != req.body.is_active;

        if(req.body){
            delete req.body.position;
            delete req.body.ed_user_id;
            req.body = biz_utils.removeEmptyCond(req.body);
        }

        delete trigger.__v;
        delete req.body.__v;

        if(req.body.any_conditions){
            req.body.any_conditions = setTicketFieldCond(req.body.any_conditions);
        }
        
        if(req.body.all_conditions){
            req.body.all_conditions = setTicketFieldCond(req.body.all_conditions);
        }
        
        /*var tmpJSON = trigger.toJSON();
        for (var i in tmpJSON) {
            trigger[i] = req.body[i];
        }*/
        // Merge existing trigger
        trigger = _.assign(trigger, req.body);

        if(req.body.all_conditions || req.body.any_conditions || req.body.actions){
            trigger.all_conditions = [];
            trigger.any_conditions = [];
            trigger.actions = [];

            req.body.all_conditions.forEach(item => { trigger.all_conditions.push(item); })
            req.body.any_conditions.forEach(item => { trigger.any_conditions.push(item); })
            req.body.actions.forEach(item => { trigger.actions.push(item); })
        }

        trigger.save((errsave) => {
            if(errsave){
                return next(errsave);
            }
            
            if(is_toogle){
                
                if(req.body.is_active === false){
                    current_trigger_no = current_no == 0 ? 0 : (current_no - 1);
                }else{
                    current_trigger_no = current_no + 1;
                }
                emitter.emit('evt.user.setting.update.max_trigger', {
                    idOwner: idOwner,
                    current_trigger_no: current_trigger_no,
                    callback: function(err, result){
                        if(err){
                            console.error(err, 'biz_rule.trigger.update_max_fail');
                        }
                        var update = {productivity:{triggers:{current_no: current_trigger_no}}};
                        req.user.settings.features = req.user.settings.features || {};
                        req.user.settings.features = _.assign(req.user.settings.features, update);
                    }
                });
            }

            cache.removeCache(idOwner, "trigger", (err) => {
                if(err){
                    console.error(err, 'biz_rule.trigger.remove_cache_fail');
                }
            });
            
            res.json(trigger);
        });
    }
];

/**
 * reoder trigger author : khanhpq
 */
exports.reorder = (req, res, next) => {
    biz_utils.bizSort(true, Trigger, "trigger", Utils.getParentUserId(req.user), req.params.biz_id_from, req.params.biz_id_to, function(err){
        if(err){
            return next(err);
        }
        
        res.json({
            message: "biz_rule.trigger.reorder_success"
        });
    });
};

/**
 * remove all trigger inactive author : khanhpq
 */
exports.deleteInactive = (req, res, next) => {
    var idOwner = Utils.getParentUserId(req.user),
        tasks = [];
    
    Trigger.find({
        ed_user_id: idOwner,
        is_active: false
    }).exec((err, arr_trigger) =>{
        if(err){
            return next(err);
        }
        
        arr_trigger.forEach((trigger) => {
            var promise = new Promise((resolve, reject) => {
                trigger.remove(function (err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                 });
            });
            tasks.push(promise);
        });

        Promise.all(tasks).then(function(triggers) {
            cache.removeCache(idOwner, "trigger", (errsave) => {
                if(errsave){
                    console.error(errsave, 'biz_rule.trigger.remove_cache_fail');
                }
            });
            res.json({is_succes: true});

        }, function(reason) {
            return next(reason);
        });
         
    });
};

/**
 * logically delete the current trigger author : khanhpq
 */
exports.delete = (req, res, next) => {
    var trigger = req.trigger,
        idOwner = Utils.getParentUserId(req.user);

    trigger.remove(function (err) {
        if (err) {
            return next(err);
        }
        
        var current_no = ((((req.user.settings.features || {}).productivity || {}).triggers || {}).current_no || 0);
        if(trigger.is_active){
            emitter.emit('evt.user.setting.update.max_trigger', {
                idOwner: idOwner,
                current_trigger_no: current_no == 0 ? 0 : (current_no - 1),
                callback: function(err, result){
                    if(err){
                        console.error(err, 'biz_rule.trigger.update_max_fail');
                    }
                    var update = {productivity:{triggers:{current_no: current_no == 0 ? 0 : (current_no - 1) }}};
                    req.user.settings.features = req.user.settings.features || {};
                    req.user.settings.features = _.assign(req.user.settings.features, update);
                }
            });
        }
        
        cache.removeCache(idOwner, "trigger", (errsave) => {
            if(errsave){
                console.error(errsave, 'biz_rule.trigger.remove_cache_fail');
            }
        });
        res.json({is_succes: true});
    });
};

/*
 * Count all triggers @author: khanhpq
 */
exports.count = function (req, res, next) {
    var idOwner = Utils.getParentUserId(req.user);
    
    new Promise(function(resolve, reject) {
        Trigger.count({
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
            Trigger.count({
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
 * Get all triggers @author: khanhpq
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
        select: '_id position name is_active add_time upd_time',
        skip: req.query.skip,
        sort_order: req.query.sort_order,
        limit: req.query.limit || config.paging.limit
    }; 

    // Sort by
    if (req.params.trigger_sort_by) {
        params.sort = sort_by_arr[req.params.trigger_sort_by] != undefined ? req.params.trigger_sort_by : 'position';
        params.sort_order = sort_by_arr[req.params.trigger_sort_by] || 1;
    }

    Utils.findByQuery(Trigger, params).exec(function (err, triggers) {
        if (err) {
            return next(err);
        }

        res.json(triggers);
    });
};

/**
 * trigger middleware
 */
exports.triggerByID = (req, res, next, id) => {

    // check the validity of trigger id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('biz_rule.trigger.id_notfound'));
    }

    var idOwner = Utils.getParentUserId(req.user);
    // find trigger by its id
    Trigger.findById(id).exec((err, trigger) => {
        if (err){
            return next(err);
        }
        if (!trigger || !_.isEqual(trigger.ed_user_id, idOwner)) {
            return next(new TypeError('biz_rule.trigger.id_notfound'));
        }
        req.trigger = trigger;
        next();
    });
};
