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
    Ticket = mongoose.model('Ticket'),
    User = mongoose.model('User'),
    CustomSetting =mongoose.model('CustomSetting'),
    enumsTicket = require('../../ticket/resources/enums'),
    enumsCustomSetting = require('../../custom.setting/resources/enums.res'),
    utils = require('../resources/utils'),
    client = require(path.resolve('./config/lib/elasticsearch'));

var fieldMapping = (field, data)=>{
    switch(field.cs_type){
        case 'date':
        case 'numeric':
        case 'slider':
        case 'switch':
            return isNaN(data)? null: Number(data);
            break;
        case 'dropdown':
        case 'text':
            if(Array.isArray(data)){
                return data.map(item => String(item)) || [];
            }
            return String(data) || '';
            break;
        default:
            return data;
            break;
    }
};

var textMapping = (field, data)=>{
    if(field.cs_type == "dropdown" && field.cs_type_data && Array.isArray(field.cs_type_data.values)){
        return (field.cs_type_data.values.find(o => {return o.value == data || {}})).text;
    }
    return undefined;
};

var getCustomField = (ed_user_id, data, provider) =>{
    return new Promise((resolve, reject) =>{
        var field = {},
            field_keys = _.keys((data || {}));
        if(field_keys.length == 0 ){
           return resolve();
        }
        var query = {
            ed_user_id: ed_user_id,
            provider: provider,
            field_key : {$in : field_keys}
        };
        CustomSetting.find(query, (err, result) =>{
            if(err){
                return resolve();
            }
            if(result.length == 0){
                return resolve();
            }
            _.forEach(result, (item) =>{
                if(_.indexOf(field_keys, item.field_key) != -1){
                    field[`${item._id}`] = {
                        field_key : item.field_key,
                        cs_type: item.cs_type,
                        value: fieldMapping(item, data[`${item.field_key}`]),
                        text: textMapping(item, data[`${item.field_key}`])
                    }
                }
            });
            return resolve(field);
        });
    });
};

var mappingCcAgents = (cc_agents) =>{
    return new Promise((resolve, reject) =>{
        var res_cc_agents = [];
        var tasks = [];
        if(cc_agents.length == 0){
            return resolve(res_cc_agents);
        }
        _.forEach(cc_agents, (item) =>{
            var promise = new Promise((resolve, reject) =>{
                User.findOne({_id: item}, (err, result) =>{
                    if(err){
                        return resolve();
                    }
                    if(!result){
                        return resolve();
                    }
                    return resolve({
                        _id: result._id,
                        name: result.name
                    });
                });
            });
            tasks.push(promise);
        });
        Promise.all(tasks).then(results =>{
            results = _.remove(results, (item) =>{
                return item != undefined;
            });
            return resolve(results);
        }).catch(reason =>{
            return resolve(res_cc_agents);
        });
    });
};

var runTicket = (query, handler) =>{
    var number_ticket = 0;
    Ticket.count(query, (err_count, result_count) =>{
        if(err_count){
            console.error(err_count, 'count number ticket error');
        }
        number_ticket = result_count ? result_count : 0;
    });

    var stage = [],
    stage1 = {
        $match: query
    };

    var stage2 = {
        $project: {
            "_id": "$_id",
            "add_time": "$add_time",
            "agent_id": "$agent_id",
            "cc_agents": "$cc_agents",
            "comment_time": "$comment_time",
            "provider_data": "$provider_data",
            "provider": "$provider",
            "deadline": "$deadline",
            "ed_user_id": "$ed_user_id",
            "field": "$fields",
            "group_id": "$group_id",
            "org_id": "$organization",
            "priority": "$priority",
            "requester_id": "$requester_id",
            "sla": "$sla",
            "solved_time": "$solved_date",
            "sla_date": "$sla_date",
            "status": "$status",
            "status_date": "$status_date",
            "subject": "$subject",
            "description": "$description",
            "submitter_id": "$submitter_id",
            "tags": "$tags",
            "type": "$type",
            "ticket_id": "$ticket_id",
            "is_delete": "$is_delete",
            "upd_time": "$upd_time",
            "stats": "$stats"
        }
    };
    var stage3 = {
        $lookup: {
            "from": config.dbTablePrefix.concat("user"),
            "localField": "requester_id",
            "foreignField": "_id",
            "as": "requester_docs"
        }
    };
    var stage4 = {
        $lookup: {
            "from": config.dbTablePrefix.concat("user"),
            "localField": "agent_id",
            "foreignField": "_id",
            "as": "agent_docs"
        }
    };
    var stage5 = {
        $lookup: {
            "from": config.dbTablePrefix.concat("group"),
            "localField": "group_id",
            "foreignField": "_id",
            "as": "group_docs"
        }
    };

    var stage6 = {
        $lookup: {
            "from": config.dbTablePrefix.concat("user"),
            "localField": "submitter_id",
            "foreignField": "_id",
            "as": "submitter_docs"
        }
    };
    var stage7 = {
        $lookup: {
            "from": config.dbTablePrefix.concat("organization"),
            "localField": "org_id",
            "foreignField": "_id",
            "as": "org_docs"
        }
    };

    var stage8 = {
        $lookup: {
            "from": config.dbTablePrefix.concat("ticket_stats"),
            "localField": "_id",
            "foreignField": "ticket_id",
            "as": "ticket_stats_docs"
        }
    }

    var stage9 = {
        $project: {
            "_id": "$_id",
            "add_time": "$add_time",
            "agent_docs": "$agent_docs",
            "cc_agents": "$cc_agents",
            "comment_time": "$comment_time",
            "provider_data": "$provider_data",
            "provider": "$provider",
            "deadline": "$deadline",
            "ed_user_id": "$ed_user_id",
            "field": "$field",
            "group_docs": "$group_docs",
            "org_docs": "$org_docs",
            "priority": "$priority",
            "requester_docs": "$requester_docs",
            "sla": "$sla",
            "solved_time": "$solved_time",
            "status": "$status",
            "status_date": "$status_date",
            "sla_date": "$sla_date",
            "subject": "$subject",
            "description": "$description",
            "submitter_docs": "$submitter_docs",
            "tags": "$tags",
            "type": "$type",
            "ticket_id": "$ticket_id",
            "is_delete": "$is_delete",
            "ticket_stats_docs": { $arrayElemAt : ['$ticket_stats_docs', 0] },
            "upd_time": "$upd_time",
            "stats": "$stats"
        }
    }
    var stage10 = {
        $unwind: {
            "path": "$requester_docs",
            "preserveNullAndEmptyArrays": true
        }
    };

    var stage11 = {
        $unwind: {
            "path": "$agent_docs",
            "preserveNullAndEmptyArrays": true
        }
    }

    var stage12 = {
        $unwind: {
            "path": "$group_docs",
            "preserveNullAndEmptyArrays": true
        }
    }

    var stage13 = {
        $unwind: {
            "path": "$submitter_docs",
            "preserveNullAndEmptyArrays": true
        }
    };

    var stage14 = {
        $unwind: {
            "path": "$org_docs",
            "preserveNullAndEmptyArrays": true
        }
    }

    var stage15 = {
        $unwind: {
            "path": "$ticket_stats_docs",
            "preserveNullAndEmptyArrays": true
        }
    }

    var stage16 = {
        $project: {
            "_id": "$_id",
            "add_time": "$add_time",
            "agent_id": {
                "_id": "$agent_docs._id",
                "field": "$agent_docs.fields",
                "name": "$agent_docs.name"
            },
            "cc_agents": "$cc_agents",
            "data": "$provider_data",
            "provider": "$provider",
            "deadline": "$deadline",
            "ed_user_id": "$ed_user_id",
            "field": "$field",
            "group_id": {
                "_id": "$group_docs._id",
                "name": "$group_docs.name"
            },
            "org_id": {
                "_id": "$org_docs._id",
                "field": "$org_docs.fields",
                "name": "$org_docs.name"
            },
            "priority": "$priority",
            "rating": "$ticket_stats_docs.rating",
            "requester_id": {
                "_id": "$requester_docs._id",
                "field" : "$requester_docs.fields",
                "name": "$requester_docs.name"
            },
            "sla": "$sla",
            "solved_time": "$solved_time",
            "status": "$status",
            "stats": {
                $ifNull: [
                    "$stats",
                    {
                        "counter_agent_cmt":"$ticket_stats_docs.counter.agent_cmt.value",
                        "counter_assigned":"$ticket_stats_docs.counter.assigned.value",
                        "counter_grouped":"$ticket_stats_docs.counter.grouped.value",
                        "counter_reopen":"$ticket_stats_docs.counter.reopen.value",
                        "counter_requester_cmt":"$ticket_stats_docs.counter.requester_cmt.value",
                        "counter_status_new":"$ticket_stats_docs.counter.status.New",
                        "counter_status_open":"$ticket_stats_docs.counter.status.Open",
                        "counter_status_pending":"$ticket_stats_docs.counter.status.Pending",
                        "counter_status_solved":"$ticket_stats_docs.counter.status.Sloved",
                        "counter_status_suspended":"$ticket_stats_docs.counter.status.Suspended",
                        "first_replied_agent_id": "$ticket_stats_docs.agent_first_repled.agent_id",
                        "first_replied_group_id": "$ticket_stats_docs.agent_first_repled.group_id",
                        "first_replied_time": "$ticket_stats_docs.agent_first_repled.upd_time",
                        "is_agent_answered":{
                            $cond: {
                                if :{
                                    $eq : ["$ticket_stats_docs.is_agent_unanswered", true]
                                },
                                then : false,
                                else : true
                            }
                        },
                        "is_delete":"$is_delete",
                        "last_comment_channel": "$ticket_stats_docs.last_comment_channel",
                        "last_time_agent_updated": "$ticket_stats_docs.date.agent_updated",
                        "last_time_assigned": "$ticket_stats_docs.date.assigned",
                        "last_time_cmt": "$comment_time",
                        "last_time_requester_updated": "$ticket_stats_docs.date.requester_updated",
                        "last_time_status":"$status_date",
                        "last_time_status_closed":"$ticket_stats_docs.date.status.Closed",
                        "last_time_status_new":"$ticket_stats_docs.date.status.New",
                        "last_time_status_open":"$ticket_stats_docs.date.status.Open",
                        "last_time_status_pending":"$ticket_stats_docs.date.status.Pending",
                        "last_time_status_solved":"$ticket_stats_docs.date.status.Solved",
                        "last_time_status_suspended":"$ticket_stats_docs.date.status.Suspended",
                        "last_time_sla": "$sla_date",
                        "agent_cmt_ids": "$ticket_stats_docs.agent_cmt_ids"
                    }
                ]
            },
            "subject": "$subject",
            "description": "$description",
            "submitter_id": {
                "_id": "$submitter_docs._id",
                "name": "$submitter_docs.name"
            },
            "tags": "$tags",
            "type": "$type",
            "ticket_id": "$ticket_id",
            "upd_time": "$upd_time"
        }
    };
    stage = [stage1, stage2, stage3, stage4, stage5, stage6, stage7, stage8, stage9, stage10, stage11, stage12, stage13, stage14, stage15, stage16];
    var cursor = Ticket.aggregate(stage).cursor({ batchSize : 1 }).exec();
    var array_ticket = [],
        total_ticket = 0,
        total_ticket_undefined = 0,
        count = 0,
        finish = false;
    cursor.each((error, doc) =>{
        if(error){
            if(handler){
                return handler(error);
            }
            return;
        }

        if(doc == null){
            if(handler){
                return handler(null, doc);
            }
            return;
        }
        var tasks = [
            getCustomField(doc.ed_user_id, doc.field, enumsCustomSetting.Provider.ticket),
            getCustomField(doc.ed_user_id, (doc.agent_id || {}).field, enumsCustomSetting.Provider.user),
            getCustomField(doc.ed_user_id, (doc.requester_id || {}).field, enumsCustomSetting.Provider.user),
            getCustomField(doc.ed_user_id, (doc.org_id || {}).field, enumsCustomSetting.Provider.org)
        ];
        if(doc.cc_agents && doc.cc_agents.length > 0){
            tasks.push(mappingCcAgents(doc.cc_agents));
        }
        Promise.all(tasks).then(result =>{
            if(doc.provider != undefined && doc.ed_user_id != undefined){
                doc.provider = utils.channelMapping(doc.provider);
                (doc.stats || {}).last_comment_channel = utils.channelMapping((doc.stats || {}).last_comment_channel);
                doc.field = result[0];
                if(result[1]){
                    doc.agent_id.field = result[1];
                }
                if(result[2]){
                    doc.requester_id.field = result[2];
                }
                if(result[3]){
                    doc.org_id.field = result[3];
                }
                if(result[4]){
                    doc.cc_agents = result[4] || [];
                }
                if(handler){
                    return handler(null, doc);
                }
                var data = {
                    create: {
                        _index: `ticket-${doc.ed_user_id}`,
                        _type: doc.provider,
                        _id: doc._id
                    }
                }
                array_ticket.push(data);
                delete doc._id;
                delete doc.provider;
                delete doc.ticket_comment_list;
                array_ticket.push(doc);
                total_ticket++;
                count++;
            } else {
                if(handler){
                    return handler(null, null);
                }
                total_ticket_undefined++;
                console.log("ticket undefined", JSON.stringify(doc));
            }

            if(count == 5000){
                console.log("count send", count);
                console.log("count send", total_ticket);
                utils.sendElastics(array_ticket);
                array_ticket = [];
                count = 0;
            } else {
                let total = total_ticket + total_ticket_undefined;
                if(total == number_ticket){
                    utils.sendElastics(array_ticket);
                    console.log("count", total_ticket);
                    console.log("count ticket undefined", total_ticket_undefined);
                    console.log("finish");
                }
            }
        }).catch(error =>{
            console.log(error);
        });
    });
}

exports.execTicket = (req, res, next) =>{
    var channel = req.query.channel;
    var params = {
        query : {}
    };
    if(channel != undefined){
        let arr_channel = channel.split(',');
        params.query['provider'] = {
            $in : arr_channel
        }
    }
    runTicket(params.query);
    res.json({});
};

exports.syncElasticTicket = (data) =>{
    if(data.op == 'i'){
        var query = {
            _id: mongoose.Types.ObjectId(data.o._id)
        };
        runTicket(query, (err, result) =>{
            if(err){
                console.error(err, 'sync insert ticket elastic error');
                return;
            }
            if(!result){
                return;
            }
            var insert_elastic = {
                index: `ticket-${result.ed_user_id}`,
                type: result.provider,
                id: `${result._id}`
            };
            delete result._id;
            delete result.provider;
            insert_elastic.body = result;
            utils.sendCreated(insert_elastic);
            return;
        });
    } else if(data.op == 'u'){
        var query = {
            _id: mongoose.Types.ObjectId(data.o2._id)
        };
        runTicket(query, (err, result) =>{
            if(err){
                console.error(err, 'sync insert ticket elastic error');
                return;
            }
            if(!result){
                return;
            }
            if(!result.field){
                result.field = null;
            }
            if(_.isEmpty(result.sla)){
                result.sla = null;
            }
            if(!result.tags){
                result.tags = null;
            }
            if(!result.type){
                result.type = null;
            }
            if(!result.priority){
                result.priority = null;
            }
            if(_.isEmpty(result.agent_id)){
                result.agent_id = null;
                if(_.isEmpty(result.group_id)){
                    result.group_id = null;
                }
            }
            if(_.isEmpty(result.requester_id)){
                result.requester_id = null;
                result.org_id = null;
            }
            var update_elastic = {
                index: `ticket-${result.ed_user_id}`,
                type: result.provider,
                id: `${result._id}`
            };
            delete result._id;
            delete result.provider;
            update_elastic.body ={
                doc: result
            };
            update_elastic.retryOnConflict = 2;
            utils.sendUpdated(update_elastic);
            return;
        });
    } else {
        return;
    }
};

exports.syncTicketFromTrigger = (data) =>{
    var query = {
        _id: mongoose.Types.ObjectId(data._id)
    };
    runTicket(query, (err, result) =>{
        if(err){
            console.error(err, 'sync insert ticket elastic error');
            return;
        }
        if(!result){
            return;
        }
        if(!result.field){
            result.field = null;
        }
        if(_.isEmpty(result.sla)){
            result.sla = null;
        }
        if(!result.tags){
            result.tags = null;
        }
        if(!result.type){
            result.type = null;
        }
        if(!result.priority){
            result.priority = null;
        }
        if(_.isEmpty(result.agent_id)){
            result.agent_id = null;
            if(_.isEmpty(result.group_id)){
                result.group_id = null;
            }
        }
        if(_.isEmpty(result.requester_id)){
            result.requester_id = null;
            result.org_id = null;
        }
        var update_elastic = {
            index: `ticket-${result.ed_user_id}`,
            type: result.provider,
            id: `${result._id}`
        };
        delete result._id;
        delete result.provider;
        delete result.ticket_comment_list;
        update_elastic.body = {
            doc: result,
            doc_as_upsert: true
        };
        update_elastic.retryOnConflict = 2;
        utils.sendUpdated(update_elastic);
        return;
    });
}
