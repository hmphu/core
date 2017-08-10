'use strict';
//
//  group.user.controller.js
//  handle core system routes
//
//  Created by khanhpq on 2016-01-06.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    enumsCore = require('../../core/resources/enums.res'),
    Utils = require('../../core/resources/utils'),
    GroupUser = mongoose.model('GroupUser'),
    Group = mongoose.model('Group'),
    User = mongoose.model('User');

/**
 *
 * author : khanhpq
 */
exports.add = [
    (req, res, next) => {

        var arr_group_user = req.body.ids,
            idOwner = Utils.getParentUserId(req.user);

        if (!req.body || !Array.isArray(arr_group_user)) {
            return next(new TypeError('people.group.user.invalid'));
        }
        
        for(var i = 0; i < arr_group_user.length; i++){
            if (!mongoose.Types.ObjectId.isValid(arr_group_user[i])) {
                return next(new TypeError('people.user.id.objectId'));
            }            
        }

        User.count({
            $or: [{
                ed_parent_id: idOwner
            },{
                _id: idOwner
            }],
            is_suspended: false,
            roles: {
                $nin: ["requester"]
            },
            _id: {
                $in: arr_group_user
            }
        }, function (err, count) {
            if (err) {
                return next(err);
            }

            if (count != arr_group_user.length) {
                return next(new TypeError('people.group.user.arr_user.invalid'));
            }
            next();
        });
    },
    (req, res, next) => {

        if (!mongoose.Types.ObjectId.isValid(req.params.groupId)) {
            return next(new TypeError('people.group.id.objectId'));
        }

        var group_id = req.params.groupId,
            arr_group_user = req.body.ids,
            idOwner = Utils.getParentUserId(req.user),
            tasks = [];

        arr_group_user.forEach((userId) => {
            var promise = new Promise((resolve, reject) => {

                var group_user = new GroupUser({
                    ed_user_id: idOwner,
                    group_id: group_id,
                    user_id: userId
                });

                group_user.save((err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
            tasks.push(promise);
        });

        Promise.all(tasks).then(function (values) {
            res.json({
                message: "people.group.user.save.success"
            });
        }, function (reason) {
            next(reason);
        });
    }
];

/**
 *
 * author : khanhpq
 * this function is only for update is_default 
 */
exports.update = [
    (req, res, next) => {

        GroupUser.count({
            ed_user_id: Utils.getParentUserId(req.user),
            user_id: req.params.userId,
            group_id: req.params.groupId
        }, function (err, count) {
            if (err) {
                return next(err);
            }

            if (count <= 0) {
                return next(new TypeError('people.group.user.not_found_userId_groupId'));
            }
            next();
        });
    },
    (req, res, next) => {

        if (!mongoose.Types.ObjectId.isValid(req.params.groupId)) {
            return next(new TypeError('people.group.id.objectId'));
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return next(new TypeError('people.user.id.objectId'));
        }
        //Checked group_id and user_id at middleware
        var group_member = {
            ed_user_id: Utils.getParentUserId(req.user),
            group_id: req.params.groupId,
            user_id: req.params.userId,
            is_default: true
        };

        GroupUser.update({
            ed_user_id: group_member.ed_user_id,
            user_id: group_member.user_id
        }, {
            is_default: false,
            upd_time: +moment.utc()
        }, {
            multi: true
        }, function (err, result) {

            if (err) {
                return next(err);
            }
            if (!result || !result.n) {
                return next(new TypeError('people.user.id.notfound'));
            }

            GroupUser.update({
                ed_user_id: group_member.ed_user_id,
                user_id: group_member.user_id,
                group_id: group_member.group_id
            }, {
                is_default: true,
                upd_time: +moment.utc()
            }, function (err, result) {

                if (err) {
                    return next(err);
                }
                if (!result || !result.n) {
                    return next(new TypeError('people.group.id.notfound'));
                }

                res.json({
                    user_id: group_member.user_id,
                    group_id: group_member.group_id,
                    is_default: true
                });
            });
        });
    }
];

/**
 *
 * author : khanhpq
 */
exports.delete = (req, res, next) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.groupId)) {
        return next(new TypeError('people.group.id.objectId'));
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
        return next(new TypeError('people.user.id.objectId'));
    }

    var query = {
        ed_user_id: Utils.getParentUserId(req.user),
        group_id: req.params.groupId,
        user_id: req.params.userId
    };
    
    // check is default group and exist
    GroupUser.findOne(query, (err, group_user) => {
        if (err) {
            return next(err);
        }

        if (!group_user) {
            return next(new TypeError('people.group.user.not_exist'));
        }

        if (group_user.is_default) {
            return next(new TypeError('people.group.user.group_default'));
        }
        
       GroupUser.remove(query).exec((errRemove)=>{
            if(errRemove){
                return next(err);
            }

            query.type = "remove_group_user";
            emitter.emit('evt.group_user.mongo-people-online', query);
           
            res.json({
                is_succes: true
            });
        });
    });
};

/**
 *
 * author : khanhpq
 */
exports.list = function (req, res, next) {
    if (!mongoose.Types.ObjectId.isValid(req.params.groupId)) {
        return next(new TypeError('people.group.id.objectId'));
    }

    var params = {
        query: {
            ed_user_id: Utils.getParentUserId(req.user),
            group_id: req.params.groupId,
            $or: [{
                is_suspended: false
            },{
                is_suspended: undefined
            }]
        },
        sort: 'add_time',
        select: '-ed_user_id',
        skip: req.query.skip,
        sort_order: req.query.sort_order,
        limit: req.query.limit || 9999999
    };

    Utils.findByQuery(GroupUser, params).exec(function (err, groupUsers) {
        if (err) {
            return next(err);
        }
        res.json(groupUsers);
    });
};

/**
 *
 * author : khanhpq
 */
exports.listGroupAgent = function (req, res, next) {
    var idOwner = Utils.getParentUserId(req.user),
        query = {
        ed_user_id: Utils.getParentUserId(req.user)
    },
        user_name = req.query.user_name,
        is_search_group = false,
        is_search_agent = req.query.is_search_agent == 1 ? true : false;
    
    if(req.query.text_search){
        is_search_group = true;
        user_name = req.query.text_search;
    }
    
    if(req.query.group_id && Utils.isValidObjectId(req.query.group_id)){
        query._id = req.query.group_id;
    }
    
    Group.find(query)
    .select("_id name")
    .exec((err, groups) =>{
        var arr = _.map(groups, '_id');
        if(err){
            return next(err);
        }
        
        var user_query = null,
            stage = [
            {
                $match: {
                     group_id: {
                         $in : arr
                     }
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
            }];
        
        if(user_name != undefined){
            if(user_name != '' && Utils.isValidObjectId(user_name)){
                user_query = {
                    "group_user_data._id": mongoose.Types.ObjectId(user_name),
                    "group_user_data.is_suspended": false
                };
            } else {
                user_query = {
                    //"group_user_data.name": new RegExp(user_name || "", "i"),
                    "group_user_data.name": new RegExp(Utils.escapeRegExp(decodeURI(user_name)), "i"),
                    //"group_user_data.name": new RegExp('\\' + decodeURI(user_name) || "", 'i'),
                    "group_user_data.is_suspended": false
                };
            }
            
            stage = _.concat(stage, [{
                $unwind: "$group_user_data"
            },{
                $match: user_query
            },{
                $project: {
                    user_id: 1,
                    group_id: 1,
                    ed_user_id: 1,
                    roles: "$group_user_data.roles",
                    user_name: "$group_user_data.name",
                    user_is_suspended: "$group_user_data.is_suspended"
                }
            }]);
        }else{
            stage = _.concat(stage, [{
                $unwind: "$group_user_data"
            },{
                $match: {
                    "group_user_data.is_suspended": false
                }
            },{
                $project: {
                    user_id: 1,
                    group_id: 1,
                    ed_user_id: 1,
                    roles: "$group_user_data.roles",
                    user_name: "$group_user_data.name",
                    user_is_suspended: "$group_user_data.is_suspended"
                }
            }]);
        }
        
        GroupUser.aggregate(stage).exec((err, groupUsers) => {
            if (err) {
                return next(err);
            }
            arr = [];
           
            if(user_name != undefined){
                groups.forEach(function(g){
                    var item = {
                        _id: g._id,
                        group_name: g.name,
                        users: []
                    };

                    (_.groupBy(groupUsers, {group_id: g._id}).true || []).forEach(function(u){
                        if(_.isEqual(u.group_id, g._id)){
                            item.users.push({
                                _id: u.user_id,
                                name: u.user_name || "",
                                roles: u.roles
                            });
                        }
                    });

                    if(!is_search_group){
                        if(item.users.length > 0){
                            arr.push(item);
                        }
                    }else{
                        var re = new RegExp(Utils.escapeRegExp(decodeURI(user_name || "")), "i");
                        if(re.test(item.group_name)){
                            arr.push(item);
                        }else{
                            if(item.users.length > 0){
                                arr.push(item);
                            }
                        }
                    }
                });
            }else{
                groups.forEach(function(g){
                    var item = {
                        _id: g._id,
                        group_name: g.name,
                        users: []
                    };
                    groupUsers.forEach(function(u){
                        if(_.isEqual(u.group_id, g._id)){
                            item.users.push({
                                _id: u.user_id,
                                user_id: u.user_id,
                                name: u.user_name || "",
                                roles: u.roles
                            });
                        }
                    });
                    arr.push(item);
                });
            }

            if(is_search_agent){
                res.json(arr[0] != null ? arr[0].users : []);
            }else{
                res.json(arr);
            }
        });
    });
    
};

/**
 *
 * author : khanhpq
 */
exports.listUser = function (req, res, next) {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
        return next(new TypeError('people.user.id.objectId'));
    }

    var params = {
        query: {
            ed_user_id: Utils.getParentUserId(req.user),
            user_id: req.params.userId
        },
        populate: {
            include: 'group_id',
            fields: '-ed_user_id'
        },
        sort: 'add_time',
        select: '-ed_user_id',
        skip: req.query.skip,
        sort_order: req.query.sort_order,
        limit: req.query.limit || 9999999
    };
    
    if(req.query.is_default){
        params.query.is_default = true;
    }

    Utils.findByQuery(GroupUser, params).exec(function (err, groupUsers) {
        if (err) {
            return next(err);
        }
        
        var arr = [];
        groupUsers.forEach(function(item){
            arr[arr.length] = {
                _id: item._id,
                group_id: item.group_id._id,
                group_name: item.group_id.name,
                user_id: item.user_id,
                is_default: item.is_default
            }; 
        });
        res.json(arr);
    });
};

/**
 * find group user with ed_user_id & user_id
 * author : vupl
 */
exports.findGroupUser = (idOwner, agent_id, next) => {
    var query = {
        ed_user_id: idOwner,
        user_id: agent_id,
        is_default: true
    };

    GroupUser.findOne(query, (err, result) => {
        if (err) {
            return next(err);
        }
        return next(null, result);
    });
}

/**
 * find group user with ed_user_id & user_id
 * author : vupl
 */
exports.findUserInGroup = (idOwner, group_id, user_id, next) => {
    var query = {
        ed_user_id: idOwner,
        user_id: user_id,
        group_id: group_id
    };

    GroupUser.findOne(query, (err, result) => {
        if (err) {
            return next(err);
        }
        return next(null, result);
    })
}

exports.getGroupIdOfUser = (idOwner, agent_id, next) => {
    GroupUser.find({
        ed_user_id: idOwner,
        user_id: agent_id
    })
    .select("group_id")
    .exec((err, groups) =>{
        if (err) {
            return next(err);
        }
        
        var groups_id = [];
        
        (groups || []).forEach((o) => {
            groups_id.push(o.group_id);
        });
        return next(null, groups_id);
    });
};

//find agent and group of this agent
exports.getUserAndGroupFromEmail = (idOwner, agent_email, next) => {
    User.findOne({
        $or: [
            {_id: idOwner},
            {ed_parent_id: idOwner}
        ],
        email: agent_email,
        roles: {
            $in: [enumsCore.UserRoles.owner, enumsCore.UserRoles.admin, enumsCore.UserRoles.agent]
        },
        is_suspended : false
    }).exec((err, agent) =>{
        if(err){
            return next(err);
        }
        
        if(!agent){
            return next(null, null);
        }
        this.findGroupUser(idOwner, agent._id, function(err, group_user){
            if(err){
                return next(err);
            }
            
            next(null, {
                agent: agent,
                group_user: group_user
            });
        });
    });
};