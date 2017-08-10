'use strict';
//
//  sms.policy.js
//  handle sms permission based on its routers
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    utils = require('../../core/resources/utils'),
    acl = require('acl'),
    mongoose = require('mongoose'),
    Voip = mongoose.model('Voip'),
    enumsTicket = require('../../ticket/resources/enums'),
    enumsVoip = require('../resources/enums'),
    enums = require('../../core/resources/enums.res');

// Using the memory backend
acl = new acl(new acl.memoryBackend());

/**
 * Invoke Sms Permissions
 */
exports.invokeRolesPolicies = () => {
    acl.allow([
        {
            roles: [enums.UserRoles.owner, enums.UserRoles.admin], //owner vs admin vs agent
            allows: [
                {
                    resources: '/api/voip/report-agent-activity',
                    permissions: ['post']
                },{
                    resources: '/api/voip/report-queue-activity',
                    permissions: ['post']
                },{
                    resources: '/api/voip/report-missed-call',
                    permissions: ['post']
                }
            ]
        }, {
            roles: [enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.agent],
            allows: [
                {
                    resources: '/api/voip',
                    permissions: ['post']
                }, {
                    resources: '/api/voip/update-cdr',
                    permissions: ['post']
                }, {
                    resources: '/api/voip/list-history',
                    permissions: ['post']
                }, {
                    resources: '/api/voip/count-history',
                    permissions: ['post']
                }, {
                    resources: '/api/voip/get-register-ext',
                    permissions: ['get']
                }, {
                    resources: '/api/voip/convert-voip-to-ticket',
                    permissions: ['post']
                }
            ]
        }, {
            roles: [enums.UserRoles.owner, enums.UserRoles.admin], //owner vs admin vs agent
            allows: [
                {
                    resources: '/api/voip/softphone',
                    permissions: ['post']
                }
            ]
        }
    ]);
};

/**
 * Check If Sms Policy Allows
 */
exports.isAllowed = (req, res, next) => {
    var roles = req.user? req.user.roles : ['guest'];
    // Check for user roles
    acl.areAnyRolesAllowed(roles, req.route.path, req.method.toLowerCase(), (err, isAllowed) => {
        if (err) {
            // An authorization error occurred.
            return next(new TypeError('common.users.unauthorized'));
        } else {
            if (isAllowed) {
                // Access granted! Invoke next middleware
                return next();
            } else {
                return next(new TypeError('common.users.notgranted'));
            }
        }
    });
};

exports.preDataVoip = (req, res, next) =>{
    if (_.isEmpty(req.body)) {
        return next(new TypeError('voip.data.is_not_blank'));
    }

    if (req.body.model) {
        req.body = JSON.parse(req.body.model);

        if (req.files.attachments) {
            if (!req.body.comment) {
                return next(new TypeError('voip.upload.comment_content_is_no_blank'));
            }
        }
    }
    var idOwner = utils.getParentUserId(req.user);
    var callId = req.body.provider_data.call_id;
    
    Voip.findOne({ call_id : callId }, (err, result) => {
        if (err) {
            return next(err);
        }
        
        if (!result || !_.isEqual(result.ed_user_id, idOwner)) {
            return next(new TypeError('voip.voip_id.is_not_exists'));
        }
        
        if (result.ticket_id) {
            return next(new TypeError('voip.voip_id.is_convert_ticket'));
        }
        
        if (result.caller.call_type == enumsVoip.VoipType.incoming_call || result.caller.call_type == enumsVoip.VoipType.incoming_missed_call){
            req.body.agent_id = req.body.agent_id || result.caller.to;
            req.body.requester_id = result.caller.from;
            
            if (utils.isEmpty(req.body.subject)) {
                req.body.subject = `Call from ${result.phone_no.from}`;
            }
        } else {
            req.body.agent_id = req.body.agent_id || result.caller.from;
            req.body.requester_id = result.caller.to;
            
            if(utils.isEmpty(req.body.subject)) {
                req.body.subject = `Call to ${result.phone_no.to}`;
            }
        }
        
        if (req.files){
            req.body.comment.attachments = req.files.attachments;
        }

        req.body.user_id = result.caller.from;
        req.body.from = result.phone_no.from;
        req.body.to = result.phone_no.to;
        req.body.record_file = result.content.record_file;
        req.body.group_id = result.group_id ? result.group_id : undefined;
        req.body.call_id = callId;
        return next();
    });
};

exports.permissionFeatures = (req, res, next) =>{
    var settings = req.user.settings;
    if(settings.features && !settings.features.channels.voip.is_active){
        return next(new TypeError('common.users.featured_disabled'));
    }
    return next();
};

