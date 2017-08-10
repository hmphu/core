'use strict';
//
//  fb_page.policy.js
//  handle fb_page permission based on its routers
//
//  Created by khanhpq on 2015-12-17.
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
 * Invoke fb_page Permissions
 */
exports.invokeRolesPolicies = () => {
        acl.allow([
        {
            roles: [enums.UserRoles.owner, enums.UserRoles.admin], //owner vs admin
            allows: [
                {
                    resources: '/api/fb-pages/:fb_page_id/toggle',
                    permissions: 'put'
                }
            ]
        },{
            roles: [enums.UserRoles.owner, enums.UserRoles.admin], //owner vs admin
            allows: [
                {
                    resources: '/api/fb-pages/:fb_page_id',
                    permissions: ['delete', 'get','put']
                }
            ]
        },{
            roles: [enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.guest], //fb callback
            allows: [
                {
                    resources: '/api/fb-pages/callback',
                    permissions: "get"
                }
            ]
        },{
            roles: [enums.UserRoles.owner, enums.UserRoles.admin],
            allows: [
                {
                    resources: '/api/fb-pages',
                    permissions: "post"
                }
            ]
        },{
            roles: [enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.agent],
            allows: [
                {
                    resources: '/api/fb-pages',
                    permissions: "get"
                },{
                    resources: '/api/fb-pages/count',
                    permissions: "get"
                }
            ]
        }
    ]);
};

/**
 * Check If fb_page Policy Allows
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
    if(settings.features && !settings.features.channels.facebooks.is_active){
        return next(new TypeError('common.users.featured_disabled'));
    }
    return next();
};