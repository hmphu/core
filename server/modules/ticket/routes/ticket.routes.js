'use strict';

/**
 * Module dependencies.
 */
var ticketPolicy = require('../policies/ticket.policy'),
    ticket = require('../controllers/ticket.controller'),
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

module.exports = (app) => {
    // ticket collection routes
    app.route('/api/tickets-v1').all(upload(uploadOpts), userController.authenticateApi, ticketPolicy.isAllowed)
        .post(ticketPolicy.preDataAddTicket, ticketPolicy.getTicketSettings, ticket.add);

    //create or update ticket from API
    app.route('/api/tickets-v1-api').all(upload(uploadOpts), userController.authenticateApi, ticketPolicy.isAllowed)
        .post(ticketPolicy.getTicketSettings, ticket.addFromAPI);
    app.route('/api/tickets-v1-api/:ticketId').all(upload(uploadOpts), userController.authenticateApi, ticketPolicy.isAllowed)
        .put(ticketPolicy.getTicketSettings, ticket.editFromAPI);
    
    // Single coupon routes
    app.route('/api/tickets-v1/:ticketId').all(upload(uploadOpts), ticketPolicy.isAllowed)
        .get(ticket.read)
        .put(ticketPolicy.preDataEditTicket, ticketPolicy.getTicketSettings, ticket.update)
        .delete(ticketPolicy.getAgentSettings, ticket.delete);
    app.route('/api/tickets-v1-delete').all(ticketPolicy.isAllowed)
        .delete(ticketPolicy.getAgentSettings, ticket.deleteTickets);
    // rating  ticket
    app.route('/api/tickets-rating/:ticketId_rating')
        .post( ticket.rating );

    app.route('/api/tickets-search').all(ticketPolicy.isAllowed)
        .post(ticket.search);

    app.route('/api/tickets-list').all(ticketPolicy.isAllowed)
        .get(ticket.listTicket);
    app.route('/api/tickets-hist/:ticketId').all(ticketPolicy.isAllowed)
        .get(ticket.listHist);
    // Finish by binding the ticket middleware
    app.param('ticketId', (req, res, next, id) =>{
        userController.authenticateApi(req, res, (err, result) =>{
            if(err){
                return next(err);
            }
            ticketPolicy.isAllowed(req, res, (err, result) =>{
                ticket.ticketByID(req, res, next, id);
            });
        })
    });
};
