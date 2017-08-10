'use strict';

/**
 * Module dependencies.
 */
var enums = require('../../core/resources/enums.res'),
    errorHandler = require('../../core/controllers/errors.controller'),
     _ = require('lodash'),
    acl = require('acl');

// Using the memory backend
acl = new acl(new acl.memoryBackend());

/**
 * Invoke Admin Permissions
 */
exports.invokeRolesPolicies = function() {
    acl.allow([{
        roles: [enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.agent], //owner vs admin
        allows: [{
            resources: '/api/people/user',
            permissions: ['post', 'get']
        }, {
            resources: '/api/people/count/user',
            permissions: ['get']
        }, {
            resources: '/api/people/user/:userId',
            permissions: ['put', 'get', 'delete']
        }, {
            resources: '/api/people/contact',
            permissions: 'get'
        }, {
            resources: '/api/people/requester-delete',
            permissions: 'delete'
        }, {
            resources: '/api/people/agent-ticket/:userId',
            permissions: 'get'
        }, {
            resources: '/api/people/users-delete/:agent_delete/:agent_assign',
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

/**
 * check authorization
 */
exports.isAuth = (req, res, next) => {
    if(req.body.roles == undefined){
        return next(new TypeError('people.user.body.invalid'));
    }
    //if user is admin or agent, check max_agent
    if((Array.isArray(req.body.roles) && req.body.roles[0] !== enums.UserRoles.requester) && req.user.settings.current_agent_no >= req.user.settings.max_agent_no){
        return next(new TypeError('people.user.max_agent'));
    }
    return next();
};

/**
 * checkRole
 */
exports.checkRole = (req, res, next) => {
 
    if(req.user._id.toString() != req.profile._id.toString()){
        if(req.user.roles[0] == enums.UserRoles.admin){
            if(_.indexOf([enums.UserRoles.owner, enums.UserRoles.admin], req.profile.roles[0]) != -1){
                return next(new TypeError('people.user.roles.invalid'));
            }
        }else if(req.user.roles[0] == enums.UserRoles.agent){
            //if(_.indexOf([enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.agent], req.profile.roles[0]) != -1){
            if(req.profile.roles[0] != enums.UserRoles.requester){
                return next(new TypeError('people.user.roles.invalid'));
            }
        }
    }else{

        if(req.user.roles[0] == enums.UserRoles.admin || req.user.roles[0] == enums.UserRoles.agent){
            if(req.body.roles){
                return next(new TypeError('people.user.roles.invalid'));
            }
        }
    }
    return next();
};

/**
 * checkRole
 */
exports.checkRoleAdd = (req, res, next) => {

    if(req.user.roles[0] == enums.UserRoles.admin){

        if(req.body.roles[0] == enums.UserRoles.owner){
            return next(new TypeError('people.user.roles.invalid'));
        }
        
    }else if(req.user.roles[0] == enums.UserRoles.agent){
        if(_.indexOf([enums.UserRoles.owner, enums.UserRoles.admin], req.body.roles[0]) != -1){
            return next(new TypeError('people.user.roles.invalid'));
        }
    }
    return next();
};
