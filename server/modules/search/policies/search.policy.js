'use strict';

/**
 * Module dependencies.
 */
var enums = require('../../core/resources/enums.res');
var Acl = require('acl');

// Using the memory backend
var acl = new Acl(new Acl.memoryBackend());

/**
 * Invoke Admin Permissions
 */
exports.invokeRolesPolicies = function() {
    acl.allow([{
        roles : [enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.agent],
        allows : [{
            resources : '/api/search',
            permissions : ['get', 'post']
        }]
    }]);
};

/**
 * Check If Admin Policy Allows
 */
exports.isAllowed = function(req, res, next) {
    var roles = req.user ? req.user.roles : ['guest'];

    // Check for user roles
    acl.areAnyRolesAllowed(roles, req.route.path, req.method.toLowerCase(), function(err, isAllowed) {
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
