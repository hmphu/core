'use strict';
//
// ticket.controller.js
// handle core system routes
//
// Created by thanhdh on 2015-12-17.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    moment = require('moment'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    utils = require('../../core/resources/utils'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    Ticket = mongoose.model('Ticket'),
    TicketHist = mongoose.model('TicketHist'),
    TicketViewer = mongoose.model('TicketViewer'),
    TicketStats = mongoose.model('TicketStats'),
    TicketComment = mongoose.model('TicketComment'),
    TicketArchive = mongoose.model('TicketArchive'),
    TicketHistArchive = mongoose.model('TicketHistArchive'),
    TicketStatsArchive = mongoose.model('TicketStatsArchive'),
    TicketCommentArchive = mongoose.model('TicketCommentArchive'),
    User = mongoose.model('User'),
    enums = require('../resources/enums'),
    enumsCore = require('../../core/resources/enums.res'),
    translation = require('../resources/translation'),
    utilsTicket = require('../resources/utils'),
    socketIO = require(path.resolve('./config/lib/socket.io')),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter'));


// remove ticket archive
var removeByTicketId = (archive_id, callback) => {
    var tasks = [];
    var removeQuery = { ticket_archive_id: archive_id};
    // remove ticket archive
    tasks.push(new Promise((resolve, reject)=>{
        TicketArchive.findByIdAndRemove(archive_id).exec((errRemove)=>{
            if(errRemove){
                console.log("Remove ticket archive error by id[%s]", archive_id);
            }
            return resolve();
        });
    }));
    
    // remove ticket stats archive
    tasks.push(new Promise((resolve, reject)=>{
        TicketStatsArchive.remove(removeQuery).exec((errRemove)=>{
            if(errRemove){
                console.log("Remove ticket archive error by id[%s]", archive_id);
            }
            return resolve();
        });
    }));
    
    // remove ticket comment archive
    tasks.push(new Promise((resolve, reject)=>{
        TicketCommentArchive.remove(removeQuery).exec((errRemove)=>{
            if(errRemove){
                console.log("Remove ticket comment archive error by id[%s]", archive_id);
            }
            return resolve();
        });
    }));
    
    // remove ticket hist archive
    tasks.push(new Promise((resolve, reject)=>{
        TicketHistArchive.remove(removeQuery).exec((errRemove)=>{
            if(errRemove){
                console.log("Remove ticket hist archive error by id[%s]", archive_id);
            }
            return resolve();
        });
    }));
    
    Promise.all(tasks).then(results=>{
        if(callback){
            return callback({success: true});
        }
        return true;
    }).catch(ex=>{
        if(callback){
            return callback({success: false});
        }
        return false;
    });
};

// move ticket and related to archive
var move = (ticket)=>{
    return new Promise((resolve, reject)=>{
        var doc = ticket._doc;
        doc.ticket_id = ticket._id;
        doc.add_time = +moment.utc();
        doc.upd_time = +moment.utc();
        
        TicketArchive.update({_id: doc._id}, doc, {upsert: true, setDefaultsOnInsert: true},(errUpdate)=>{
            if(errUpdate){
                return resolve({});
            }
            console.log(`Move ticket  ${doc.subject}[${doc._id}] success!`);
            Promise.all([
                removeRow(ticket),
                removeTicketView(ticket._id),
                moveTickeCommentToArchive(doc._id, doc._id),
                moveTicketStatsToArchive(doc._id, doc._id),
                moveTickeHistToArchive(doc._id, doc._id)
            ]).then(results=>{
                return resolve({ticket_id: doc._id, success:true, message:`Move ticket  with ${doc.subject}[${doc._id}] success!`});
            }).catch(ex=>{
                console.log(`Move ticket stats, hist,comment with ${doc.subject}[${doc._id}] failed!`);
                console.log(ex);
                return resolve({ticket_id: doc._id, success:false, message:`Move ticket with ${doc.subject}[${doc._id}] failed!`});
            });
        });
    });
};

// remove record from db
var removeRow = (row)=>{
    return new Promise((resolve,reject)=>{
        row.remove(err=>{
            return resolve();
        });
    });
};

// remove ticket view from db
var removeTicketView = (ticket_id)=>{
    return new Promise((resolve,reject)=>{
        TicketViewer.remove({ticket_id:ticket_id}, err=>{
            console.log(`error remove ticket view by ticket id[${ticket_id}]`, err);
            return resolve();
        });
    });
};

// move ticket comment to archive
var moveTickeCommentToArchive = (ticket_id, archive_id)=>{
    var query = {
        ticket_id:ticket_id
    };
    
    var tasks = [];
    return new Promise((resolve,reject)=>{
        TicketComment.find(query).exec((err, comments)=>{
            if(err){
                return Promise.all(tasks);
            }
            comments.forEach(comment=>{
                tasks.push(new Promise((resolve, reject)=>{
                    var doc = comment._doc;
                    doc.ticket_archive_id = archive_id;
                    doc.ticket_id = ticket_id;
                    doc.add_time = +moment.utc();
                    doc.upd_time = +moment.utc();
                    TicketCommentArchive.update({_id: doc._id}, doc, {upsert: true, setDefaultsOnInsert: true}, (errUpdate)=>{
                        if(errUpdate){
                            console.log(`Move ticket comment with id[${comment._id}] failed!`, err);
                            return resolve({comment_id:doc._id});
                        }
                        console.log(`Move ticket comment with id[${comment._id}] success!`);
                        comment.remove(errRemove=>{
                            return resolve({comment_id:doc._id});
                        });
                    });
                }));
            });
            Promise.all(tasks).then(results=>{
                return resolve(results);
            }).catch(ex=>{
                return resolve({});
            });
        });
    });
    
};

// move ticket stats to archive
var moveTicketStatsToArchive = (ticket_id, archive_id)=>{
    var query = {
        ticket_id:ticket_id
    };
    
    var tasks = [];
    return new Promise((resolve,reject)=>{
        TicketStats.find(query).exec((err, stats)=>{
            if(err){
                return Promise.all(tasks);
            }
            stats.forEach(stat=>{
                tasks.push(new Promise((resolve, reject)=>{
                    var doc = stats._doc;
                    doc.ticket_archive_id = archive_id;
                    doc.ticket_id = ticket_id;
                    doc.add_time = +moment.utc();
                    doc.upd_time = +moment.utc();
                    
                    TicketStatsArchive.update({_id:doc._id}, doc, {upsert: true, setDefaultsOnInsert: true}, (errUpdate)=>{
                        if(errUpdate){
                            console.log(`Move ticket stats with id[${doc._id}] failed!`, err);
                            return resolve({stats_id:doc._id});
                        }
                        console.log(`Move ticket stats with id[${doc._id}] success!`);
                        stat.remove(errRemove=>{
                            return resolve({stats_id:doc._id});
                        });
                    });
                }));
            });
            Promise.all(tasks).then(results=>{
                return resolve(results);
            }).catch(ex=>{
                return resolve({});
            });
        });
    });
    
};

// move ticket hist to archive
var moveTickeHistToArchive = (ticket_id, archive_id)=>{
    var query = {
        ticket_id:ticket_id
    };
    
    var tasks = [];
    return new Promise((resolve,reject)=>{
        TicketHist.find(query).exec((err, hists)=>{
            if(err){
                return Promise.all(tasks);
            }
            hists.forEach(hist=>{
                tasks.push(new Promise((resolve, reject)=>{
                    var doc = hist._doc;
                    doc.ticket_archive_id = archive_id;
                    doc.ticket_id = ticket_id;
                    doc.add_time = +moment.utc();
                    doc.upd_time = +moment.utc();
                    
                    TicketHistArchive.update({_id:doc._id}, doc, {upsert: true, setDefaultsOnInsert: true}, (errUpdate)=>{
                        if(errUpdate){
                            console.log(`Move ticket hist with id[${doc._id}] failed!`, err);
                            return resolve({hist_id:doc._id});
                        }
                        console.log(`Move ticket hist with id[${doc._id}] success!`);
                        hist.remove(errRemove=>{
                            return resolve({hist_id:doc._id});
                        });
                    });
                }));
            });
            Promise.all(tasks).then(results=>{
                resolve(results);
            }).catch(ex=>{
                resolve([]);
            });
        });
    });
    
};

var convert_time = (value, time_zone, lang)=>{
    return value != "" ? moment(value).utcOffset(time_zone).format( lang == 'vi'? 'DD/MM/YYYY H:mm': 'MM/DD/YYYY H:mm'): "";
};

var convertTicket = (doc, req)=>{
    var ticket = {};
    var lang = translation[req.user.language || "en"];
    
    ticket._id = doc._id;
                
    ticket.subject = doc.subject;

    ticket.description = (_.sortBy(doc.comment, ['add_time'])[0]|| {}).content || '';

    ticket.add_time = convert_time(doc.add_time, req.user.time_zone.value, req.user.language);

    ticket.assignee = doc.agent || '';

    ticket.requester = doc.requester || '';
    
    ticket.group = doc.group || '';

    ticket.channel = lang.channel[doc.provider]; 
    
    return ticket;
};

// list ticket archive
exports.list = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: mongoose.Types.ObjectId(idOwner),
        is_delete: false
    };
    if(req.query.start_time && req.query.end_time){
        query['add_time'] = {
            $gte: Number(req.query.start_time),
            $lte: Number(req.query.end_time)
        }
    }
    
    if(req.query.agent && mongoose.Types.ObjectId.isValid(req.query.agent)){
        query['agent_id'] = mongoose.Types.ObjectId(req.query.agent);
    }
    
    if(req.query.requester && mongoose.Types.ObjectId.isValid(req.query.requester)){
        query['requester_id'] = mongoose.Types.ObjectId(req.query.requester);
    }
    var stage = [],
        stage15 = {};
    var stage1 = {
        $match: query
    };
    var stage2 ={
        $sort: {
            add_time: req.query.sort_order ? 1 : -1
        }
    };
    var stage6 = {
        $lookup: {
            "from": config.dbTablePrefix.concat("user"),
            "localField": "requester_id",
            "foreignField": "_id",
            "as": "requester_docs"
        }
    };
    var stage7 = {
        $lookup: {
            "from": config.dbTablePrefix.concat("user"),
            "localField": "agent_id",
            "foreignField": "_id",
            "as": "agent_docs"
        }
    };
    var stage8 = {
        $lookup: {
            "from": config.dbTablePrefix.concat("group"),
            "localField": "group_id",
            "foreignField": "_id",
            "as": "group_docs"
        }
    };

    var stage9 = {
        $unwind: {
            "path": "$requester_docs",
            "preserveNullAndEmptyArrays": true
        }
    };

    var stage10 = {
        $unwind: {
            "path": "$agent_docs",
            "preserveNullAndEmptyArrays": true
        }
    }

    var stage11 = {
        $unwind: {
            "path": "$group_docs",
            "preserveNullAndEmptyArrays": true
        }
    }

    var stage12 = {
        $project: {
            "_id": "$_id",
            "status": "$status",
            "subject": "$subject",
            "requester":{
                "_id":  "$requester_docs._id",
                "name":  "$requester_docs.name"
            },
            "agent": {
                "_id": "$agent_docs._id",
                "name": "$agent_docs.name"
            },
            "group": {
                "_id": "$group_docs._id",
                "name": "$group_docs.name"
            },
            "add_time": "$add_time",
        }
    };
    var stage14 = {
        $limit: isNaN(req.query.limit) ? config.paging.limit: Number(req.query.limit)
    };
    if(req.query.skip){
        if(req.query.sort_order){
            if(req.query.start_time && req.query.end_time){
                stage15 = {
                    $match:{
                        add_time: {
                            $gt: Number(req.query.skip),
                            $lte: Number(req.query.end_time)
                        }
                    }
                }
            } else {
                stage15 = {
                    $match:{
                        add_time: {
                            $gt: Number(req.query.skip)
                        }
                    }
                }
            }
            
        }
        else {
            if(req.query.start_time && req.query.end_time){
                stage15 = {
                    $match:{
                        add_time: {
                            $gte: Number(req.query.start_time),
                            $lt: Number(req.query.skip)
                        }
                    }
                }
            } else {
                stage15 = {
                    $match: {
                        add_time: {
                            $lt: Number(req.query.skip)
                        }
                    }
                }
            }
        }
        stage = [stage1, stage2, stage15, stage6, stage7, stage8, stage9, stage10, stage11, stage12, stage14];
    } else {
        stage = [stage1, stage2, stage6, stage7, stage8, stage9, stage10, stage11, stage12,  stage14];
    }
    TicketArchive.aggregate(stage).exec((err, result) =>{
        if(err){
            console.error(err);
            return next(err);
        }
        res.json(result);
    })
}

exports.count = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: mongoose.Types.ObjectId(idOwner),
        is_delete: false
    };
    if(req.query.start_time && req.query.end_time){
        query['add_time'] = {
            $gte: Number(req.query.start_time),
            $lte: Number(req.query.end_time)
        }
    }
    
    if(req.query.agent && mongoose.Types.ObjectId.isValid(req.query.agent)){
        query['agent_id'] = mongoose.Types.ObjectId(req.query.agent);
    }
    
    if(req.query.requester && mongoose.Types.ObjectId.isValid(req.query.requester)){
        query['requester_id'] = mongoose.Types.ObjectId(req.query.requester);
    }
    
    var stage = [],
        stage3 = {};
    var stage1 = {
        $match: query
    };
    var stage4 = {
        $group: {
            _id: null,
            count: {$sum: 1}
        }
    }
    if(req.query.skip){
        if(req.query.sort_order){
            if(req.query.start_time && req.query.end_time){
                stage3 = {
                    $match:{
                        add_time: {
                            $gt: Number(req.query.skip),
                            $lte: Number(req.query.end_time)
                        }
                    }
                }
            } else {
                stage3 = {
                    $match:{
                        add_time: {
                            $gt: Number(req.query.skip)
                        }
                    }
                }
            }

        } else {
            if(req.query.start_time && req.query.end_time){
                stage3 = {
                    $match:{
                       add_time: {
                            $gte: Number(req.query.start_time),
                            $lt: Number(req.query.skip_time)
                        }
                    }
                }
            } else {
                stage3 = {
                    $match: {
                        add_time: {
                            $lt: Number(req.query.skip)
                        }
                    }
                }
            }
        }
        stage = [stage1, stage3, stage4];
    } else {
        stage = [stage1, stage4];
    }
    TicketArchive.aggregate(stage).exec((err, result) =>{
        if(err){
            console.error(err);
            return next(err);
        }
        res.json(result[0] ? result[0].count : 0);
    });
};

// batch to move ticket to archive
exports.exec = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: idOwner,
        $or: [
            {
                is_delete: true
            },
            {
                status: enums.TicketStatus.Closed,
            }
        ]
    };
    var tasks = [];
    Ticket.find(query).exec((err, tickets)=>{
        if(err){
            return next(err);
        }
        tickets.forEach(ticket=>{
            tasks.push(move(ticket));
        });
        
        Promise.all(tasks).then(results=>{
             return res.json({});
        }).catch(ex=>{
            console.log(ex);
        });
    });
};

// batch to move ticket to archive
exports.moveByTicketId = (req, res, next) => {
    var ticket_id = req.params.id_ticket;
    var archive_id = req.params.id_archive;
    Promise.all([
        moveTickeCommentToArchive(ticket_id, archive_id),
        moveTicketStatsToArchive(ticket_id, archive_id),
        moveTickeHistToArchive(ticket_id, archive_id)
    ]).then(results=>{
        return res.json(results);
    }).catch(ex=>{
        return res.json({});
    });
//    return res.json({});
};

// batch to remove ticket archive
exports.removeTicketArchive = (req, res, next) => {
    var ids = req.query.ids;
    if(!Array.isArray(ids)){
        return next(new TypeError("ticket.delete_ticket.data_must_array"));
    }
    if(_.isEmpty(ids)){
        return next(new TypeError('archive.delete.not_empty'));
    }
    var tasks = [];
    TicketArchive.update({_id:{$in: ids}}, {is_delete: true}).exec((err, raw)=>{
        if(err){
            return next(err);
        }
        return res.json({
            message: "ticket_archive.delete_success"
        });
    });
};

// batch to remove ticket archive expried
exports.removeTicketExpried = (req, res, next) => {
    var stages = [{
        $match : {
            add_time:{$lt: +moment.utc().add(-30, 'days')}
        }
    }];
    var cursor = TicketArchive.aggregate(stages).cursor({ batchSize: 1000 }).allowDiskUse(true).exec();
    cursor.each((error, doc) => {
        if (error) {
            console.error(error);
            return;
        }
        
        if (doc === null) {
            return;
        } else {
            removeByTicketId(doc._id);
        }
    });
    res.json({
        success: true
    });
};

exports.exportExcel = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var user_id = req.user._id;
    var lang = translation[req.user.language || "en"];
    var columns = [
        'id',
        lang.subject, 
        lang.description, 
        lang.add_time, 
        lang.assignee,
        lang.group,
        lang.requester
    ];
    
    var query = {
        ed_user_id: mongoose.Types.ObjectId(idOwner),
    };
    if(req.query.start_time && req.query.end_time){
        query['add_time'] = {
            $gte: Number(req.query.start_time),
            $lte: Number(req.query.end_time)
        }
    }
    
    if(req.query.agent && mongoose.Types.ObjectId.isValid(req.query.agent)){
        query['agent_id'] = mongoose.Types.ObjectId(req.query.agent);
    }
    
    if(req.query.requester && mongoose.Types.ObjectId.isValid(req.query.requester)){
        query['requester_id'] = mongoose.Types.ObjectId(req.query.requester);
    }
    var states = [
        {
            $match: query
        },
        {
            $sort: {
                add_time: 1
            }
        },
        {
            $lookup: {
                "from": config.dbTablePrefix.concat("user"),
                "localField": "requester_id",
                "foreignField": "_id",
                "as": "requester_docs"
            }
        },
        {
            $lookup: {
                "from": config.dbTablePrefix.concat("user"),
                "localField": "agent_id",
                "foreignField": "_id",
                "as": "agent_docs"
            }
        },
        {
            $lookup: {
                "from": config.dbTablePrefix.concat("group"),
                "localField": "group_id",
                "foreignField": "_id",
                "as": "group_docs"
            }
        },
        {
            $lookup: {
                "from": config.dbTablePrefix.concat('ticket_comment_archive'),
                "localField": "_id",
                "foreignField": "ticket_archive_id",
                "as": "comment_doc"
            }
        },
        {
            $unwind: {
                "path": "$requester_docs",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $unwind: {
                "path": "$agent_docs",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $unwind: {
                "path": "$group_docs",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $project: {
                "_id": "$_id",
                "subject": "$subject",
                "desciption": "$desciption",
                "requester": "$requester_docs.name",
                "agent": "$agent_docs.name",
                "group": "$group_docs.name",
                "add_time": "$add_time",
                "comment": "$comment_doc",
                "provider": "$provider"
            }
        }
    ];

    var cursor = TicketArchive.aggregate(states).allowDiskUse(true).cursor({ batchSize : 1000 }).exec();
    var count = 0;
    cursor.each((err, doc) => {
        if (err) {
            return console.error(new Error(JSON.stringify(err)));
        }
        
        if(doc){
            doc = convertTicket(doc, req);
        }
        socketIO.emit('/worker', user_id, {
            topic : 'izi-core-client-ticket-archive-export',
            payload :  {
                data : doc,
                is_end: doc == null
            }
        });
    }); 
    res.json(null);
};