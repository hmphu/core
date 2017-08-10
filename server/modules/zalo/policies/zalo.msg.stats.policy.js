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
    acl.allow([
        {
            roles: [enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.agent],
            allows: [{
                resources: '/api/zalo/tickets/:ticket_id/act/solve-ticket',
                permissions: 'put'
            }, {
                resources: '/api/zalo/tickets/:id/act/last-comment',
                permissions: 'get'
            }, {
                resources: '/api/zalo/tickets/search',
                permissions: 'post'
            }, {
                resources: '/api/zalo/users/:userId/profile-image',
                permissions: 'get'
            }, {
                resources: '/api/zalo/users/:zalouid',
                permissions: 'get'
            }]
        }
    ]);
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
