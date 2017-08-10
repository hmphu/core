'use strict';

/**
 * Module dependencies.
 */
var ticketPolicy = require('../policies/user.ticket.policy'),
    coreController = require('../../core/controllers/core.controller'),
    userTicket = require('../controllers/user.ticket.controller');

module.exports = (app) => {
    
    // user ticket routes
    app.route('/api/user/ticket').all(ticketPolicy.isAllowed)
        .get(userTicket.read)
        .put( userTicket.update);
};
