'use strict';
//
//  ticket hist.event.js
//  handle user.setting events
//
//  Created by vupl on 2015-01-04.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var ticketComment = require('../controllers/ticket.comment.controller');

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========
module.exports = (emitter) => {
    emitter.on('evt.ticket.comment.add', (data, ticket, user, callback) => {
        ticketComment.add(data, ticket, user, (err, result) =>{
            if(err){
                return callback(err);
            }
            return callback(null, result);
        });
    });

    emitter.on('evt.ticket.comment.delete', (ticket) =>{
        ticketComment.delete(ticket);
    });

    emitter.on('evt.ticket.comment.update',(data, provider) =>{
        ticketComment.update(data, provider);
    });

    emitter.on('evt.ticket_comment.updateTicketCommentClosed', (ticket) =>{
        ticketComment.closeTicket(ticket);
    });

    emitter.on('evt.ticket.facebook.update_is_error', (data) =>{
        ticketComment.updateFacebookError(data);
    })
};
