'use strict';

/**
 * Module dependencies.
 */
var ticketPolicy = require('../policies/ticket.policy'),
    ticket = require('../controllers/ticket.controller'),
    ticketV2 = require('../controllers/ticket.v2.controller'),
    upload = require('../../core/resources/upload'),
    path = require('path'),
    userController = require(path.resolve('./modules/user/controllers/users/user.auth.controller'));

var uploadOpts = {
    mimetype : ['image/gif',
                'image/jpeg',
                'image/png',
                'text/plain',
                'application/pdf',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpointtd',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
                'application/vnd.oasis.opendocument.text',
                'application/vnd.oasis.opendocument.spreadsheet'],
    fields: [
        {name: "attachments", maxCount: 10},
    ],
};

module.exports = (app) =>{
    //routes edit ticket v2
    app.route('/api/tickets').all(upload(uploadOpts), userController.authenticateApi, ticketPolicy.isAllowed)
        .post(ticketPolicy.preDataAddTicket, ticketPolicy.getTicketSettings, ticketV2.add);

    app.route('/api/tickets/:ticketId').all(upload(uploadOpts), ticketPolicy.isAllowed)
        .get(ticket.read)
        .put(ticketPolicy.preDataEditTicket, ticketPolicy.getTicketSettings, ticketV2.update)
        .delete(ticketPolicy.getAgentSettings, ticketV2.delete);
    app.route('/api/retry-ticket-comment-v2/:ticketId/:commentId').all(ticketPolicy.isAllowed)
        .get(ticketV2.retryTicketComment);
    app.route('/api/tickets-delete').all(ticketPolicy.isAllowed)
        .delete(ticketPolicy.getAgentSettings, ticketV2.deleteTickets);

    //create or update ticket from API
    app.route('/api/tickets-api').all(upload(uploadOpts), userController.authenticateApi, ticketPolicy.isAllowed)
        .post(ticketPolicy.getTicketSettings, ticketV2.addFromApi);
    app.route('/api/tickets-api/:ticketId').all(upload(uploadOpts), userController.authenticateApi, ticketPolicy.isAllowed)
        .put(ticketPolicy.getTicketSettings, ticketV2.editFromApi);
}
