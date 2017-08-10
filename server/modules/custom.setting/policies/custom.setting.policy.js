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
            resources: '/api/custom-settings/count/:custom_type',
            permissions: 'get'
        },{
            resources: '/api/custom-settings/:custom_type',
            permissions: ['post', 'get']
        },{
            resources: '/api/custom-settings/inactive/remove/:custom_type',
            permissions: 'delete'
        },{
            resources: '/api/custom-settings/:custom_type/:custom_settingId',
            permissions: '*'
        },{
            resources: '/api/custom-settings/clone/:custom_type/:custom_settingId',
            permissions: 'get'
        },{
            resources: '/api/custom-settings/reorder/:custom_type/:cs_id_from/:cs_id_to',
            permissions: 'put'
        }]
    },{
        roles: [enums.UserRoles.agent], //owner vs admin
        allows: [{
            resources: '/api/custom-settings/count/:custom_type',
            permissions: 'get'
        },{
            resources: '/api/custom-settings/:custom_type',
            permissions: 'get'
        },{
            resources: '/api/custom-settings/:custom_type/:custom_settingId',
            permissions: 'get'
        },{
            resources: '/api/custom-settings/clone/:custom_type/:custom_settingId',
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

exports.permissionFeatures = (req, res, next) =>{
    var settings = req.user.settings;
    if(settings.features && !settings.features.productivity.custom_fields.is_active){
        return next(new TypeError('common.users.featured_disabled'));
    }
    return next();
};