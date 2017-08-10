'use strict';

/**
 * Module dependencies.
 */
var enums = require('../../core/resources/enums.res'),
    acl = require('acl');

// Using the memory backend
acl = new acl(new acl.memoryBackend());

/**
 * Invoke Admin Permissions
 */
exports.invokeRolesPolicies = function() {
    acl.allow([{
        roles: [enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.agent ], //owner vs admin
        allows: [
            {
                resources: '/api/dashboard/stats/:type',
                permissions: "get"
            },
            {
                resources: '/api/dashboard/count/ticket/:channel',
                permissions: "get"
            },
            {
                resources: '/api/dashboard/ticket/:channel',
                permissions: "get"
            },
            {
                resources: '/api/dashboard/ticket-group/:channel',
                permissions: "get"
            },
            {
                resources: '/api/dashboard/count/ticket-group/:channel',
                permissions: "get"
            },
            {
                resources: '/api/dashboard/ticket-unanswered',
                permissions: "get"
            },
            {
                resources: '/api/dashboard/count/ticket-unanswered',
                permissions: "get"
            },
             {
                resources: '/api/dashboard/ticket-assigned',
                permissions: "get"
            },
            {
                resources: '/api/dashboard/count/ticket-assigned',
                permissions: "get"
            },
            {
                resources: '/api/dashboard/count/sla',
                permissions: "get"
            },
            {
                resources: '/api/dashboard/sla',
                permissions: "get"
            },
            {
                resources: '/api/dashboard/profile',
                permissions: "get"
            },
            {
                resources: '/api/dashboard/voip-agent',
                permissions: "get"
            },
            {
                resources: '/api/dashboard/voip-stats/:voip_type',
                permissions: "get"
            },
            {
                resources: '/api/dashboard/sys-notify',
                permissions: "get"
            }
        ]
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
