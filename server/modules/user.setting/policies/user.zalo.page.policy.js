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
                resources: '/api/zalo/pages/token/add',
                permissions: 'post'
            }, {
                resources: '/api/zalo/pages/authorize/url',
                permissions: 'get'
            }, {
                resources: '/api/zalo/pages/list',
                permissions: 'get'
            }, {
                resources: '/api/zalo/pages/count',
                permissions: 'get'
            }, {
                resources: '/api/zalo/pages/:oaId',
                permissions: ['get', 'put', 'delete']
            }, {
                resources: '/api/zalo/pages/act/get-name',
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
