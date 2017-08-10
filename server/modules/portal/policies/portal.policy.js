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
    utils = require('../../core/resources/utils'),
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
            roles: [enums.UserRoles.requester],
            allows: [
                {
                    resources: '/api/portal/ticket/view/:ticket_id',
                    permissions: ["get"]
                },
                {
                    resources: '/api/portal/ticket/list',
                    permissions: ["get"]
                },
                {
                    resources: '/api/portal/ticket/count',
                    permissions: ["get"]
                },{
                    resources: '/api/portal/ticket/export',
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