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
var utils = require('../../../core/resources/utils');
var ticketEnums = require('../../../ticket/resources/enums');
var mongoose = require('mongoose');
var enums = require('../../resources/enums.res');
var common = require('../common.controller');


// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========


// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========
var getQuery = (idOwner, agent_id, type)=>{
    var query = { ed_user_id: idOwner, status: {$ne: ticketEnums.TicketStatus.Closed}, is_delete: false};
    
    if(agent_id){
        query.agent_id = agent_id;
    }
    
    switch(type){
        case enums.adminTicketType.open:
            query.status =  ticketEnums.TicketStatus.Open;
            break;
        case enums.adminTicketType.solved:
            query.status =  ticketEnums.TicketStatus.Solved;
            break;
        case enums.adminTicketType.sla_late:
            query["sla.deadline.agent_working_time"] = {$lt: +moment.utc()};
            query['status'] = {$lt: ticketEnums.TicketStatus.Solved};
            break;
        case enums.adminTicketType.all:
            query['status'] = {$lte: ticketEnums.TicketStatus.Solved};
            break;
        default:
            break;
    }
    return query;
};

/*
    @author: dientn
    count ticket 
*/
exports.countTickets = [
    (req, res, next)=>{
        var type = req.params.type;
        var agent_id = req.params.agent_id;
        if(agent_id != "all" && !mongoose.Types.ObjectId.isValid(agent_id)){
            return next(new TypeError("dashboard.agent_id.invalid"));
        }
        if(type && !enums.adminTicketType[type]){
            return next(new TypeError("dashboard.type.not_found"));
        }
        next();
    },
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        var agent_id = req.params.agent_id == "all"? null: req.params.agent_id;
        var type = req.params.type;
        var query =  getQuery(idOwner, agent_id, type);
        
        common.countTicketByQuery(query, (err, count)=>{
            if(err)
                return next(err);
            
            res.json( {count: count} );
        });
    }
];

/*
    @author: dientn
    get ticket 
*/
exports.getTickets = [
    (req, res, next)=>{
        var type = req.params.type;
        var agent_id = req.params.agent_id;
        if(agent_id != "all" && mongoose.Types.ObjectId.isValid(agent_id)){}
        if(type && !enums.adminTicketType[type]){
            return next(new TypeError("dashboard.type.not_found"));
        }
        next();
    },
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        var agent_id = req.params.agent_id == "all"? null: req.params.agent_id;
        var type = req.params.type;
        var query =  getQuery(idOwner, agent_id, type);
        
        var params = {
            query:query,
            sort:'upd_time',
            skip: req.query.skip,
            sort_order: req.query.sort_order|| -1,
            limit: req.query.limit
        };
        
        var tickets = common.getTicketByQuery(params, (err, tickets)=>{
            if(err){ return next(err);}
            res.json({ tickets: tickets } );
        });
    }
];

/*
    @author: dientn
    get Slas 
*/
exports.countSlas= [
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        var query = {
            ed_user_id: idOwner,
            "sla.deadline.agent_working_time": {$lt: +moment.utc()}
        };

        var tickets = common.countTicketByQuery( query, (err, count)=>{
            if(err){ return next(err);}
            res.json({ count: count });
        });
    }
];

/*
    @author: dientn
    get Slas 
*/
exports.getSlas =[
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        var options= {
            query : {
                ed_user_id: idOwner,
                "sla.deadline.agent_working_time": {$lt: +moment.utc()}
            },
            sort: "sla.deadline.agent_working_time",
            sort_order: 1
        };
        
        var tickets = common.getTicketByQuery(options, (err, tickets)=>{
            if(err){ return netx(err);}
            res.json( { tickets: tickets } );
        });
    }
];
