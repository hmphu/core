'use strict';
//
// automation.controller.js
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
    translation  = require('../resources/translate.res'),
    Automation = mongoose.model('Automation'),
    Utils = require('../../core/resources/utils'),
    biz_utils = require('../resources/utils'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
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
 * add a new automation author : khanhpq
 */
exports.add = [
    (req, res, next) => {
        if(req.body && req.body.is_active){
            Automation.count({
                ed_user_id: Utils.getParentUserId(req.user),
                is_active: true
            }, function (err, count) {
                if (err) {
                    return next(err);
                }

                if (count >= config.bizRule.maxItem) {
                    return next(new TypeError('biz_rule.automation.add_fail'));
                }
                next();
            });
        }else{
            next();
        }
    },
    (req, res, next) => {
        Automation.findOne({
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
        
        if(req.body.any_conditions){
            req.body.any_conditions = setTicketFieldCond(req.body.any_conditions);
        }
        
        if(req.body.all_conditions){
            req.body.all_conditions = setTicketFieldCond(req.body.all_conditions);
        }
        
        var automation = new Automation(req.body),
            idOwner = Utils.getParentUserId(req.user);
        
        automation.deactive = false;
        automation.is_active = true;
        automation.ed_user_id = idOwner;
        automation.user_id = req.user._id;
        
        automation.save((errsave) => {
            if(errsave){
                return next(errsave);
            }
            
            cache.removeCache(idOwner, "automation", (errsave) => {
                if(errsave){
                    console.error(errsave, 'biz_rule.automation.remove_cache_fail');
                }
            });
            
            var current_no = ((((req.user.settings.features || {}).productivity || {}).automations || {}).current_no || 0);
            emitter.emit('evt.user.setting.update.max_automation', {
                idOwner: idOwner,
                current_auto_no: current_no + 1,
                callback: function(err, result){
                    if(err){
                        console.error(err, 'biz_rule.automation.update_max_fail');
                    }
                    var update = {productivity:{automations:{current_no: current_no + 1}}};
                    req.user.settings.features = req.user.settings.features || {};
                    req.user.settings.features = _.assign(req.user.settings.features, update);
                }
            });
            /*rbSender(config.rabbit.sender.exchange.batch, {
                topic: 'izi-core-add-filter-ticket',
                payload: {
                    filter: enums.FilterTicket.automation,
                    automation_id: automation._id,
                    user: req.user
                }
            });*/
            res.json(automation);
        });
    }
];

/**
 * clone automation author : khanhpq
 */
exports.clone = (req, res) => {
    req.automation.name += "_" + translation[req.user.language || "en"].clone;
    res.json(req.automation);
};


/**
 * show current automation author : khanhpq
 */
exports.read = (req, res) => {
    res.json(req.automation);
};

/**
 * update the current automation author : khanhpq
 */
exports.update = [
    (req, res, next) => {
        if(req.body && req.body.is_active){
            Automation.count({
                ed_user_id: Utils.getParentUserId(req.user),
                is_active: true
            }, function (err, count) {
                if (err) {
                    return next(err);
                }

                if (count >= config.bizRule.maxItem) {
                    return next(new TypeError('biz_rule.automation.update_fail'));
                }
                next();
            });
        }else{
            next();
        }
    },
    (req, res, next) => {
        var current_no = ((((req.user.settings.features || {}).productivity || {}).automations || {}).current_no || 0);
        var automation = req.automation,
            idOwner = Utils.getParentUserId(req.user),
            current_auto_no = current_no,
            is_toogle = _.isBoolean(req.automation.is_active) && _.isBoolean(req.body.is_active) && req.automation.is_active != req.body.is_active;
        
        if(req.body){
            delete req.body.position;
            delete req.body.ed_user_id;
            req.body = biz_utils.removeEmptyCond(req.body);
        }

        if(req.body.any_conditions){
            req.body.any_conditions = setTicketFieldCond(req.body.any_conditions);
        }
        
        if(req.body.all_conditions){
            req.body.all_conditions = setTicketFieldCond(req.body.all_conditions);
        }
        
        // Merge existing automation
        automation = _.assign(automation, req.body);
        
        if(req.body.all_conditions || req.body.any_conditions || req.body.actions){
            automation.all_conditions = [];
            automation.any_conditions = [];
            automation.actions = [];

            req.body.all_conditions.forEach(item => { automation.all_conditions.push(item); })
            req.body.any_conditions.forEach(item => { automation.any_conditions.push(item); })
            req.body.actions.forEach(item => { automation.actions.push(item); })
        }

        automation.save((errsave) => {
            if(errsave){
                return next(errsave);
            }

            if(is_toogle){
                if(req.body.is_active === false){
                    current_auto_no = current_no == 0 ? 0 : (current_no - 1);
                }else{
                    current_auto_no = current_no + 1;
                }

                emitter.emit('evt.user.setting.update.max_automation', {
                    idOwner: idOwner,
                    current_auto_no: current_auto_no,
                    callback: function(err, result){
                        if(err){
                            console.error(err, 'biz_rule.automation.update_max_fail');
                        }
                    }
                });
            }
            
            cache.removeCache(idOwner, "automation", (errsave) => {
                if(errsave){
                    console.error(errsave, 'biz_rule.automation.remove_cache_fail');
                }
            });
            /*if(automation.is_active){
                rbSender(config.rabbit.sender.exchange.batch, {
                    topic: 'izi-core-edit-filter-ticket',
                    payload: {
                        automation_id: automation._id,
                        filter: enums.FilterTicket.automation,
                        user: req.user
                    }
                });
            } else {
                rbSender(config.rabbit.sender.exchange.batch, {
                    topic: 'izi-core-remove-filter-ticket',
                    payload: {
                        automation_id: automation._id,
                        filter: enums.FilterTicket.automation,
                        user: req.user
                    }
                });
            }*/
            res.json(automation);
        });
    }
];

/**
 * reoder automation author: khanhpq
 */
exports.reorder = (req, res, next) => {
    biz_utils.bizSort(true, Automation, "automation", Utils.getParentUserId(req.user), req.params.biz_id_from, req.params.biz_id_to, function(err){
        
        if(err){
            return next(err);
        }
        
        res.json({
            message: "biz_rule.automation.reorder_success"
        });
    });
};

/**
 * logically delete the current automation author : khanhpq
 */
exports.delete = (req, res, next) => {
    var automation = req.automation,
        current_no = ((((req.user.settings.features || {}).productivity || {}).automations || {}).current_no || 0),
        idOwner = Utils.getParentUserId(req.user);
    
    automation.remove(function (err) {
        if (err) {
            return next(err);
        }
        
        if(automation.is_active){
            emitter.emit('evt.user.setting.update.max_automation', {
                idOwner: idOwner,
                current_auto_no: current_no == 0 ? 0 : (current_no - 1),
                callback: function(err, result){
                    if(err){
                        console.error(err, 'biz_rule.automation.update_max_fail');
                    }
                    var update = {productivity:{automations:{current_no: current_no - 1}}};
                    req.user.settings.features = req.user.settings.features || {};
                    req.user.settings.features = _.assign(req.user.settings.features, update);
                }
            });
        }

        cache.removeCache(idOwner, "automation", (errsave) => {
            if(errsave){
                console.error(errsave, 'biz_rule.automation.remove_max_fail');
            }
        });
        res.json({is_succes: true});
    });
};

/**
 * remove all auto inactive author : khanhpq
 */
exports.deleteInactive = (req, res, next) => {
    var idOwner = Utils.getParentUserId(req.user),
        tasks = [];
    
    Automation.find({
        ed_user_id: idOwner,
        is_active: false
    }).exec((err, arr_auto) =>{
        if(err){
            return next(err);
        }
        
        arr_auto.forEach((auto) => {
            var promise = new Promise((resolve, reject) => {
                auto.remove(function (err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
            tasks.push(promise);
        });

        Promise.all(tasks).then(function(autos) {
            cache.removeCache(idOwner, "automation", (errsave) => {
                if(errsave){
                    console.error(errsave, 'biz_rule.automation.remove_cache_fail');
                }
            });
            
            res.json({is_succes: true});

        }, function(reason) {
            return next(reason);
        });
         
    });
};

/*
 * Count all automations @author: khanhpq
 */
exports.count = function (req, res, next) {
    var idOwner = Utils.getParentUserId(req.user);
    
    new Promise(function(resolve, reject) {
        Automation.count({
            ed_user_id: idOwner,
            is_active: true
        }, function (err, count) {
            if (err) {
                return reject(new TypeError('biz_rule.automation.update_max_fail'));
            }
            resolve(count);
        });
            
    }).then(function(count_active) {

        return new Promise(function(resolve, reject) {
            Automation.count({
                ed_user_id: idOwner,
                is_active: false
            }, function (err, count) {
                if (err) {
                    return reject(new TypeError('biz_rule.automation.update_max_fail'));
                }
                res.json({count_inactive: count, count_active: count_active});
            });
        });
        
    }, function(reason) {
        next(reason);
    });
};


/*
 * Get all automations @author: khanhpq
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
            skip: req.query.skip,
            sort_order: req.query.sort_order,
            limit: req.query.limit || config.paging.limit
        };

    // Sort by
    if (req.params.auto_sort_by) {
        params.sort = sort_by_arr[req.params.auto_sort_by] != undefined ? req.params.auto_sort_by : 'position';
        params.sort_order = sort_by_arr[req.params.auto_sort_by] || 1;
    }
    
    Utils.findByQuery(Automation, params).exec(function (err, automations) {
        if (err) {
            return next(err);
        }
        res.json(automations);
    });
};

/**
 * automation middleware
 */
exports.automationByID = (req, res, next, id) => {

    // check the validity of automation id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('biz_rule.automation.id_notfound'));
    }

    var idOwner = Utils.getParentUserId(req.user);
    // find automation by its id
    Automation.findById(id).exec((err, automation) => {
        if (err){
            return next(err);
        }
        if (!automation || !_.isEqual(automation.ed_user_id, idOwner)) {
            return next(new TypeError('biz_rule.automation.id_notfound'));
        }
        req.automation = automation;
        next();
    });
};

/**
 * middleware author-: khanhpq
 */
exports.position_valid = (req, res, next, position) => {
    /*
     * if(!/^[0-9]+$/.test(position)){ return next(new
     * TypeError('biz.postion.must_is_integer')); }
     */
    
    if (!mongoose.Types.ObjectId.isValid(req.params.biz_id_from)) {
        return next(new TypeError('biz_rule.automation.invalid_position'));
    }
    
    if (!mongoose.Types.ObjectId.isValid(req.params.biz_id_to)) {
        return next(new TypeError('biz_rule.automation.invalid_position'));
    }
    next();
};
