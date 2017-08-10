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
            resources: '/api/triggers',
            permissions: 'post'
        },{
            resources: '/api/triggers/count',
            permissions: 'get'
        },{
            resources: '/api/triggers/list/:is_active/:trigger_sort_by',
            permissions: 'get'
        },{
            resources: '/api/triggers/:triggerId',
            permissions: '*'
        },{
            resources: '/api/triggers/:triggerId/clone',
            permissions: 'get'
        },{
            resources: '/api/triggers/reorder/:biz_id_from/:biz_id_to',
            permissions: 'put'
        },{
            resources: '/api/triggers/inactive/remove',
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
    if(settings.features && !settings.features.productivity.triggers.is_active){
        return next(new TypeError('common.users.featured_disabled'));
    }
    return next();
};