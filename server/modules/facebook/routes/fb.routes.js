'use strict';
//
//  fb.routes.js
//  handle fb realtime
//
//  Created by thanhdh on 2016-02-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var fbSender = require('../controllers/fb.sender.controller'),
    fb = require('../controllers/fb.controller'),
    fbPolicy = require('../policies/fb.policy'),
    upload = require('../../core/resources/upload');

var messagerUploadOpts = {
    mimetype : "image/gif, image/jpeg, image/png, text/plain, application/pdf, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-powerpointtd, application/vnd.openxmlformats-officedocument.presentationml.presentation, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/msword, application/vnd.oasis.opendocument.text, application/vnd.oasis.opendocument.spreadsheet",
    array: {fieldname: "attachments", maxCount: 10}
};

var commentUploadOpts = {
    mimetype : "image/gif, image/jpeg, image/png",
    array: {fieldname: "attachments", maxCount: 1}
};

module.exports = function (app) {
    app.route('/api/fb/list-comment/:page_id').all(fbPolicy.isAllowed)
        .get(fbSender.listCommentByPageId);

    app.route('/api/fb/list-comment-user-post').all(fbPolicy.isAllowed)
        .post(fbSender.listCommentUserPost);
    
    app.route('/api/fb/list-comment-wall-post').all(fbPolicy.isAllowed)
        .post(fbSender.listCommentWallPost);

    app.route('/api/fb/list-comment-ticket/:fb_ticket_id').all(fbPolicy.isAllowed)
        .get(fbSender.getListCommentByTicketId);

    app.route('/api/fb/list-message-ticket/:fb_ticket_id').all(fbPolicy.isAllowed)
        .get(fbSender.getListMessageByTicketId);

    app.route('/api/fb/list-comment-replies/:comment_id').all(fbPolicy.isAllowed)
        .get(fbSender.getListReplyByComment);
    app.route('/api/fb/loadmore-replies/:comment_id').all(fbPolicy.isAllowed)
        .get(fbSender.loadMoreReplies);
    app.route('/api/fb/list-conversation').all(fbPolicy.isAllowed)
        .post(fbSender.listConversation);

    app.route('/api/fb/list-message/:fb_ticket_id').all(fbPolicy.isAllowed)
        .get(fbSender.getListMessageByTicketId);
    
    app.route('/api/fb/post/:post_id').all(fbPolicy.isAllowed)
        .get(fbSender.getPost);

    app.route('/api/fb/last-comment/:comment_type/:fb_ticket_id').all(fbPolicy.isAllowed)
        .get(fbSender.getLastTicketComment);

    app.route('/api/fb/like/:comment_id/:is_like').all(fbPolicy.isAllowed)
        .get(fbSender.likeComment);
    app.route('/api/fb/hidden/:comment_id/:is_hidden').all(fbPolicy.isAllowed)
        .get(fbSender.toggleComment);

    // send comment message
    app.route('/api/fb/send-conversation/:fb_ticket_id').all(fbPolicy.isAllowed)
        .post(upload(messagerUploadOpts), fbSender.sendConversation);
    app.route('/api/fb/comment-to-post/:type').all(fbPolicy.isAllowed)
        .post(upload(commentUploadOpts), fbSender.sendComment);
    app.route('/api/fb/replies-comment/:comment_id/:type').all(fbPolicy.isAllowed)
        .post(upload(commentUploadOpts), fbSender.sendRepliesComment);

    app.route('/api/fb/get-facebook-name/:id/:is_page').all(fbPolicy.isAllowed)
        .get(fb.getFacebookName);
    app.route('/api/fb/get-original-post/:post_id').all(fbPolicy.isAllowed)
        .get(fb.getOriginalPost);
    app.route('/api/fb/get-user-name-facebook/:user_id').all(fbPolicy.isAllowed)
        .get(fb.getUserNameFacebook);
    app.route('/api/fb/count-message-conversation/:page_id/:conversation_id').all(fbPolicy.isAllowed)
        .get(fbSender.countMessageOfConversation);

    app.route('/api/fb/solved-ticket/:fb_ticket_id').all(fbPolicy.isAllowed)
        .post(fbSender.solvedTicket);

    app.route('/api/fb/get-conversation-by-thread-id/:page_id/:thread_id').all(fbPolicy.isAllowed)
        .get(fbSender.getConversationByThreadId);
};
