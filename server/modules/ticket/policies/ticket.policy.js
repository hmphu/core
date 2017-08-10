'use strict';
//
//  ticket.policy.js
//  handle ticket permission based on its routers
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    moment = require('moment'),
    acl = require('acl'),
    path = require('path'),
    mongoose = require('mongoose'),
    UserTicket = mongoose.model('UserTicket'),
    UserAgent= mongoose.model('UserAgent'),
    utils = require('../../core/resources/utils'),
    enums = require('../../core/resources/enums.res'),
    enumsTicket = require('../resources/enums'),
    cache = require(path.resolve('./config/lib/redis.cache')),
    errorHandler = require('../../core/controllers/errors.controller');

// Using the memory backend
acl = new acl(new acl.memoryBackend());

/**
 * Invoke Ticket Permissions
 */
exports.invokeRolesPolicies = () => {
    acl.allow([
        {
            roles: [enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.agent],
            allows: [
                {
                    resources: '/api/tickets',
                    permissions: ["post"]
                },{
                    resources: '/api/tickets-api',
                    permissions: ["post"]
                },{
                    resources: '/api/tickets-api/:ticketId',
                    permissions: ["put"]
                },
                {
                    resources: '/api/tickets/:ticketId',
                    permissions: ["get", "put", "delete"]
                },{
                    resources: '/api/tickets-search',
                    permissions: ['post']
                },{
                    resources: '/api/tickets-list',
                    permissions: ["get"]
                },{
                    resources: '/api/tickets-delete',
                    permissions: ['delete']
                },{
                    resources: '/api/ticket-comments/:ticketId',
                    permissions: ["get"]
                },{
                    resources: '/api/list-ticket-comments/:ticketId',
                    permissions: ["get"]
                },{
                    resources: '/api/export-ticket-transcripts/:ticketId',
                    permissions: ["post"]
                },{
                    resources: '/api/first-ticket-comments/:ticketId',
                    permissions: ["get"]
                },{
                    resources: '/api/tickets-hist/:ticketId',
                    permissions: ["get"]
                },{
                    resources: '/api/ticket-child-comments/:ticketId/:comment_id',
                    permissions: ["get"]
                },{
                    resources: '/api/retry-ticket-comment/:ticketId/:comment_id',
                    permissions: ["get"]
                },{
                    resources: '/api/ticket-child-comments-user-post/:ticketId/:comment_id',
                    permissions: ["get"]
                },{
                    resources: '/api/get-ticket-comment/:ticketId/:comment_id',
                    permissions: ["get"]
                },{
                    resources: '/api/get-channel-by-ticket',
                    permissions: ["get"]
                },{
                    resources: '/api/tickets-v2/:ticketId',
                    permissions: ["get", "put", "delete"]
                },{
                    resources: '/api/tickets-v2',
                    permissions: ["post"]
                },{
                    resources: '/api/retry-ticket-comment-v2/:ticketId/:commentId',
                    permissions: ["get"]
                },{
                    resources: '/api/tickets-delete-v2',
                    permissions: ['delete']
                },{
                    resources: '/api/tickets-v2-api',
                    permissions: ["post"]
                },{
                    resources: '/api/tickets-v2-api/:ticketId',
                    permissions: ["put"]
                }
            ]
        },{
            roles: [enums.UserRoles.guest],
            allows: [
                {
                    resources: '/api/tickets-rating/:ticketId_rating',
                    permissions: ["post"]
                }
            ]
        },{
            roles: [enums.UserRoles.requester],
            allows: [
                {
                    resources: '/api/tickets/:ticketId',
                    permissions: ["get"]
                },
                {
                    resources: '/api/ticket-comments/:ticketId',
                    permissions: ["get"]
                },{
                    resources: '/api/list-ticket-comments/:ticketId',
                    permissions: ["get"]
                },{
                    resources: '/api/export-ticket-transcripts/:ticketId',
                    permissions: ["post"]
                },{
                    resources: '/api/first-ticket-comments/:ticketId',
                    permissions: ["get"]
                },{
                    resources: '/api/ticket-child-comments-user-post/:ticketId/:comment_id',
                    permissions: ["get"]
                },{
                    resources: '/api/retry-ticket-comment/:ticketId/:comment_id',
                    permissions: ["get"]
                },{
                    resources: '/api/ticket-child-comments/:ticketId/:comment_id',
                    permissions: ["get"]
                }
            ]
        }
    ]);
};

/**
 * Check If Coupons Policy Allows
 */
exports.isAllowed = (req, res, next) => {
    var roles = req.user? req.user.roles : ['guest'];
    // Check for user roles
    acl.areAnyRolesAllowed(roles, req.route.path, req.method.toLowerCase(), function (err, isAllowed) {
        if (err) {
            // An authorization error occurred.
            return res.status(500).send({
                errors: errorHandler.getSingleMessage("common.users.unauthorized")
            });
        } else {
            if (isAllowed) {
                // Access granted! Invoke next middleware
                return next();
            } else {
                return res.status(403).json({
                    errors: errorHandler.getSingleMessage("common.users.notgranted")
                });
            }
        }
    });
};

/**
 * Get Ticket Settings
 */
exports.getTicketSettings = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: idOwner
    };
    cache.findOneWithCache(idOwner, 'user.setting.ticket', UserTicket, query, (err, result) =>{
        if(err){
            return next(err, 'ticket.get_ticket_setting');
        }
        if(!result){
            return next();
        }
        if(result.auto_assign_on_solved){
            if( utils.isEmpty(req.body.agent_id) && !utils.isEmpty(req.body.status) && req.body.status == enumsTicket.TicketStatus.Solved){
                req.body.agent_id = req.user._id;
            }
        }
        if(!result.allow_reassign_to_group && !utils.isEmpty(req.ticket)){
            let ticket_group_id = utils.isEmpty(req.ticket.group_id) ? null : req.ticket.group_id.toString();
            if(_.isEqual(req.body.group_id , ticket_group_id) && req.ticket.agent_id && utils.isEmpty(req.body.agent_id)){
                return next(new TypeError('ticket.agent_id.re_assign_to_group'));
            }
        }
        if(result.enable_requester && req.ticket && req.ticket.requester_id){
            req.body.requester_id = req.ticket.requester_id;
        }
        return next();
    });
};

/**
 * Get Ticket Settings
 * author: vupl
 */
exports.getAgentSettings = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: idOwner
    };
    cache.findOneWithCache(idOwner, 'user.setting.agent', UserAgent, query, (err, result) =>{
        if(err){
            return next(err, 'ticket.get_agent_ticket');
        }
        if(!result){
            return next();
        }
        if(!result.is_delete_ticket){
            if([enums.UserRoles.admin, enums.UserRoles.owner].indexOf(req.user.roles[0]) == -1){
                return next(new TypeError('ticket.agent_id.is_not_delete_ticket'));
            }
        }
        return next();
    });
};


/**
 * Pre data before add ticket
 * @author: Vupl
 */
exports.preDataAddTicket = (req, res, next) =>{
    if(_.isEmpty(req.body)){
        return next(new TypeError('ticket.data.not_to_blank'));
    }
    if(req.body.model){
        req.body = JSON.parse(req.body.model);
        if(req.files.attachments){
            if(!req.body.comment){
                return next(new TypeError('ticket.upload.comment_content_is_no_blank'));
            }
        }
    }
    // remove sensitive data if any
    //TODO: remove later
    //delete req.body.provider;
    //delete req.body.provider_data;
    delete req.body.is_delete;
    delete req.body.add_time;
    delete req.body.upd_time;
    delete req.body.solved_date;
    delete req.body.sla_date;
    delete req.body.comment.is_delete;
    delete req.body.comment.is_first;
    delete req.body.comment.is_requester;
    delete req.body.comment.add_time;
    delete req.body.comment.upd_time;
    if(utils.isEmpty(req.body.tags)){
        delete req.body.tags;
    } else {
        if(_.isArray(req.body.tags)){
            req.body.tags = (req.body.tags || []).filter((item) =>{
                if(utils.isEmpty(item)){
                    delete req.body.tags[item];
                }
                return item;
            });
        }
    }
    if(utils.isEmpty(req.body.priority)){
        delete req.body.priority;
    }
    if(utils.isEmpty(req.body.type)){
        delete req.body.deadline;
        delete req.body.type;
    } else {
        if(req.body.type != enumsTicket.TicketType.Tasks || utils.isEmpty(req.body.deadline)){
            delete req.body.deadline;
        } else {
            req.body.deadline = req.body.deadline;
        }
    }
    req.body.status_date = +moment.utc();
    if(req.body.status == enumsTicket.TicketStatus.Solved){
        req.body.solved_date = +moment.utc();
    }
    // prepare data and validate
    var idOwner = utils.getParentUserId(req.user);
    // case for Boomerang
    if(utils.isEmpty(req.body.submitter_id)){
            req.body.submitter_id = req.user._id;
    } else {
        req.body.submitter_id = req.body.submitter_id;
    }
    req.body.ed_user_id = idOwner;
    if(req.body.comment){
        req.body.comment_time = +moment.utc();
        if(req.files){
            req.body.comment.attachments = req.files.attachments;
        }
        if(utils.isEmpty(req.body.submitter_id)){
            req.body.comment.user_id = req.user._id;
            req.body.comment.is_requester = false;
        } else {
            req.body.comment.user_id = req.body.submitter_id;
            req.body.comment.is_requester = req.body.is_requester ? true : false;
        }
        //TODO: remove later
        /*if(utils.isEmpty(req.body.comment.provider)){ // remove provider and provider data if empty
            delete req.body.comment.provider;
            delete req.body.comment.provider_data;
        }*/
        //TODO: remove later
        req.body.comment.provider = req.body.comment.provider;
        req.body.comment.provider_data = req.body.comment.provider_data;
    }
    return next();
};

/**
 * Pre data before update ticket
 * @author: Vupl
 */
exports.preDataEditTicket = (req, res, next) =>{
    if(_.isEmpty(req.body)){
        return next(new TypeError('ticket.data.not_to_blank'));
    }
    if(req.body.model){
        req.body = JSON.parse(req.body.model);
        if(req.files.attachments){
            if(!req.body.comment){
                return next(new TypeError('ticket.upload.comment_content_is_no_blank'));
            }
        }
    }
    //remove sensitive data if any
    delete req.body.provider;
    delete req.body.provider_data;
    delete req.body.is_delete;
    delete req.body.add_time;
    delete req.body.upd_time;
    delete req.body.solved_date;
    delete req.body.sla_date;
    if(req.body.comment){
        delete req.body.comment.is_internal;
        delete req.body.comment.is_delete;
        delete req.body.comment.is_first;
        //TODO
//        delete req.body.comment.is_requester;
        delete req.body.comment.add_time;
        delete req.body.comment.upp_time;
    }
    if(utils.isEmpty(req.body.type)){
        delete req.body.deadline;
        delete req.body.type;
    } else {
        if(req.body.type != enumsTicket.TicketType.Tasks || utils.isEmpty(req.body.deadline)){
            delete req.body.deadline;
        } else {
            req.body.deadline = req.body.deadline;
        }
    }
    if(req.body.status == enumsTicket.TicketStatus.Solved && req.ticket.status != enumsTicket.TicketStatus.Solved && !req.ticket.solved_date){
        req.body.solved_date = +moment.utc();
    } else if (req.body.status != enumsTicket.TicketStatus.Solved && req.ticket.status == enumsTicket.TicketStatus.Solved){
        req.body.solved_date = undefined;
    }
    if(req.body.status != req.ticket.status){
        req.body.status_date = +moment.utc();
    }
    if(utils.isEmpty(req.body.priority)){
        req.body.priority = null;
    }
    if(utils.isEmpty(req.body.type)){
        req.body.type = null;
    }
    if(utils.isEmpty(req.body.tags)){
        req.body.tags = null;
    } else {
        if(_.isArray(req.body.tags)){
            req.body.tags = (req.body.tags || []).filter((item) =>{
                if(utils.isEmpty(item)){
                    delete req.body.tags[item];
                }
                return item;
            });
        }
    }
    // prepare data and validate
    if(utils.isEmpty(req.body.ed_user_id)){
        req.body.ed_user_id = req.ticket.ed_user_id;
    }
    if(req.body.comment && !utils.isEmpty(req.body.comment.content)){
        req.body.comment_time = +moment.utc();
        if(req.files){
            req.body.comment.attachments = req.files.attachments;
        }
        //TO DO:
        //req.body.comment.user_id = req.user._id
        req.body.comment.user_id = req.body.comment.user_id ? req.body.comment.user_id : req.user._id;
        req.body.comment.is_requester = req.body.comment.is_requester ? req.body.comment.is_requester : false;
        if(utils.isEmpty(req.body.comment.content)){
            return next(new TypeError('ticket.comment_content.is_no_blank'));
        }
        if(utils.isEmpty(req.body.comment.provider)){ // remove provider and provider data if empty
            delete req.body.comment.provider;
            delete req.body.comment.provider_data;
        }
        if(req.body.comment.provider == enumsTicket.Provider.iziMail){
            let ticket = req.ticket.toObject();
            req.body.provider_data = ticket.provider_data ? ticket.provider_data : {};
            req.body.provider_data.ex_to = req.body.comment.provider_data.ex_to;
            req.body.provider_data.ex_watchers = req.body.comment.provider_data.ex_watchers;
        }
    } else {
        req.body.user_id = req.user._id;
    }
    return next();
};
