'use strict';
//
//  user.branding.policy.js
//  handle uer branding permission based on its routers
//
//  Created by dientn on 2015-12-25.
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
 * Invoke user branding Permissions
 */
exports.invokeRolesPolicies = () => {
    acl.allow([
        {
            roles: [enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.agent, enums.UserRoles.requester], //owner vs admin
            allows: [
                {
                    resources: '/api/user/branding',
                    permissions: 'get'
                }
            ]
        },{
            roles: [enums.UserRoles.owner, enums.UserRoles.admin], //owner vs admin
            allows: [
                {
                    resources: '/api/user/branding',
                    permissions: 'put'
                },
                {
                    resources: '/api/user/branding/reset/:type',
                    permissions: 'put'
                },
                {
                    resources: '/api/user/branding/change-subdomain',
                    permissions: 'put'
                }
            ]
        }
    ]);
};

/**
 * Check If user branding Policy Allows
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