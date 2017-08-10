'use strict';
//
//  user.mail.account.policy.js
//  handle sms permission based on its routers
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var acl = require('acl'),
    enums = require('../../core/resources/enums.res');

// Using the memory backend
acl = new acl(new acl.memoryBackend());

/**
 * Invoke User mail account Permissions
 */
exports.invokeRolesPolicies = () => {
    acl.allow([
        {
            roles: [enums.UserRoles.owner, enums.UserRoles.admin], //owner vs admin
            allows: [
                {
                    resources: '/api/user/mail-accounts',
                    permissions: ["get", "post"]
                },
                {
                    resources: '/api/user/mail-accounts/:mailId',
                    permissions: ["put", "delete"]
                },
                {
                    resources: '/api/user/mail-accounts/make-default/:mailId',
                    permissions: "put"
                },
                {
                    resources: '/api/user/mail-accounts/verify/:mailId',
                    permissions: "get"
                }
            ]
        },{
            roles: [enums.UserRoles.agent],
            allows: [
                {
                    resources: '/api/user/mail-accounts',
                    permissions: "get"
                }
            ]
        }
    ]);
};

/**
 * Check If mail account Policy Allows
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