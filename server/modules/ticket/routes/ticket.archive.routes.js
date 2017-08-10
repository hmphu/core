'use strict';

/**
 * Module dependencies.
 */
var ticketArchivePolicy = require('../policies/ticket.archive.policy'),
    ticketArchive = require('../controllers/ticket.archive.controller');

module.exports = (app) => {
//    // Single coupon routes
//    app.route('/api/ticket-archive/cron').all(ticketArchivePolicy.isAllowed)
//        .get(ticketArchive.exec);
    
    // Single coupon routes
    app.route('/api/ticket-archive/:id_ticket/:id_archive').all(ticketArchivePolicy.isAllowed)
        .get(ticketArchive.moveByTicketId);
    
    // Single coupon routes
    app.route('/api/ticket-archive/list').all(ticketArchivePolicy.isAllowed)
        .get(ticketArchive.list);
    
    // Single coupon routes
    app.route('/api/ticket-archive/count').all(ticketArchivePolicy.isAllowed)
        .get(ticketArchive.count);
    // export archive
    app.route('/api/ticket-archive/export').all(ticketArchivePolicy.isAllowed)
        .get(ticketArchive.exportExcel);
    
    // Single coupon routes
    app.route('/api/ticket-archive-delete').all(ticketArchivePolicy.isAllowed)
        .delete(ticketArchive.removeTicketArchive);
    
    // Single coupon routes
//    app.route('/api/ticket-archive/delete-expried').all(ticketArchivePolicy.isAllowed)
//        .delete(ticketArchive.removeTicketExpried);
};
