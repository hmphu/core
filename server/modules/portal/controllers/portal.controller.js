'use strict';
//
// portal.controller.js
// handle portal  routes
//
// Created by dientn on 2016-09-28.
// Copyright 2015 Fireflyinnov. All rights reserved.
//



/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    utils = require('../../core/resources/utils'),
    Ticket = mongoose.model('Ticket'),
    User = mongoose.model('User'),
    moment = require('moment'),
    socketIO = require(path.resolve('./config/lib/socket.io')),
    enumsCore = require('../../core/resources/enums.res'),
    translation = require('../../ticket/resources/translation'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter'));

var convertTicket = (doc, user)=>{
    var ticket = {};
    var lang = translation[user.language || "en"];
    
    ticket._id = doc._id;
                
    ticket.subject = doc.subject;

    ticket.description = ((doc.comment[0]|| {}).content || '').replace(/<\s*br\/*>/gi, "\n").replace(/<\/?[^>]+(>|$)/g, "");

    ticket.add_time = convert_time(doc.add_time, user.time_zone.value, user.language);

    ticket.assignee = doc.agent || '';
    
    ticket.type = doc.type? lang.type['t'+doc.type] : '';
    
    ticket.priority = doc.priority? lang.priority['p'+doc.priority] : '';

    return ticket;
};

var convert_time = (value, time_zone, lang)=>{
    return value != "" ? moment(value).utcOffset(time_zone).format( lang == 'vi'? 'DD/MM/YYYY H:mm': 'MM/DD/YYYY H:mm'): "";
};

exports.listTicket = (req, res, next)=>{
    var idOwner = utils.getParentUserId(req.user);
    var options = {
        query : {
            ed_user_id:idOwner,
            requester_id: req.user._id
        },
        sort: 'upd_time',
//        skip: req.query.skip || 0,
        sort_order: req.query.sort_order || -1,
        limit: req.query.limit? Number(req.query.limit): config.paging.limit,
        select:"subject status agent_id add_time priority type"
    };
    
    if(req.query.status){
        options.query.status = {$eq: Number(req.query.status)}
    }
    if(req.query.skip){
        options.query.add_time = {$gt: Number(req.query.skip)}
    }
    
    if(req.query.start_time) {
        if(req.query.skip){
            if(Number(req.query.skip) < Number(req.query.start_time)){
                options.query.$and = options.query.$and || [];
                options.query.$and.push({add_time: {$gt: Number(req.query.start_time)}});
            }
        }else{
            options.query.$and = options.query.$and || [];
            options.query.$and.push({add_time: {$gt: Number(req.query.start_time)}});
        }
    }
    
    if(req.query.end_time ){
        options.query.$and = options.query.$and || [];
        options.query.$and.push({add_time: {$lt: Number(req.query.end_time)}});
    }
    
    utils.findByQuery(Ticket, options).populate({ 
            path: 'agent_id',
            select: "name"
        }).exec(( err, tickets )=>{
        if(err){
            return next(err);
        }
        
        res.json(tickets);
    });
};

exports.countTicket = (req, res, next)=>{
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id:idOwner,
        requester_id: req.user._id
    };
    
    if(req.query.status){
        query.status = {$eq: Number(req.query.status)}
    }
    
    if(req.query.start_time) {
        query.$and = query.$and || [];
        query.$and.push({add_time: {$gt: Number(req.query.start_time)}});
    }
    
    if(req.query.end_time ){
        query.$and = query.$and || [];
        query.$and.push({add_time: {$lt: Number(req.query.end_time)}});
    }
    
    Ticket.count(query).exec((err, count)=>{
        if(err){
            return next(err);
        }
        res.json(count);
    });
};

exports.viewTicket = (req, res, next)=>{
    var idOwner = utils.getParentUserId(req.user);
    var ticket = req.ticket;
    ticket.populate([{ 
            path: 'agent_id',
            select: "name"
        }], (err,result)=>{
        res.json(result);
    });
    
};

exports.exportTicket = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var user_id = req.user._id;
    var lang = translation[req.user.language || "en"];
    var columns = [
        'id',
        lang.subject, 
        lang.description, 
        lang.add_time, 
        lang.assignee,
        lang.group
    ];
    
    var query = {
        ed_user_id: mongoose.Types.ObjectId(idOwner),
        requester_id: user_id
    };
    
    if(req.query.status){
        query.status = {$eq: Number(req.query.status)}
    }
    
    if(req.query.start_time) {
        query.$and = query.$and || [];
        query.$and.push({add_time: {$gt: Number(req.query.start_time)}});
    }
    
    if(req.query.end_time ){
        query.$and = query.$and || [];
        query.$and.push({add_time: {$lt: Number(req.query.end_time)}});
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
                "from": config.dbTablePrefix.concat('ticket_comment'),
                "localField": "_id",
                "foreignField": "ticket_id",
                "as": "comment_docs"
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
            $project: {
                "_id": "$_id",
                "subject": "$subject",
                "desciption": "$desciption",
                "requester": "$requester_docs.name",
                "agent": "$agent_docs.name",
                "type": "$type",
                "priority": "$priority",
                "add_time": "$add_time",
                "comment": { 
                    $filter: {
                        input: "$comment_docs",
                        as: "cmt",
                        cond: { $eq: [ "$$cmt.is_first", true ] }
                    }
                }
            }
        }
    ];

    var cursor = Ticket.aggregate(states).allowDiskUse(true).cursor({ batchSize : 1000 }).exec();
    var count = 0;
    cursor.each((err, doc) => {
        if (err) {
            return console.error(new Error(JSON.stringify(err)));
        }
        
        if(doc){
            doc = convertTicket(doc, req.user);
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

/**
 * Ticket middleware
 */
exports.ticketByID = (req, res, next, id) => {
    // check the validity of ticket id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('ticket.id.objectId'));
    }
    var idOwner = utils.getParentUserId(req.user);
    // find ticket by its id
    Ticket.findById(id).exec((err, ticket) => {
        if (err){
            return next(err);
        }
        if (!ticket || !_.isEqual(ticket.ed_user_id, idOwner) || ticket.is_delete) {
            return next(new TypeError('ticket.id_not_found'));
        }
        req.ticket = ticket;
        next();
    });
}