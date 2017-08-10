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
    moment = require('moment'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Group = mongoose.model('Group'),
    enumsTicket = require('../../ticket/resources/enums'),
    utils = require('../resources/utils'),
    es_mapping = require('../resources/es_mapping'),
    client = require(path.resolve('./config/lib/elasticsearch'));

var syncMappingProfile = (data) =>{
    return new Promise ((resolve, reject) =>{
        let data_mapping = es_mapping.mapping_profile(data.aliases_profile);
        utils.sendElasticsCreatedIndex(data.index_profile, data_mapping, (err, result) =>{
            if(err){
                console.error(err, `error sync mapping data profile ${JSON.stringify(data)}`);
                resolve();
            }
            console.log("sync mapping profile", result);
            resolve();
        });
    });
}

var syncMappingTicket = (data, no_of_shards) =>{
    return new Promise ((resolve, reject) =>{
        let data_mapping = es_mapping.mapping_ticket(data.aliases_ticket, no_of_shards);
        utils.sendElasticsCreatedIndex(data.index_ticket, data_mapping, (err, result) =>{
            if(err){
                console.error(err, `error sync mapping data ticket ${JSON.stringify(data)}`);
                resolve();
            }
            console.log("sync mapping ticket", result);
            resolve();
        });
    });
}

var syncMappingTicketCmt = (data, no_of_shards) =>{
    return new Promise ((resolve, reject) =>{
        let data_mapping = es_mapping.mapping_ticket_cmt(data.aliases_ticket_cmt, no_of_shards);
        utils.sendElasticsCreatedIndex(data.index_ticket_cmt, data_mapping, (err, result) =>{
            if(err){
                console.error(err, `error sync mapping data ticket cmt ${JSON.stringify(data)}`);
                resolve();
            }
            console.log("sync mapping ticket cmt", result);
            resolve();
        });
    });
}

var createdNotSharedIndex = (data, next) =>{
    data.index_profile = `profile_${data._id}_v1`;
    data.index_ticket = `ticket_${data._id}_v1`;
    data.index_ticket_cmt = `ticket_cm_${data._id}_v1`;
    data.aliases_profile = {};
    data.aliases_profile[`profile-${data._id}`] = {};
    data.aliases_ticket = {};
    data.aliases_ticket[`ticket-${data._id}`] = {};
    data.aliases_ticket_cmt = {};
    data.aliases_ticket_cmt[`cmt-ticket-${data._id}`] = {};
    Promise.all([syncMappingProfile(data),
                syncMappingTicket(data, data.no_of_shards),
                syncMappingTicketCmt(data, data.no_of_shards)]).then(result =>{
        if(next){
            return next(null, result);
        }
        return;
    }).catch(err =>{
        console.error(err);
        if(next){
            return next(null, true);
        }
        return;
    })
}

var createdSharedIndex = (data, next) =>{
    var array_add = [];
    array_add.push(
        {
            "add": {
                "index": "ticket-index",
                "alias": `ticket-${data._id}`,
                "routing": `ticket-${data._id}`,
                "filter": {
                    "term": {
                        "ed_user_id": data._id
                    }
                }
            }
        },
        {
            "add": {
                "index": "cmt-ticket-index",
                "alias": `cmt-ticket-${data._id}`,
                "routing": `cmt-ticket-${data._id}`,
                "filter": {
                    "term": {
                        "ed_user_id": data._id
                    }
                }
            }
        },
        {
            "add": {
                "index": 'profile-index',
                "alias": `profile-${data._id}`,
                "routing": `profile-${data._id}`,
                "filter": {
                    "term": {
                        "ed_user_id": data._id
                    }
                }
            }
        }
    );
    utils.sendElasticsAlias(array_add, next);
};

exports.execAliasMapping = (req, res, next) =>{
    var stage = [
        {
            $match: {
                roles: {
                    $in: ['owner']
                }
            }
        }
    ];
    var cursor = User.aggregate(stage).cursor({ batchSize : 1000 }).exec();
    var count = 0,
        array_add = [];
    cursor.each((error, doc) =>{
        if(error){
            return;
        }
        if(doc == null){
            utils.sendElasticsAlias(array_add);
            console.log("count", count);
            return;
        }
        count++;
        array_add.push(
            {
                "add": {
                    "index": "ticket-index",
                    "alias": `ticket-${doc._id}`,
                    "routing": `ticket-${doc._id}`,
                    "filter": {
                        "term": {
                            "ed_user_id": doc._id
                        }
                    }
                }
            },
            {
                "add": {
                    "index": "cmt-ticket-index",
                    "alias": `cmt-ticket-${doc._id}`,
                    "routing": `cmt-ticket-${doc._id}`,
                    "filter": {
                        "term": {
                            "ed_user_id": doc._id
                        }
                    }
                }
            },
            {
                "add": {
                    "index": 'profile-index',
                    "alias": `profile-${doc._id}`,
                    "routing": `profile-${doc._id}`,
                    "filter": {
                        "term": {
                            "ed_user_id": doc._id
                        }
                    }
                }
            }
        )
    });
    res.json({})
};

exports.syncOwnerToElastic = (data, next) =>{
    if(!data.is_full_index){
        createdSharedIndex(data, next);
    } else {
        createdNotSharedIndex(data, next);
    }
}
