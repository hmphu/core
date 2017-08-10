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
        roles: [enums.UserRoles.owner, enums.UserRoles.admin],
        allows: [{
            resources: '/api/google-play-app',
            permissions: ['post', 'delete']
        },{
            resources: '/api/google-play-app/list/:is_active/:sort_by',
            permissions: 'get'
        },{
            resources: '/api/google-play-app/count',
            permissions: 'get'
        },{
            resources: '/api/google-play-app/:google_app_id',
            permissions: ['get', 'put', 'delete']
        },{
            resources: '/api/google-play-app/toggle/:google_app_id',
            permissions: 'put'
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
