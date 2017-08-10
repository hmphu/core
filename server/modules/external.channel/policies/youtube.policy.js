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
        roles: [enums.UserRoles.owner, enums.UserRoles.admin],
        allows: [{
            resources: '/api/youtube/channel',
            permissions: ['get', 'post']
        }, {
            resources: '/api/youtube/channel/count',
            permissions: ['get']
        }, {
            resources: '/api/youtube/channel/:youtube_channel_id/toggle',
            permissions: ['put']
        }, {
            resources: '/api/youtube/channel/authorize',
            permissions: ['get']
        }, {
            resources: '/api/youtube/channel/authorize/callback',
            permissions: ['get']
        }, {
            resources: '/api/youtube/channel/authorize/subscribe',
            permissions: ['get']
        }, {
            resources: '/api/youtube/channel/:youtube_channel_id',
            permissions: ['get', 'put', 'delete']
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


exports.permissionFeatures = (req, res, next) =>{
    var settings = req.user.settings;
    if(settings.features && !settings.features.channels.youtube.is_active){
        return next(new TypeError('common.users.featured_disabled'));
    }
    return next();
};
