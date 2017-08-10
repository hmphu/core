'use strict';
//
// view.controller.js
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
    View = mongoose.model('ViewTicket'),
    Group = mongoose.model('Group'),
    translation  = require('../resources/translate.res'),
    biz_utils = require('../resources/utils'),
    cache = require(path.resolve('./config/lib/redis.cache')),
    fitlerViewControllerV2 = require('../../filter/controllers/filter.ticket_view.v2.controller'),
    socketIO = require(path.resolve('./config/lib/socket.io')),
    Utils = require('../../core/resources/utils');


var setTicketFieldCond = function(conds){
    conds.forEach(o => {
        if(o.master && o.master.values){
            o.ticket_field_type = o.master.values.type;
        }
    });
    return conds;
}

/**
 * add a new view author : khanhpq
 */
exports.add = [
    (req, res, next) => {
        View.findOne({
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
        var idOwner = Utils.getParentUserId(req.user);
        
        req.body.deactive = false;
        req.body.is_active = true;
        req.body.ed_user_id = idOwner;
        req.body.user_id = req.user._id;

        if(req.user.roles[0] == 'agent'){
            req.body.availability = enums.Availability.Only_me;
            delete req.body.group_id;
        }

        if(req.body.availability != enums.Availability.Group){
            delete req.body.group_id;
        }
        
        if(req.body.any_conditions){
            req.body.any_conditions = setTicketFieldCond(req.body.any_conditions);
        }
        
        if(req.body.all_conditions){
            req.body.all_conditions = setTicketFieldCond(req.body.all_conditions);
        }
        
        req.body = biz_utils.removeEmptyCond(req.body);
        var view = new View(req.body);
        
        view.save((err) => {
            if (err) {
                return next(err);
            }
            
            cache.removeCache(idOwner, "view_ticket", (errsave) => {
                if(errsave){
                    console.error(errsave, 'biz_rule.view_ticket.remove_cache_fail');
                }
            });
            
            socketIO.emit('/core', idOwner, {
                topic : 'izi-ticket-view-v2',
                payload : {
                    view: view
                }
            });
            res.json(view);
        });
    }
];

/**
 * clone view author : khanhpq
 */
exports.clone = (req, res, next) => {

    if(req.user.roles[0] == enums.UserRoles.agent && req.view.availability != enums.Availability.Only_me){
        return next(new TypeError('biz_rule.view.cannot_clone'));
    }
    
    req.view.name += "_" + translation[req.user.language || "en"].clone;
    res.json(req.view);
};

/**
 * show current view author : khanhpq
 */
exports.read = (req, res) => {
    res.json(req.view);
};

/**
 * update the current view author : khanhpq
 */
exports.update = (req, res, next) => {
    var view = req.view,
        idOwner = Utils.getParentUserId(req.user);

    if(!req.body){
        return next(new TypeError('biz_rule.view.update_fail'));
    }
    delete req.body.position;
    delete req.body.ed_user_id;
    delete req.body.user_id;
    req.body = biz_utils.removeEmptyCond(req.body);
    
    if(req.body.any_conditions){
        req.body.any_conditions = setTicketFieldCond(req.body.any_conditions);
    }

    if(req.body.all_conditions){
        req.body.all_conditions = setTicketFieldCond(req.body.all_conditions);
    }
    
    // Merge existing view
    view = _.assign(view, req.body);
    
    if(req.body.all_conditions || req.body.any_conditions){
        view.all_conditions = [];
        view.any_conditions = [];

        req.body.all_conditions.forEach(item => { view.all_conditions.push(item); })
        req.body.any_conditions.forEach(item => { view.any_conditions.push(item); })
    }

    if(view.availability != enums.Availability.Group){
        view.group_id = undefined;
    }
        
    view.save((err) => {
        if (err) {
            return next(err);
        }

        cache.removeCache(idOwner, "view_ticket", (errsave) => {
            if(errsave){
                console.error(errsave, 'biz_rule.view.remove_cache_fail');
            }
        });

        socketIO.emit('/core', idOwner, {
            topic : 'izi-ticket-view-v2',
            payload : {
                view: view
            }
        });
        res.json(view);
    });
};

/**
 * reoder view author : khanhpq
 */
exports.reorder = (req, res, next) => {
    biz_utils.bizSort( false, View, "view_ticket", Utils.getParentUserId(req.user), req.params.biz_id_from, req.params.biz_id_to, function(err){
        if(err){
            return next(err);
        }
        
        res.json({
            message: "biz_rule.view.reorder_success"
        });
    });
};

/**
 * all view inactive author : khanhpq
 */
exports.deleteInactive = (req, res, next) => {
     biz_utils.getBizSettingByAvailability({
            name: "view.ticket",
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
        View.find(result.query).select("_id").exec((err, views) =>{
           views.forEach((view) => {
               var promise = new Promise((resolve, reject) => {
                    view.remove(function (err) {
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    });
                });
                tasks.push(promise);
            });

            Promise.all(tasks).then(function(views) {

                res.json({is_success: true});

                cache.removeCache(idOwner, "view_ticket", (errsave) => {
                    if(errsave){
                        console.error(errsave, 'biz_rule.view.remove_cache_fail');
                    }
                });
            }, function(reason) {
                return next(reason);
            });
        });
     });
};

/**
 * logically delete the current view author : khanhpq
 */
exports.delete = (req, res, next) => {
    var view = req.view,
    idOwner = Utils.getParentUserId(req.user);
    
    if(req.user.roles[0] == enums.UserRoles.agent && view.availability != enums.Availability.Only_me){
        return next(new TypeError('biz_rule.view.delete_fail'));
    }
    
    view.remove(function (err) {
        if (err) {
            return next(err);
        }
        
        cache.removeCache(idOwner, "view_ticket", (errsave) => {
            if(errsave){
                console.error(errsave, 'biz_rule.view.remove_cache_fail');
            }
        });
        res.json({is_succes: true});
    });
};

/*
 * Get all views @author: khanhpq
 */
exports.list = function (req, res, next) {
    var sort_by_arr = {
        add_time: -1,
        upd_time: -1,
        position: 1
    },
        idOwner = Utils.getParentUserId(req.user);
    
    biz_utils.getBizSettingByAvailability({
            name: "view.ticket",
            _id: null ,
            active: {is_active: req.params.is_active == 1 ? true : false},
            is_only: req.params.isPersonal == 1 ? true : false,
            idOwner: idOwner, 
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
        },
            tasks = [];
                
        // Sort by
        if (req.params.sort_by) {
            params.sort = sort_by_arr[req.params.sort_by] != undefined ? req.params.sort_by : 'position';
            params.sort_order = sort_by_arr[req.params.sort_by] || 1;
        }

        Utils.findByQuery(View, params).exec(function (err, result_views) {
            var views = [];
            
            result_views.forEach((o) => {
                var promise = new Promise((resolve, reject) => {
                    var view = {
                        _id: o._id,
                        name: o.name,
                        availability: o.availability,
                        group_id: o.group_id,
                        user_id: o.user_id,
                        is_active: o.is_active,
                        position: o.position,
                        add_time: o.add_time,
                        upd_time: o.upd_time,
                        can_view: true
                    }

                    if(view.availability == enums.Availability.Group && result.user_groups.length > 0){
                        if(_.findIndex(result.user_groups, function(o) { return o == view.group_id.toString(); }) == -1){
                            view.can_view = false;
                        }
                    }
                    views.push(view);
                    resolve();
                });
                tasks.push(promise);
            });

            Promise.all(tasks).then(function(result) {
                res.json(views);

            }, function(reason) {
                if (err) {
                    return next(err);
                }
            });
        });
    });
};


/*
 * Get all view @author: khanhpq
 */
exports.list_all = function (req, res, next) {
    var tasks = [],
        idOwner = Utils.getParentUserId(req.user);
    biz_utils.getBizViewByAvailability({
        idOwner: idOwner,
        user_id: req.user._id,
        group_id: 0,
        role: req.user.roles[0]
    }, function(err, query){
        if (err) {
            return next(err);
        }
        var params = {
            query: query,
            select: '_id name availability order_by group_id user_id is_active position any_conditions all_conditions add_time upd_time ' + (req.query.is_action == '1' ? 'actions' : ''),
            skip: req.query.skip,
            sort: req.query.sort_by || "position",
            sort_order: 1,
            limit: req.query.limit || config.paging.limit
        };

        if(req.query.show_dashboard){
            params.query['$and'].push({
                show_dashboard: req.query.show_dashboard
            });
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
        
        Utils.findByQuery(View, params).exec(function (err, result_views) {
            if (err) {
                return next(err);
            }
            
            var views = [];
            result_views.forEach((o) => {
                var promise = new Promise((resolve, reject) => {
                    var view = o.toObject();
                    fitlerViewControllerV2.internalCount(req.user, view, (count) =>{
                        view.count = count;
                        views.push(view);
                        resolve();
                    });
                });
                tasks.push(promise);
            });
            Promise.all(tasks).then(function(result) {
                var tmp = _.groupBy(views, {availability: enums.Availability.Only_me});
                res.json({
                    share: _.orderBy(tmp.false, ['position'], ['asc']) || [],
                    only_me:  _.orderBy(tmp.true, ['position'], ['asc']) || []
                });
            }, function(reason) {
                if (err) {
                    return next(err);
                }
            });
        });
    });
};


/*
 * Count all views @author: khanhpq
 */
exports.count = function (req, res, next) {
    biz_utils.getBizSettingByAvailability({
            name: "view.ticket",
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
        
        View.count(result.query).exec((err, count) => {
            if (err){
                return next(err);
            }
            
            res.json({count: count});
        });
        
    });
};

/*
 * Count all views by group @author: khanhpq
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
                View.count({
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
/**
 * view middleware
 */
exports.viewTicketByID = (req, res, next, id) => {
    // check the validity of view id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('biz_rule.view.id_notfound'));
    }
    biz_utils.getBizSettingByAvailability({
        name: "view.ticket",
        _id: id,
        active: null,
        is_only: null, 
        idOwner: Utils.getParentUserId(req.user), 
        user_id: req.user._id,
        group_id: null,
        role: req.user.roles[0]
    }, function(err, result){
        if(err){
            return next(err);
        }
        View.findOne(result.query).exec((err, view) =>{
            if(err){
                return next(err);
            }
            if(!view){
                return next(new TypeError('biz_rule.view.id_notfound'));
            }
            
            if(req.user.roles[0] == enums.UserRoles.agent){
                if(view.availability != enums.Availability.Only_me){
                    return next(new TypeError('view.ticket.role.invalid'));
                }else{
                    delete req.body.availability;
                    delete req.body.group_id;
                }
            }
            
            req.view = view;
            next();
        });
    });
};
