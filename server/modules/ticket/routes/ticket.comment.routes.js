'use strict';

/**
 * Module dependencies.
 */
var ticketCommentPolicy = require('../policies/ticket.comment.policy'),
    ticketComment = require('../controllers/ticket.comment.controller');

module.exports = (app) => {
    // Single coupon routes
    app.route('/api/ticket-comments/:ticketId').all(ticketCommentPolicy.isAllowed)
        .get(ticketComment.list);
    app.route('/api/first-ticket-comments/:ticketId').all(ticketCommentPolicy.isAllowed)
        .get(ticketComment.firstComment);
    app.route('/api/ticket-child-comments-user-post/:ticketId/:comment_id').all(ticketCommentPolicy.isAllowed)
        .get(ticketComment.listChildCommentUserPost);
    app.route('/api/retry-ticket-comment/:ticketId/:comment_id').all(ticketCommentPolicy.isAllowed)
        .get(ticketComment.retryTicketComment);
    app.route('/api/ticket-child-comments/:ticketId/:comment_id').all(ticketCommentPolicy.isAllowed)
        .get(ticketComment.listChildComment);
    app.route('/api/list-ticket-comments/:ticketId').all(ticketCommentPolicy.isAllowed)
        .get(ticketComment.listTicketComment);
    app.route('/api/export-ticket-transcripts/:ticketId').all(ticketCommentPolicy.isAllowed)
        .post(ticketComment.ticketTranscript);
    app.route('/api/get-channel-by-ticket').all(ticketCommentPolicy.isAllowed)
        .get(ticketComment.getChannelByTicket);
    app.route('/api/get-ticket-comment/:ticketId/:comment_id').all(ticketCommentPolicy.isAllowed)
        .get(ticketComment.read);
};
