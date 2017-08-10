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
var acl = require('acl'),
    enums = require('../../core/resources/enums.res'),
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
                },{
                    resources: '/api/get-channel-by-ticket',
                    permissions: ["get"]
                },{
                    resources: '/api/get-ticket-comment/:ticketId/:comment_id',
                    permissions: ["get"]
                }
            ]
        },
        {
            roles: [enums.UserRoles.requester],
            allows: [
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
