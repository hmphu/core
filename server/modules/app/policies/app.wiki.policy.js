'use strict';

/**
 * Module dependencies.
 */
var enums = require('../../core/resources/enums.res'),
    acl = require('acl');

// Using the memory backend
acl = new acl(new acl.memoryBackend());

/**
 * Invoke User Permissions
 */
exports.invokeRolesPolicies = function() {
    acl.allow([
        {
        roles: [enums.UserRoles.owner, enums.UserRoles.admin], //owner vs admin
        allows: [
            {
                resources: '/api/app/wiki/category',
                permissions: ["get",'post']
            },{
                resources: '/api/app/wiki/section',
                permissions: ["get", 'post']
            },{
                resources: '/api/app/wiki/article',
                permissions: ["get", 'post']
            },{
                resources: '/api/app/wiki/category/:cat_id',
                permissions: ["get", 'put', 'delete']
            },{
                resources: '/api/app/wiki/section/:sec_id',
                permissions: ["get", 'put', 'delete']
            },{
                resources: '/api/app/wiki/article/:art_id',
                permissions: ["get", 'put', 'delete']
            },{
                resources: '/api/app/wiki/article/:art_id/file/:file_name',
                permissions: ['delete']
            },{
                resources: '/api/app/wiki/section-cate/:cate_id',
                permissions: ["get"]
            },{
                resources: '/api/app/wiki/article-sect/:sect_id',
                permissions: ["get"]
            },{
                resources: '/api/app/wiki/sect-opts',
                permissions: ["get"]
            },{
                resources: '/api/app/wiki/report/top',
                permissions: ["get"]
            },{
                resources: '/api/app/wiki/report/user/:user_id',
                permissions: ["get"]
            },
            ]
        },
        {
        roles: [enums.UserRoles.agent], //owner vs admin
        allows: [
            {
                resources: '/api/app/wiki/category',
                permissions: ["get"]
            },{
                resources: '/api/app/wiki/section',
                permissions: ["get"]
            },{
                resources: '/api/app/wiki/article',
                permissions: ["get"]
            },{
                resources: '/api/app/wiki/category/:cat_id',
                permissions: ["get"]
            },{
                resources: '/api/app/wiki/section/:sec_id',
                permissions: ["get", 'put', 'delete']
            },{
                resources: '/api/app/wiki/article/:art_id',
                permissions: ["get"]
            },{
                resources: '/api/app/wiki/section-cate/:cate_id',
                permissions: ["get"]
            },{
                resources: '/api/app/wiki/article-sect/:sect_id',
                permissions: ["get"]
            },{
                resources: '/api/app/wiki/sect-opts',
                permissions: ["get"]
            },{
                resources: '/api/app/wiki/report/top',
                permissions: ["get"]
            },{
                resources: '/api/app/wiki/report/user/:user_id',
                permissions: ["get"]
            }
        ]}
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
            return next(new TypeError('common.users.unauthorized'));
        } else {
            if (isAllowed) {
                // Access granted! Invoke next middleware
                return next();
            } else {
                return next(new TypeError('common.users.notgranted'));
            }
        }
    });
};

exports.permissionFeatures = (req, res, next) =>{
    var settings = req.user.settings;
    if(settings.features && !settings.features.applications.marketplace.is_active){
        return next(new TypeError('common.users.featured_disabled'));
    }
    return next();
};
