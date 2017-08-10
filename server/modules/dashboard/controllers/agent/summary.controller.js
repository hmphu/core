'use strict';
//
//  summary.agent.controller.js
//  handle dashboard summary data for agent
//
//  Created by dientn on 2016-02-24.
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
var common = require('../common.controller');
var enums = require('../../resources/enums.res');
var rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq'));
var voipEnums =  require('../../../voip/resources/enums');
var cache = require(path.resolve('./config/lib/redis.cache'));
var VoipSetting = mongoose.model('VoipSetting');
var config = require(path.resolve('./config/config'));

var getVoipRegisterExt = (idOwner, next) => {
    var query = {
        ed_user_id: idOwner
    };
    cache.findOneWithCache(idOwner, 'user.setting.voip', VoipSetting, query, (err, result) =>{
        if(err){
            return next(err);
        }
        if(!result){
            return next(null, []);
        }
        var params = {
            host: config.voip.host,
            path: '/ext_reg/json',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data : {
                "submission": {
                    "api_key": config.voip.api_key,
                    "api_secret": config.voip.api_secret,
                    "domain_name" : result.domain,
                }
            },
            is_https: true
        };
        http(params, (err, result) =>{
            if (err || !result.response) {
                return next(new TypeError(err));
            }
            var res_data = [];
            var data = result.response.registrations.map((e) =>{
                return e.user.substring(0, e.user.indexOf("@"));
            }).forEach((e) =>{
                if (res_data.indexOf(e) == -1) {
                    res_data.push(e);
                }
            })
            next(null, res_data);
        });
    });
};


 var countVoipByType = (user, call_type, next) => {
    var idOwner = utils.getParentUserId(user);
    var user_id = user._id;
     
    var todate = moment.utc();
     var options = {
         payload : {
            report: voipEnums.VoipReport.agent_activity,
            idOwner: idOwner,
            data: {
                agent_id: user_id,
                from_date: todate,
                to_date: todate
            }
        }
     };
    var callback = (err, result) =>{
        if(err){
            return next(err);
        }
        if(_.isEmpty(result)){
            return next(null, 0);
        }
        var sum = 0;
        switch(call_type){
            case enums.voipType.call_out:
            case enums.voipType.call_in:
                sum = result.call_accepted + result.total_talk_time + result.call_denied + result.call_denied;
                break;
            case enums.voipType.missied_call:
                sum = result.call_unhandled;
                break;
            case enums.voipType.success_call:
                sum = result.call_accepted;
                break;
        }
        next(null, sum);
    };
    
    if(call_type == enums.voipType.call_out){
        options.payload.data.call_type = voipEnums.VoipType.incoming_call;
    }else if(call_type == enums.voipType.call_in){
        options.payload.data.call_type = voipEnums.VoipType.outgoing_call;
    }
     
    rbSender(config.rabbit.sender.exchange.report, options, callback);
};
/*
    @author: dientn
    get stast by stats type(opend, resolve,....)
*/
exports.countStats = [
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        var type = req.params.type;
        var ticketStatus = ticketEnums.TicketStatus;
        var ticketRating = ticketEnums.TicketRating;
        var callback = (err, count)=>{
            if(err){
                return next(err)
            }
            res.json({count: count});
        };
        
        if(!enums.notifyType[type]){
            return next(new TypeError("dasboard.notify_type.not_found"));
        }
        
        switch(type){
            case enums.notifyType.open:
                common.countTicketByStatus(req.user, ticketStatus.Open, callback);
                break;
            case enums.notifyType.solved:
                common.countTicketByStatus(req.user, ticketStatus.Solved, callback);
                break;
            case enums.notifyType.reopen:
                common.countTicketReopen(req.user, callback);
                break;
            case enums.notifyType.good:
                common.countTicketByRating(req.user, ticketRating.Good, callback);
                break;
            case enums.notifyType.bad:
                common.countTicketByRating(req.user, ticketStatus.Bad, callback);
                break;
            case enums.notifyType.sla_late:
                common.countSlaLate(req.user, callback);
                break;
        }
    }
];

/*
    @author: dientn
    count  ticket by channel
*/
exports.countTickets = [
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        var channel = req.params.channel == 'all'? null : req.params.channel;
        var status = req.params.status;
        
        if(channel && !ticketEnums.Provider[channel]){
            return next(new TypeError("dashboard.channel.not_found"));
        }
        
        if(status ){
            status = _.capitalize(status);
            if(_.isUndefined(ticketEnums.TicketStatus[status]))
                return next(new TypeError("dashboard.status.not_found"));
        }
        
        var query = {
            ed_user_id: idOwner,
            agent_id: req.user._id,
            is_delete: false
        };
        
        if(channel)
            query.provider = channel;
        
        if(status )
            query.status = ticketEnums.TicketStatus[status];
        
        var callback = (err, count)=>{
            if(err){ return next(err);}
            res.json({counts: count});
        };
        
        common.countTicketByQuery(query, callback);
    }
];

/*
    @author: dientn
    count  ticket in group
*/
exports.countTicketsGroup = [
    (req, res, next)=>{
        var channel = req.params.channel;
        if(channel != "all" && !ticketEnums.Provider[channel]){
            return next(new TypeError("dashboard.channel.not_found"));
        }
        next();
    },
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        var channel = req.params.channel == "all" ? null: req.params.channel;

        common.getGroupOfUser(req.user, (err, groups)=>{
            if(err){
                return next(err);
            }
            
            if(_.isEmpty(groups)){
                return res.json({ count: 0});
            }
            groups = groups.map((group)=>{
                return group.group_id;
            });
            var query = {
                ed_user_id: idOwner,
                group_id: { $in: groups },
                $or:  [{agent_id: {$eq: null}}, { agent_id: {$exists: false }}],
                status:{$lt: ticketEnums.TicketStatus.Solved},
                is_delete: false
            };
            if(channel){
                query.provider = channel
            }

            common.countTicketByQuery(query, (err, count)=>{
                if(err){ return next(err); }
                res.json({ count: count} );
            });
        });
    }
];

/*
    @author: dientn
    count slas 
*/
exports.countSlas = [
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        
        var query = {
            ed_user_id: idOwner,
            agent_id: req.user._id,
            sla: {$exists: true},
            status:{$lt: ticketEnums.TicketStatus.Solved},
            is_delete: false
        };
        
        common.countTicketByQuery(query, (err, count)=>{
            if(err){ return next(err); }
            res.json({ count: count });
        });
    }
];

/*
    @author: dientn
    count ticket unanswered 
*/
exports.countTicketUnanswered = [
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        
        common.countTicketUnanswered(idOwner, req.user._id, (err, count)=>{
            if(err){ return next(err); }
            res.json({ count: count });
        });
    }
];

/*
    @author: dientn
    count ticket assigned
*/
exports.countTicketAssigned = [
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        var query = {
            ed_user_id: idOwner,
            agent_id: req.user._id,
            status:{$lt: ticketEnums.TicketStatus.Solved},
            is_delete: false
        };

        common.countTicketByQuery(query, (err, count)=>{
            if(err){ return next(err); }
            res.json({ count: count });
        });
    }
];


/*
    @author: dientn
    get ticket 
*/
exports.getTickets = [
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        var channel = req.params.channel == 'all'? null : req.params.channel;
        var status = req.params.status;
        
        if(channel && !ticketEnums.Provider[channel]){
            return next(new TypeError("dashboard.channel.not_found"));
        }
        
        if(status ){
            status = _.capitalize(status);
            if(_.isUndefined(ticketEnums.TicketStatus[status]))
                return next(new TypeError("dashboard.status.not_found"));
        }
        
        var options = {
            query : {
                ed_user_id: idOwner,
                agent_id: req.user._id,
                status:{$ne: ticketEnums.TicketStatus.Closed},
                is_delete: false
            },
            sort: 'upd_time',
            skip: req.query.skip,
            sort_order: req.query.sort_order || -1,
            limit: req.query.limit
        };
        
        if(channel)
            options.query.provider = channel;
        
        if(status)
            options.query.status = ticketEnums.TicketStatus[status];
        
        common.getTicketByQuery(options, (err, tickets)=>{
            if(err){ return next(err); }
            res.json({ tickets: tickets });
        });
    }
];

/*
    @author: dientn
    get ticket unanswered
*/
exports.getTicketUnanswered = [
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        
        common.getTicketUnanswered(idOwner, req.user._id, req.query, (err, tickets)=>{
            if(err){ return next(err); }
            res.json({ tickets: tickets });
        });
    }
];


/*
    @author: dientn
    get ticket assigned
*/
exports.getTicketAssigned = [
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        var params = {
            query : {
                ed_user_id: idOwner,
                agent_id: req.user._id,
                status:{$lt: ticketEnums.TicketStatus.Solved}
            },
            sort: 'upd_time',
            skip: req.query.skip,
            sort_order: req.query.sort_order || -1,
            limit: req.query.limit
        };
            
        common.getTicketByQuery(params, (err, tickets)=>{
            if(err){ return next(err); }
            res.json({ tickets: tickets });
        });
    }
];

/*
    @author: dientn
    get slas 
*/
exports.getSlas = [
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        
        var params = {
            query: {
                ed_user_id: idOwner,
                agent_id: req.user._id,
                sla: {$exists: true},
                status:{$lt: ticketEnums.TicketStatus.Solved}
            },
            sort: 'sla.deadline.agent_working_time',
            skip: req.query.skip,
            sort_order: req.query.sort_order || -1,
            limit: req.query.limit
        }
        
        common.getTicketByQuery(params, (err, tickets)=>{
            if(err){ return next(err); }
            res.json({ tickets: tickets });
        });
    }
];

/*
    @author: dientn
    get tickets assignee for group
*/
exports.getTicketsGroup = [
    (req, res, next)=>{
        var channel = req.params.channel;
        if(channel != "all" && !ticketEnums.Provider[channel]){
            return next(new TypeError("dashboard.channel.not_found"));
        }
        next();
    },
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        var channel = req.params.channel == "all" ? null: req.params.channel;
        
        common.getGroupOfUser(req.user, (err, groups)=>{
            if(err){
                return next(err);
            }
            var tickets = [];
            if(_.isEmpty(groups)){
                return res.json({tickets: tickets});
            }
            
            groups = groups.map((group)=>{
                return group.group_id;
            });
            var options = {
                query : {
                    ed_user_id: idOwner,
                    group_id: { $in: groups },
                    $or:  [{agent_id: {$eq: null}}, { agent_id: {$exists: false }}],
                    status:{$lt: ticketEnums.TicketStatus.Solved}
                },
                sort: 'upd_time',
                skip: req.query.skip,
                sort_order: req.query.sort_order || -1,
                limit: req.query.limit
            };
            
            if(channel)
                options.query.provider = channel;

            common.getTicketByQuery(options, (err, tickets)=>{
                if(err){ return next(err); }
                res.json({ tickets: tickets} );
            });
        });  
    }
];

exports.countVoipStats = [
    (req, res, next)=>{
        var idOwner = utils.getParentUserId(req.user);
        var call_type = req.params.call_type;
        countVoipByType(req.user, call_type, (err, count)=>{
            if(err) return next(err);
            
            res.json({count: count});
        });
    }  
];

exports.countAgentVoipOnline = [
    (req, res, next)=>{
        var idOwner = utils.getParentUserId(req.user);
        getVoipRegisterExt(idOwner, (err, result)=>{
            if(err) return next(err);
            
            res.json({count: result.length});
        });
    }  
];
