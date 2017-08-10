'use strict';

/**
 * Module dependencies.
 */
var enums = require('../../core/resources/enums.res'),
    errorHandler = require('../../core/controllers/errors.controller'),
    utils = require('../../core/resources/utils'),
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
            resources: '/api/slas',
            permissions: 'post'
        },{
            resources: '/api/slas/count',
            permissions: 'get'
        },{
            resources: '/api/slas/:slaId',
            permissions: '*'
        },{
            resources: '/api/slas/list/:is_active/:sla_sort_by',
            permissions: 'get'
        },{
            resources: '/api/slas/:slaId/clone',
            permissions: 'get'
        },{
            resources: '/api/slas/reorder/:biz_id_from/:biz_id_to',
            permissions: 'put'
        },{
            resources: '/api/slas/inactive/remove',
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
    var idOwner = utils.getParentUserId(req.user);
    if(settings.features && !settings.features.productivity.slas.is_active){
        return next(new TypeError('common.users.featured_disabled'));
    }
    return next();
};
