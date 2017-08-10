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
        roles: [UserRoles.owner, UserRoles.admin], //owner vs admin
        allows: [{
            resources: '/api/izi-comment/active',
            permissions: 'get'
        }, {
            resources: '/api/izi-chat/active',
            permissions: 'get'
        }, {
            resources: '/api/izi-chat/sync/groups',
            permissions: 'get'
        }, {
            resources: '/api/izi-chat/sync/users',
            permissions: 'get'
        }, {
            resources: '/api/izi-comment/sync/users',
            permissions: 'get'
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

exports.permissionChat = (req, res, next) =>{
    var settings = req.user.settings;
    if(settings.features && !settings.features.channels.izi_chat.is_active){
        return next(new TypeError('common.users.featured_disabled'));
    }
    return next();
};

exports.permissionComment = (req, res, next) =>{
    var settings = req.user.settings;
    if(settings.features && !settings.features.channels.izi_comment.is_active){
        return next(new TypeError('common.users.featured_disabled'));
    }
    return next();
};