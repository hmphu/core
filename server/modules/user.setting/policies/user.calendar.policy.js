'use strict';
//
//  user.calendar.policy.js
//  handle uer calendar permission based on its routers
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
 * Invoke user calendar Permissions
 */
exports.invokeRolesPolicies = () => {
    acl.allow([
        {
            roles: [enums.UserRoles.owner, enums.UserRoles.admin], //owner vs admin
            allows: [
                {
                    resources: '/api/user/calendar',
                    permissions: "get"
                },
                {
                    resources: '/api/user/calendar/toggle',
                    permissions: "put"
                },
                {
                    resources: '/api/user/holiday/:holiday_id',
                    permissions: ["put", "delete"]
                },
                {
                    resources: '/api/user/holiday',
                    permissions: "post"
                },
                {
                    resources: '/api/user/business-hour',
                    permissions: "put"
                }
            ]
        }
    ]);
};

/**
 * Check If user api Policy Allows
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

exports.permissionFeatures = (req, res, next) =>{
    var settings = req.user.settings;
    if(settings.features && !settings.features.productivity.business_hours.is_active){
        return next(new TypeError('common.users.featured_disabled'));
    }
    return next();
};