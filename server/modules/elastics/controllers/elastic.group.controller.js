'use strict';
//
//  ticket comment.controller.js
//  handle core system routes
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    Group = mongoose.model('Group'),
    utils = require('../resources/utils'),
    client = require(path.resolve('./config/lib/elasticsearch'));

var runUpdate = (data) =>{
    var query = {
        _id: mongoose.Types.ObjectId(data.o2._id)
    };
    runGroup(query, (err, result) =>{
        if(err){
            console.error(err, 'update user to elastics error');
            return;
        }
        if(!result){
            return;
        }
        if(!result.ed_user_id == undefined){
            return;
        }
        var update_group_id = {
            index: `ticket-${result.ed_user_id}`,
            body: {
                "query": {
                    "term": {
                        "group_id._id" : `${result._id}`
                    }
                },
                "script": {
                    "inline" : `ctx._source.group_id = params.group_id`,
                    "params": {
                        group_id: {
                            "name": result.name,
                            "_id": result._id
                        }
                    },
                    "lang": "painless"
                }
            }
        };
        utils.sendUpdateByQuery(update_group_id);
        return;
    });
}

var runGroup = (query, handler) =>{
    var stage = [],
        stage1 = {
            $match: query
        },
        stage2 = {
            $project: {
                "add_time": 1,
                "ed_user_id": 1,
                "name": 1,
                "provider": 1,
                "provider_data": 1,
                "upd_time": 1
            }
        },
        stage3 = {
            $lookup: {
                "from": config.dbTablePrefix.concat("group_user"),
                "localField": "_id",
                "foreignField": "group_id",
                "as": "group_user_docs"
            }
        },
        stage4 = {
            $project: {
                "add_time": 1,
                "ed_user_id": 1,
                "name": 1,
                "provider": 1,
                "provider_data": 1,
                "upd_time": 1,
                "user_ids": "$group_user_docs.user_id"
            }
        },
        stage5 = {
            $lookup: {
                "from": config.dbTablePrefix.concat("user"),
                "localField": "user_ids",
                "foreignField": "_id",
                "as": "user_docs"
            }
        },
        stage6 = {
            $project: {
                "add_time": 1,
                "ed_user_id": 1,
                "name": 1,
                "provider": 1,
                "provider_data": 1,
                "upd_time": 1,
                "users": "$user_docs"
            }
        }
    stage = [stage1, stage2, stage3, stage4, stage5, stage6];
    var cursor = Group.aggregate(stage).limit(2001).cursor({ batchSize : 1000 }).exec();
    var array_group = [],
        total_group = 0,
        count = 0,
        total_group_undefined = 0;
    cursor.each((error, doc) =>{
        if(error){
            if(handler){
                return handler(error);
            }
            console.error(error, 'Group aggregate error');
            return;
        }
        if(doc == null){
            if(handler){
                return handler(null, doc);
            }
            utils.sendElastics(array_group);
            console.log("count send", count);
            console.log("count send", total_group);
            console.log("count group undefined", total_group_undefined);
            console.log("finish");
            return;
        }
        if(doc.ed_user_id != undefined){
            if(handler){
                return handler(null, doc);
            }
            var data = {
                create: {
                    _index: `profile-${doc.ed_user_id}`,
                    _type: 'group',
                    _id: doc._id
                }
            };
            array_group.push(data);
            delete doc._id;
            array_group.push(doc);
            count++;
            total_group++;
        } else {
            if(handler){
                return handler(null, null);
            }
            total_group_undefined++;
            console.log("group undefined", JSON.stringify(doc));
        }
        if(count == 5000){
            console.log("count send", count);
            console.log("count send", total_group);
            utils.sendElastics(array_group);
            count = 0;
            array_group = [];
        }
    });
};

exports.execGroup = (req, res, next) =>{
    var params = {
        query: {}
    };
    runGroup(params.query);
    res.json({});
};

exports.syncElasticGroup = (data) =>{
    if(data.op == 'i'){
        var query = {
            _id: mongoose.Types.ObjectId(data.o._id)
        };
        runGroup(query, (err, result) =>{
            if(err){
                console.error(err, 'sync insert group elastic error');
                return;
            }
            if(!result){
                return;
            }
            var insert_elastic = {
                index: `profile-${result.ed_user_id}`,
                type: 'group',
                id: `${result._id}`
            };
            delete result._id;
            insert_elastic.body = result;
            utils.sendCreated(insert_elastic);
            return;
        });
    } else if(data.op == 'u'){
        var query = {
            _id: mongoose.Types.ObjectId(data.o2._id)
        };
        var data_update = (data.o['$set'] || {});
        if(data_update['name']){
            runUpdate(data);
        }
        runGroup(query, (err, result) =>{
            if(err){
                console.error(err, 'sync update group elastic error');
                return;
            }
            if(!result){
                return;
            }
            var update_elastic = {
                index: `profile-${result.ed_user_id}`,
                type: 'group',
                id: `${result._id}`
            };
            delete result._id;
            update_elastic.body = {
                doc: result
            };
            update_elastic.retryOnConflict = 2;
            utils.sendUpdated(update_elastic);
            return;
        });
    } else {
        var delete_elastic = {
            index: `profile-index`,
            type: 'group',
            id: `${data.o._id}`
        };
        utils.sendDelete(delete_elastic);
        return;
    }
};

exports.syncElasticGroupUser = (data) =>{
    if(data.op == 'i'){
        var query = {
            _id: mongoose.Types.ObjectId(data.o.group_id)
        };
        runGroup(query, (err, result) =>{
            if(err){
                console.error(err, 'sync insert group user elastic error');
                return;
            }
            if(!result){
                return;
            }
            var insert_elastic = {
                index: `profile-${result.ed_user_id}`,
                type: 'group',
                id: `${result._id}`
            };
            delete result._id;
            insert_elastic.body = {
                doc: result
            };
            utils.sendUpdated(insert_elastic);
            return;
        });
    } else if(data.op == 'u'){
        return;
    } else {
        return;
    }
}
