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
            resources: '/api/people/groups/:groupId/users',
            permissions: ['post', 'get']
        },{
            resources: '/api/people/groups/:groupId/users/:userId',
            permissions: ['put', 'delete']
        },{
            resources: '/api/people/groups/:userId/groups',
            permissions: ['get']
        },{
            resources: '/api/people/groups/list/agents',
            permissions: ['get']
        }]
    },{
        roles: [enums.UserRoles.agent], //owner vs admin
        allows: [
            {
                resources: '/api/people/groups/:userId/groups',
                permissions: ['get']
            },{
                resources: '/api/people/groups/list/agents',
                permissions: ['get']
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
