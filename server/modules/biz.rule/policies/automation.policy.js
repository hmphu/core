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
            resources: '/api/automations',
            permissions: 'post'
        },{
            resources: '/api/automations/count',
            permissions: 'get'
        },{
            resources: '/api/automations/list/:is_active/:auto_sort_by',
            permissions: 'get'
        },{
            resources: '/api/automations/:automationId',
            permissions: '*'
        },{
            resources: '/api/automations/:automationId/clone',
            permissions: 'get'
        },{
            resources: '/api/automations/reorder/:biz_id_from/:biz_id_to',
            permissions: 'put'
        },{
            resources: '/api/automations/inactive/remove',
            permissions: 'delete'
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
    if(settings.features && !settings.features.productivity.automations.is_active){
        return next(new TypeError('common.users.featured_disabled'));
    }
    return next();
};