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
var acl = require('acl'),
    enums = require('../../core/resources/enums.res');

// Using the memory backend
acl = new acl(new acl.memoryBackend());

/**
 * Invoke Sms Permissions
 */
exports.invokeRolesPolicies = () => {
    acl.allow([
        {
            roles: [enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.agent], //owner vs admin
            allows: [
                {
                    resources: '/api/voip-settings',
                    permissions: '*'
                },{
                    resources: '/api/voip-settings/:voipSettingId',
                    permissions: '*'
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

exports.permissionFeatures = (req, res, next) =>{
    var settings = req.user.settings;
    if(settings.features && !settings.features.channels.voip.is_active){
        return next(new TypeError('common.users.featured_disabled'));
    }
    return next();
};

