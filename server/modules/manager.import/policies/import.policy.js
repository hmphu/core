'use strict';

/**
 * Module dependencies.
 */
var acl = require('acl'),
    path = require("path"),
    UserRoles = require(path.resolve('./modules/core/resources/enums.res')).UserRoles,
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// Using the memory backend
acl = new acl(new acl.memoryBackend());

/**
 * Invoke Admin Permissions
 */
exports.invokeRolesPolicies = function() {
    acl.allow([{
        roles: [UserRoles.owner, UserRoles.admin, UserRoles.agent], //owner vs admin and agent
        allows: [{
            resources: '/api/manager-import/ticket',
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
