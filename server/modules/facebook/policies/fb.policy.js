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
        roles: [enums.UserRoles.owner, enums.UserRoles.admin, enums.UserRoles.agent], //owner, admin, agent
        allows: [{
            resources: '/api/fb/list-wall-post',
            permissions: ['get']
        },{
            resources: '/api/fb/list-wall-user-post',
            permissions: ['get']
        }, {
            resources: '/api/fb/list-comment',
            permissions: ['post']
        },{
            resources: '/api/fb/list-comment-user-post',
            permissions: ['post']
        },{
            resources: '/api/fb/list-comment-wall-post',
            permissions: ['post']
        }, {
            resources: '/api/fb/list-comment-ticket/:fb_ticket_id',
            permissions: ['get']
        },{
            resources: '/api/fb/list-message-ticket/:fb_ticket_id',
            permissions: ['get']
        }, {
            resources: '/api/fb/loadmore-comment/:post_id',
            permissions: ['get']
        }, {
            resources: '/api/fb/list-comment-replies/:comment_id',
            permissions: ['get']
        }, {
            resources: '/api/fb/loadmore-replies/:comment_id',
            permissions: ['get']
        }, {
            resources: '/api/fb/list-conversation',
            permissions: ['post']
        }, {
            resources: '/api/fb/list-message/:fb_ticket_id',
            permissions: ['get']
        },{
            resources: '/api/fb/check-convert-conversation',
            permissions: ['post']
        },{
            resources: '/api/fb/post/:post_id',
            permissions: ['get']
        },{
            resources: '/api/fb/last-comment/:comment_type/:fb_ticket_id',
            permissions: ['get']
        }, {
            resources: '/api/fb/send-conversation/:fb_ticket_id',
            permissions: ['post']
        }, {
            resources: '/api/fb/comment-to-post/:type',
            permissions: ['post']
        }, {
            resources: '/api/fb/replies-comment/:comment_id/:type',
            permissions: ['post']
        },{
            resources: '/api/fb/convert-comment/:comment_id',
            permissions: ['get']
        },{
            resources: '/api/fb/convert-replies-comment/:reply_comment_id',
            permissions: ['get']
        },{
            resources: '/api/fb/convert-conversation/:conversation_id',
            permissions: ['get']
        },{
            resources: '/api/fb/fetch',
            permissions: ['get']
        },{
            resources: '/api/fb/like/:comment_id/:is_like',
            permissions: ['get']
        },{
            resources: '/api/fb/hidden/:comment_id/:is_hidden',
            permissions: ['get']
        },{
            resources: '/api/fb/get-facebook-name/:id/:is_page',
            permissions: ['get']
        },{
            resources: '/api/fb/get-original-post/:post_id',
            permissions: ['get']
        },{
            resources: '/api/fb/get-user-name-facebook/:user_id',
            permissions: ['get']
        },{
            resources: '/api/fb/count-message-conversation/:page_id/:conversation_id',
            permissions: ['get']
        },{
            resources: '/api/fb/solved-ticket/:fb_ticket_id',
            permissions: ['post']
        },{
            resources: '/api/fb/get-conversation-by-thread-id/:page_id/:thread_id',
            permissions: ['get']
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
