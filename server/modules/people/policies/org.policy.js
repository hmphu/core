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
            resources: '/api/people/organizations',
            permissions: ['post', 'get']
        },
        {
            resources: '/api/people/organizations/count',
            permissions: ['get']
        }, {
            resources: '/api/people/organizations/:org_id',
            permissions: ['get','put', 'delete']
        }]
    },
    {
        roles: [enums.UserRoles.agent],
        allows: [{
            resources: '/api/people/organizations',
            permissions: ['get']
        }]
    },{
        roles: [enums.UserRoles.agent, enums.UserRoles.owner, enums.UserRoles.admin],
        allows: [{
            resources: '/api/people/organizations/:org_id_search/requester',
            permissions: ['get']
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
