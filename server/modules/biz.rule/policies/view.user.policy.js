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
        roles: [enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.agent],
        allows: [{
            resources: '/api/views-user',
            permissions: 'post'
        },{
            resources: '/api/views-user',
            permissions: 'get'
        },{
            resources: '/api/views-user/:view_user_id',
            permissions: '*'
        },{
            resources: '/api/views-user/:view_user_id/clone',
            permissions: '*'
        },{
            resources: '/api/views-user/inactive/remove/:isPersonal/:group_id',
            permissions: 'delete'
        },{
            resources: '/api/views-user/:is_active/:isPersonal/:sort_by/:group_id',
            permissions: 'get'
        },{
            resources: '/api/views-user/count/:is_active/:isPersonal/:group_id',
            permissions: 'get'
        },{
            resources: '/api/views-user/count/group',
            permissions: 'get'
        },{
            resources: '/api/views-user/reorder/:biz_id_from/:biz_id_to',
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
