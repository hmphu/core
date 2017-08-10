'use strict';
//
//  dashboard.controller.js
//  handle dashboard data
//
//  Created by dientn on 2016-02-02.
//  Copyright 2016 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash');
var path = require("path");
var moment = require('moment');
var utils = require('../../core/resources/utils');
var ticketEnums = require('../../ticket/resources/enums');
var mongoose = require('mongoose');
var Ticket = mongoose.model('Ticket');
var User = mongoose.model('User');
var TicketStats = mongoose.model('TicketStats');
var GroupUser = mongoose.model('GroupUser');
var enums = require('../resources/enums.res');


// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========


// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

exports.countTicketByQuery = ( query , next)=>{
    Ticket.count(query, ( err, count )=>{
        if(err){
            return next(err);
        }
        next(null, count || 0);
    });
};

exports.countTicketByStatus = (user, status, next)=>{
    var idOwner = utils.getParentUserId(user);
    var query = {
        ed_user_id: idOwner,
        agent_id: user._id,
        status: status,
        is_delete: false
    };
    
    this.countTicketByQuery(query, next);
};

exports.countTicketReopen = (user, next)=>{
    var idOwner = utils.getParentUserId(user);

    var query = {
        ed_user_id: idOwner,
        "current_status.agent_id": user._id,
        "counter.reopen.value": {$gt : 0}
    }
    
    TicketStats.count(query).exec((err, count)=>{
        if(err){
            return next(err);
        }
        next(null,count || 0);
    });
};

exports.countTicketByChannel = (user, channel, next)=>{
    var idOwner = utils.getParentUserId(user);
    var query = {
        ed_user_id: idOwner,
        provider: channel,
        agent_id: user._id
    };
    return this.countTicketByQuery(query, next);
};

exports.countTicketByRating = (user, rating, next)=>{
    var idOwner = utils.getParentUserId(user);
    var user_id = user._id;
    var query = {
        ed_user_id: idOwner,
        "rating.value": rating,
        "value.agent_id": user_id
    }
    
    utils.findByQuery(TicketStats, {query: query, is_count: true} ).exec((err, count)=>{
        if(err){
            return next(err);
        }
        next(null,count || 0);
    });
};

exports.countTicketUnanswered = (idOwner, user_id, next)=>{
    var query = {
        ed_user_id: idOwner,
        "is_agent_unanswered": false,
        "current_status.agent_id": user_id,
        "current_status.status":{$lt: ticketEnums.TicketStatus.Solved},
        is_delete: false
    }
    
    TicketStats.count(query).exec((err, count)=>{
        if(err){
            return next(err);
        }
        next(null,count || 0);
    });
};

exports.countSlaLate = (user, next)=>{
    var idOwner = utils.getParentUserId(user);
    var user_id = user._id;
    
    var query = {
        ed_user_id: idOwner,
        "sla.deadline.agent_working_time": {$lt: +moment.utc()},
        agent_id: user_id,
        status:{$lt: ticketEnums.TicketStatus.Pending}
    };
    
    return this.countTicketByQuery( query, next);
};

exports.getTicketByQuery = (options, next)=>{
    var populate = [
        { 
            path: 'agent_id',
            select: "name"
        },
        { 
            path: 'requester_id',
            select: "name"
        }
    ];
    options.sort = options.sort || 'upd_time';
    options.sort_order = options.sort_order || -1;
    options.query.is_delete = false;
    
    utils.findByQuery(Ticket, options).populate(populate).exec(( err, tickets )=>{
        if(err){
            return next(err);
        }
        
        next(null, tickets || []);
    });
};

exports.getTicketUnanswered = (idOwner, user_id, query, next)=>{
    var params = {
        query : {
            ed_user_id: idOwner,
            "is_agent_unanswered": false,
            $and:[
                {
                    "current_status.status":{$ne: ticketEnums.TicketStatus.Closed}
                },
                {
                    "current_status.status":{$ne: ticketEnums.TicketStatus.Solved}
                }
            ],
            "current_status.agent_id": user_id,
            is_delete: false,
        },
        sort: 'upd_time',
        skip: query.skip,
        sort_order: query.sort_order || -1,
        limit: query.limit,

    };
    var populate = [
        { 
            path: 'current_status.agent_id',
            select: "name"
        },
        { 
            path: 'ticket_id'
        }
    ];
    
    utils.findByQuery(TicketStats, params ).populate(populate).exec((err, tickets)=>{
        if(err){
            return next(err);
        }
        
        User.populate(tickets, {path: "ticket_id.requester_id", select:"name"}, (err, popTickets)=>{
            if(err) return next(err);
            var results = _.map(popTickets, ticket=>{
                var t = {
                    _id : ticket.ticket_id._id,
                    subject : ticket.ticket_id.subject,
                    sla : ticket.ticket_id.sla,
                    status : ticket.ticket_id.status,
                    priority : ticket.ticket_id.priority,
                    add_time: ticket.ticket_id.add_time,
                    requester_id: ticket.ticket_id.requester_id,
                    agent_id: ticket.current_status.agent_id,
                    upd_time:ticket.upd_time
                };
                if( !t.sla.deadline.agent_working_time){
                    t.sla = null;
                }
                return t;
            });
        
            next(null, results || []);
        });
        
    });
};

exports.getGroupOfUser = (user, next)=>{
    var idOwner = utils.getParentUserId(user);
    
    var query = {
        ed_user_id: idOwner,
        user_id: user._id
    };
    
    GroupUser.find(query, {group_id: 1}, next);
};
