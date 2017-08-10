'use strict';

/**
 * Module dependencies.
 */
var portalPolicy = require('../policies/portal.policy'),
    portal = require('../controllers/portal.controller');

module.exports = (app) => {
    // Single ticket routes
    app.route('/api/portal/ticket/view/:ticket_id').all(portalPolicy.isAllowed)
        .get(portal.viewTicket);
    
    // list ticket routes
    app.route('/api/portal/ticket/list').all(portalPolicy.isAllowed)
        .get(portal.listTicket);
    
    // count ticket routes
    app.route('/api/portal/ticket/count').all(portalPolicy.isAllowed)
        .get(portal.countTicket);
    
    // export ticket routes
    app.route('/api/portal/ticket/export').all(portalPolicy.isAllowed)
        .get(portal.exportTicket);
    
    // Single coupon routes
//    app.route('/api/ticket-archive/delete-expried').all(ticketArchivePolicy.isAllowed)
//        .delete(ticketArchive.removeTicketExpried);
    
    // Finish by binding the ticket middleware
    app.param('ticket_id', portal.ticketByID);
};
