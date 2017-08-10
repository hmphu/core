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
        roles: [enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.agent], //owner vs admin vs agent
        allows: [{
            resources: '/api/user/profile', // update my account
            permissions: ['put', 'delete']
        }, {
            resources: '/api/user/password',
            permissions: 'post'
        },{
            resources: '/api/user/picture',
            permissions: 'post'
        }, {
            resources: '/api/user/me',
            permissions: 'get'
        }, {
            resources: '/api/user/accounts',
            permissions: 'delete'
        },{
            resources: '/api/auth/:userId/reset',
            permissions: 'get'
        }]
    },
    {
        roles: [enums.UserRoles.requester], //requester
        allows: [{
            resources: '/api/user/password',
            permissions: 'post'
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
