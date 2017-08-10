'use strict';

/**
 * Module dependencies.
 */
var enums = require('../../core/resources/enums.res'),
    acl = require('acl');

// Using the memory backend
acl = new acl(new acl.memoryBackend());

/**
 * Invoke User Permissions
 */
exports.invokeRolesPolicies = function() {
    acl.allow([{
        roles: [enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.agent], //owner vs admin
        allows: [
            {
                resources: '/api/apps/quick-update/list',
                permissions: "get"
            },
            {
                resources: '/api/apps/quick-update/count',
                permissions: "get"
            },
            {
                resources: '/api/apps/quick-update/report',
                permissions: "post"
            },
            {
                resources: '/api/apps/quick-update/update',
                permissions: "post"
            },
            {
                resources: '/api/apps/quick-update/export',
                permissions: "post"
            }
        ]
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
    if(settings.features && !settings.features.applications.marketplace.is_active){
        return next(new TypeError('common.users.featured_disabled'));
    }
    return next();
};
