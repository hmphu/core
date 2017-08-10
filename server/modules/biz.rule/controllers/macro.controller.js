'use strict';
//
// macro.controller.js
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
    translation  = require('../resources/translate.res'),
    mongoose = require('mongoose'),
    enums = require('../../core/resources/enums.res'),
    Macro = mongoose.model('Macro'),
    Group = mongoose.model('Group'),
    biz_utils = require('../resources/utils'),
    Utils = require('../../core/resources/utils');

/**
 * add a new macro author : khanhpq
 */
exports.add = [
    (req, res, next) => {
        Macro.findOne({
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

        req.body.deactive = false;
        req.body.is_active = true;
        req.body.ed_user_id = Utils.getParentUserId(req.user);
        req.body.user_id = req.user._id;
        
        if(req.user.roles[0] == 'agent'){
            req.body.availability = enums.Availability.Only_me;
            delete req.body.group_id;
        }
        
        if(req.body.availability != enums.Availability.Group){
            delete req.body.group_id;
        }
        req.body = biz_utils.removeEmptyCond(req.body);
        
        var macro = new Macro(req.body);
        
        macro.save((err) => {
            if (err) {
                return next(err);
            }
            res.json(macro);
        });
    }
];

/**
 * clone macro author : khanhpq
 */
exports.clone = (req, res, next) => {
    if(req.user.roles[0] == enums.UserRoles.agent && req.macro.availability != enums.Availability.Only_me){
        return next(new TypeError('biz_rule.macro.cannot_clone'));
    }
    
    req.macro.name += "_" + translation[req.user.language || "en"].clone;
    res.json(req.macro);
};

/**
 * show current macro author : khanhpq
 */
exports.read = (req, res) => {
    res.json(req.macro);
};

/**
 * update the current macro author : khanhpq
 */
exports.update = (req, res, next) => {
    var macro = req.macro;
    if(!req.body){
        return next(new TypeError('biz_rule.macro.update_fail'));
    }

    delete req.body.position;
    delete req.body.ed_user_id;
    delete req.body.user_id;
    req.body = biz_utils.removeEmptyCond(req.body);
    
    // Merge existing macro
    macro = _.assign(macro, req.body);      
    
    if(req.body.actions){        
        macro.actions = [];
        req.body.actions.forEach(item => { macro.actions.push(item); })
    }
    
    if(macro.availability != enums.Availability.Group){
        macro.group_id = undefined;
    }

    macro.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(macro);
    });
};

/**
 * reoder author : khanhpq
 */
exports.reorder = (req, res, next) => {
    biz_utils.bizSort( false, Macro, "macro", Utils.getParentUserId(req.user), req.params.biz_id_from, req.params.biz_id_to, function(err){
        if(err){
            return next(err);
        }
        
        res.json({
            message: "biz_rule.macro.reorder_success"
        });
    });
};

/**
 * remove all macro inactive author : khanhpq
 */
exports.deleteInactive = (req, res, next) => {

    biz_utils.getBizSettingByAvailability({
            name: "macro",
            _id: null ,
            active: {is_active: false} ,
            is_only: req.params.isPersonal == 1 ? true : false,
            idOwner: Utils.getParentUserId(req.user), 
            user_id: req.user._id,
            group_id: req.params.group_id,
            role: req.user.roles[0]
        }, function(err, result){

        if (err) {
            return next(err);
        }
        var tasks = [];
        Macro.find(result.query).select("_id").exec((err, macros) =>{
           macros.forEach((macro) => {
               var promise = new Promise((resolve, reject) => {
                    macro.remove(function (err) {
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    });
                });
                tasks.push(promise);
            });

            Promise.all(tasks).then(function(macros) {

                res.json({is_succes: true});

            }, function(reason) {
                return next(reason);
            }); 
            
        });
     });
};

/**
 * logically delete the current macro author : khanhpq
 */
exports.delete = (req, res, next) => {
    var macro = req.macro;
    
    if(req.user.roles[0] == enums.UserRoles.agent && macro.availability != enums.Availability.Only_me){
        return next(new TypeError('biz_rule.macro.delete_fail'));
    }
    
    macro.remove(function (err) {
        if (err) {
            return next(err);
        }
        res.json({is_succes: true});
    });
};

/*
 * Get all by is_only macros @author: khanhpq
 */
exports.list = function (req, res, next) {
    var sort_by_arr = {
        add_time: -1,
        upd_time: -1,
        position: 1
    };

    biz_utils.getBizSettingByAvailability({
            name: "macro",
            _id: null ,
            active: {is_active: req.params.is_active == 1 ? true : false} ,
            is_only: req.params.isPersonal == 1 ? true : false,
            idOwner: Utils.getParentUserId(req.user), 
            user_id: req.user._id,
            group_id: req.params.group_id,
            role: req.user.roles[0]
        }, function(err, result){
        
        if (err) {
            return next(err);
        }
        
        var params = {
            query: result.query,
            select: '_id name availability group_id user_id is_active position add_time upd_time',
            skip: req.query.skip,
            sort_order: req.query.sort_order,
            limit: req.query.limit || config.paging.limit
        };

        // Sort by
        if (req.params.sort_by) {
            params.sort = sort_by_arr[req.params.sort_by] != undefined ? req.params.sort_by : 'position';
            params.sort_order = sort_by_arr[req.params.sort_by] || 1;
        }

        if(req.query.name){
            if (Utils.isValidObjectId(req.query.name)) {
                params.query['$and'].push({
                    _id: req.query.name
                });
            }else{
                params.query['$and'].push({
                    name: new RegExp(decodeURI(req.query.name), "i")
                });
            }   
        }

        Utils.findByQuery(Macro, params).exec(function (err, macros) {
            if (err) {
                return next(err);
            }
            res.json(macros);
        });
    });
};

/*
 * Get all macros @author: khanhpq
 */
exports.list_all = function (req, res, next) {
    
    biz_utils.getBizViewByAvailability({
        idOwner: Utils.getParentUserId(req.user), 
        user_id: req.user._id,
        group_id: 0,
        role: req.user.roles[0]
    }, function(err, query){
        if (err) {
            return next(err);
        }
        var params = {
            query: query,
            select: '_id name availability group_id user_id is_active position add_time upd_time ' + (req.query.is_action == '1' ? 'actions' : ''),
            skip: req.query.skip,
            sort: "position",
            sort_order: 1,
            limit: req.query.limit || config.paging.limit
        };
        
        if(req.query.name){
            if (Utils.isValidObjectId(req.query.name)) {
                params.query['$and'].push({
                    _id: req.query.name
                });
            }else{
                params.query['$and'].push({
                    name: new RegExp(decodeURI(req.query.name), "i")
                });
            }   
        }

        Utils.findByQuery(Macro, params).exec(function (err, macros) {
            if (err) {
                return next(err);
            }
            var tmp = _.groupBy(macros, {availability: enums.Availability.Only_me});
            res.json(_.concat(tmp.false || [], tmp.true || []));
        });
    });
};

/*
 * Count all Macros @author: khanhpq
 */
exports.count = function (req, res, next) {
    var idOwner = Utils.getParentUserId(req.user);
    
    new Promise(function(resolve, reject) {
        biz_utils.getBizSettingByAvailability({
            name: "macro",
            _id: null ,
            active: {is_active: true} ,
            is_only: req.params.isPersonal == 1 ? true : false,
            idOwner: idOwner, 
            user_id: req.user._id,
            group_id: req.params.group_id,
            role: req.user.roles[0]
        }, function(err, result){
            if (err) {
                return reject(err);
            }
            Macro.count(result.query).exec((err, count) => {
                if (err){
                    return reject(err);
                }
                resolve(count)
            });
        });     
    }).then(function(count_active) {
        return new Promise(function(resolve, reject) {
            biz_utils.getBizSettingByAvailability({
                name: "macro",
                _id: null ,
                active: {is_active: false} ,
                is_only: req.params.isPersonal == 1 ? true : false,
                idOwner: idOwner, 
                user_id: req.user._id,
                group_id: req.params.group_id,
                role: req.user.roles[0]
            }, function(err, result){

                if (err) {
                    return reject(err);
                }
                Macro.count(result.query).exec((err, count) => {
                    if (err){
                        return reject(err);
                    }
                    res.json({count_inactive: count, count_active: count_active});
                });
            });
        });
        
    }, function(reason) {
        next(reason);
    });
};

/*
 * Count all Macro by group @author: khanhpq
 */
exports.countGroup = function (req, res, next) {
    Group.find({
        ed_user_id: Utils.getParentUserId(req.user)
    })
    .select("_id name")
    .exec((err, groups) =>{
        if(err){
            return next(err);
        }

        var tasks = [];
        groups.forEach((group) => {
            var promise = new Promise((resolve, reject) => {
                Macro.count({
                    group_id: group._id
                }).exec((err, count) => {
                    if (err){
                        return reject(err);
                    }

                    resolve({
                        _id: group._id,
                        name: group.name,
                        count: count
                    });
                });
            });
            tasks.push(promise);
        });

        Promise.all(tasks).then(function (result) {
            res.json(result);
        }, function (reason) {
            next(reason);
        });
    });
}

/*
 * Marco find by id author: vupl
 */
exports.findById_Internal = (macro_id , next) =>{
    Macro.findById(macro_id, (err, result) =>{
        if(err){
            return next(err);
        }
        return next(null, result);
    })
}

/**
 * macro middleware
 */
exports.macroByID = (req, res, next, id) => {

    // check the validity of macro id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('biz_rule.macro.id_notfound'));
    }
    
    var getMacro = null,
        is_setting = true;
    if(req.query.is_all == '1'){
        is_setting = false;
        getMacro = function(callback){
            biz_utils.getBizViewByAvailability({
                _id: id,
                idOwner: Utils.getParentUserId(req.user), 
                user_id: req.user._id,
                group_id: 0,
                role: req.user.roles[0]
            }, callback);
        };
    }else{
        getMacro = function(callback){
            biz_utils.getBizSettingByAvailability({
                name: "macro.user",
                _id: id,
                active: null,
                is_only: null, 
                idOwner: Utils.getParentUserId(req.user), 
                user_id: req.user._id,
                group_id: null,
                role: req.user.roles[0]
            }, callback);
        };
    }
 
    getMacro(function(err, result){
        if(err){
            return next(err);
        }
        Macro.findOne(result.query || result).exec((err, macro) =>{
            if(err){
                return next(err);
            }
            if(!macro){
                return next(new TypeError('biz_rule.macro.id_notfound'));
            }
            
            if(is_setting){
                if(req.user.roles[0] == enums.UserRoles.agent){
                    if(macro.availability != enums.Availability.Only_me){
                        return next(new TypeError('biz_rule.macro.id_notfound'));
                    }else{
                        delete req.body.availability;
                        delete req.body.group_id;
                    }
                }
            }
            
            req.macro = macro;
            next();
        });
    });
};

