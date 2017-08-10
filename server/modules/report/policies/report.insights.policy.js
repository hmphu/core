'use strict';

/**
 * Module dependencies.
 */
var enums = require('../../core/resources/enums.res'),
    errorHandler = require('../../core/controllers/errors.controller'),
    acl = require('acl');

// Using the memory backend
acl = new acl(new acl.memoryBackend());

/**
 * Invoke Admin Permissions
 */
exports.invokeRolesPolicies = function() {
    acl.allow([{
        roles: [enums.UserRoles.owner, enums.UserRoles.admin], //owner vs admin
        allows: [{
            resources: '/api/reports',
            permissions: 'post'
        },{
            resources: '/api/reports/:reportId/clone',
            permissions: 'get'
        },{
            resources: '/api/reports/inactive/remove',
            permissions: 'delete'
        },{
            resources: '/api/reports/toggle/:reportId',
            permissions: 'put'
        }]
    },{
        roles: [enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.agent],
        allows: [{
            resources: '/api/reports/count',
            permissions: 'get'
        },{
            resources: '/api/reports/list/:is_active',
            permissions: 'get'
        }]
    },{
        roles: [enums.UserRoles.owner, enums.UserRoles.admin], //owner vs admin
        allows: [{
            resources: '/api/reports/:reportId',
            permissions: '*'
        }]
    },{
        roles: [enums.UserRoles.agent],
        allows: [{
            resources: '/api/reports/:reportId',
            permissions: 'get'
        }]
    }]);
};

/**
 * Check If Admin Policy Allows
 */
exports.isAllowed = function(req, res, next) {
    var roles = (req.user) ? req.user.roles : ['guest'];

    // Check for user roles
    acl.areAnyRolesAllowed(roles, req.route.path, req.method.toLowerCase(), function (err, isAllowed) {
        if (err) {
            // An authorization error occurred.
            return next(new TypeError("common.users.unauthorized"));
        } else {
            if (isAllowed) {
                // Access granted! Invoke next middleware
                return next();
            } else {
                return next(new TypeError("common.users.notgranted"));
            }
        }
    });
};

exports.permissionFeatures = (req, res, next) =>{
    var settings = req.user.settings;
    if(settings.features && !settings.features.reports.insights.is_active){
        return next(new TypeError('common.users.featured_disabled'));
    }
    return next();
};

