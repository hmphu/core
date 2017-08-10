
'use strict';
//
//  people.group.controller.js
//  handle core system routes
//
//  Created by khanhpq on 2016-01-06.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _            = require('lodash'),
    path         = require('path'),
    emitter      = require(path.resolve('./config/lib/emitters/event.emitter')),
    mongoose     = require('mongoose'),
    Utils        = require('../../core/resources/utils'),
    utilsElastics = require('../../elastics/resources/utils'),
    path         = require('path'),
    config       = require(path.resolve('./config/config')),
    GroupUser    = mongoose.model('GroupUser'),
    Group        = mongoose.model('Group');

/**
 * add a new group
 * author : khanhpq
 */
exports.add = (req, res, next) =>{
    req.body.name = _.trim(req.body.name);
    var group = new Group(req.body);
    group.ed_user_id = Utils.getParentUserId(req.user);
    
    group.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(group);
    });
};

/**
 * show current group
 * author : khanhpq
 */
exports.read = (req, res) => {
    res.json(req.group);
};

/**
 * update the current group
 * author : khanhpq
 */
exports.update = (req, res, next) => {
    delete req.body.__v;
    var group = req.group;
    group.name = _.trim(group.name);
    
    // Merge existing group
    group = _.assign(group, req.body);
    
    group.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(group);
    });
};

/**
 * logically delete the current group
 * author : khanhpq
 */
exports.delete = (req, res, next) => {
    var group = req.group,
        idOwner = Utils.getParentUserId(req.user),
        group_elastics = req.group.toObject();
    
    //check have any groups default
    GroupUser.count({
        ed_user_id: idOwner,
        group_id: group._id,
        is_default: true
    }, function(err, result) {
        if (err) {
            return next(err);
        }
        
        if(result > 0){
            return next(new TypeError('people.group.has_group_is_default'));
        }
        // sync to elastics when delete group
        utilsElastics.sendDelete({
            index: `profile-${idOwner}`,
            type: 'group',
            id: `${group_elastics._id}`
        });
        //remove group
        group.remove(function (err) {
            if (err) {
                return next(err);
            }
            //remove all group_user
            GroupUser.find({group_id: group._id}, (err, group_users) => {
                if(err){
                    return next(err);
                }
                var tasks = [];
                group_users.forEach((group_users) => {
                    var promise = new Promise((resolve, reject) => {
                        group_users.remove(function (err) {
                            if (err) {
                                return reject(err);
                            }
                            emitter.emit('evt.group_user.mongo-people-online', {
                                ed_user_id: idOwner,
                                group_id: group_users.group_id,
                                user_id: group_users.user_id,
                                type: "remove_group"
                            });
                            resolve();
                        });
                    });
                    tasks.push(promise);
                });
                
                Promise.all(tasks).then(function(count) {
                    res.json({is_success: true});
                }, function(reason) {
                    return next(reason);
                });
            });
        });
    });
};

exports.count = function (req, res, next) {

    new Promise(function(resolve, reject) {
        var stage = [{
            $match: {
                ed_user_id: Utils.getParentUserId(req.user)
            }
        },{
            $project: {
                user_id: 1,
                group_id: 1,
                ed_user_id: 1
            }
        },{
            $lookup: {
                "from": config.dbTablePrefix.concat('user'),
                "localField": "user_id",
                "foreignField": "_id",
                "as": "group_user_data"
            }
        },{
            $unwind: "$group_user_data"
        },{
            $project: {
                user_id: 1,
                group_id: 1,
                ed_user_id: 1,
                user_name: "$group_user_data.name",
                user_is_suspended: "$group_user_data.is_suspended"
            }
        }];
        
        GroupUser.aggregate(stage).exec((err, result) => {
            if (err) {
                return reject(err);
            }
            return resolve(result);
        });    
    }).then(function(group_user) {
        return new Promise(function(resolve, reject) {
            Group.find({
                ed_user_id: Utils.getParentUserId(req.user)
            })
            .select("_id name")
            .exec((err, groups) =>{
                if(err){
                    return next(err);
                }
                var result = {
                    group_count: groups.length,
                    groups: []
                };
                groups.forEach((group) => {
                    var count = _.countBy(group_user, function(o){
                        return o.group_id.toString() == group._id.toString() && o.user_is_suspended == false});
                    result.groups.push({
                        _id: group._id,
                        name: group.name,
                        user_count: count.true || 0
                    });
                });
                return res.json(result);
            });
        });
        
    }, function(reason) {
        next(reason);
    });
};

/*
    Get all group
    @author: khanhpq
 */
exports.list = function (req, res, next) {
    var params = {
        query: {
            ed_user_id: Utils.getParentUserId(req.user)
        },
        skip: req.query.skip,
        sort_order: req.query.sort_order || 1,
        limit: req.query.limit || 9999999,
        sort: req.query.sort || "add_time"
    };

    if(req.query.name){
        if (Utils.isValidObjectId(req.query.name)) {
            params.query._id = req.query.name;
        }else{
            params.query.name = new RegExp(decodeURI(req.query.name), "i");
        }   
    }
    
    Utils.findByQuery(Group, params).exec(function (err, group) {
        if (err) {
            return next(err);
        }
        res.json(group);
    });
};

/*
  Group find one by id
  @author: vupl
  */
exports.findOneById = (group_id, next) =>{
    Group.findById(group_id).exec((err, group) =>{
        if(err){
            return next(err);
        }
        return next(null, group);
    });
};

/**
 * groupByID middleware
 * author: khanhpq
 */
exports.groupByID = (req, res, next, id) => {

    // check the validity of group id
    if (!mongoose.Types.ObjectId.isValid(id.toString())) {
        return next(new TypeError('people.group.id.objectId'));
    }

    var idOwner = Utils.getParentUserId(req.user);
    // find group by its id
    
    Group.findById(id).exec((err, group) => {
        if (err){
            return next(err);
        }
        //Check is owner
        if (!group || !_.isEqual(group.ed_user_id, idOwner)) {
            return next(new TypeError('people.group.id.notFound'));
        }

        req.group = group;
        next();
    });
};
