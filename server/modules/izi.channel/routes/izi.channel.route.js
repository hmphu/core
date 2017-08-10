'use strict';
/**
 * Module dependencies.
 */
var iziChannelPolicy = require('../policies/izi.channel.policy'),
    iziComment = require('../controllers/comment.controller'),
    iziChat = require('../controllers/chat.controller');

module.exports = (app) => {
    // izicomment collection routes
    app.route('/api/izi-comment/active').all(iziChannelPolicy.isAllowed)
        .get(iziChannelPolicy.permissionComment, iziComment.active);

    app.route('/api/izi-chat/active').all(iziChannelPolicy.isAllowed)
        .get(iziChannelPolicy.permissionChat, iziChat.active);

    app.route('/api/izi-chat/sync/groups').all(iziChannelPolicy.isAllowed)
        .get(iziChannelPolicy.permissionChat, iziChat.apiSyncGroups);

    app.route('/api/izi-chat/sync/users').all(iziChannelPolicy.isAllowed)
        .get(iziChannelPolicy.permissionChat, iziChat.apiSyncUsers);

    app.route('/api/izi-comment/sync/users').all(iziChannelPolicy.isAllowed)
        .get(iziChannelPolicy.permissionComment, iziComment.apiSyncUsers);
};
