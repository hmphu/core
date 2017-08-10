'use strict';
//
//  ticket event.js
//  handle user.setting events
//
//  Created by vupl on 2015-01-04.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    ticketController = require('../controllers/ticket.controller'),
    ticketControllerV2 = require('../controllers/ticket.v2.controller'),
    Ticket = mongoose.model('Ticket');

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========
/**
 * Event convert voip to ticket
 * @author Vupl
 */
module.exports = (emitter) => {
    emitter.on('evt.ticket.convertVoipToTicket', (data, user, files, callback) => {
        if(data.ticket_id){
            Ticket.findById(data.ticket_id, (err, ticket) =>{
                if(err){
                    return callback(err);
                }
                var oldTicket = new Ticket(ticket);

                ticketController.editInternal(data, ticket, oldTicket, user, (errTicket, resultTicket) =>{
                    if(errTicket){
                        return callback(errTicket);
                    }
                    return callback(null, resultTicket);
                });
            });
        } else {
            let ticketComment = data.comment;
            ticketComment.is_first = true;
            delete data.comment;
            let ticket = new Ticket(data);
            ticket = ticket.toObject();
            ticket.isNew = true;
            ticketControllerV2.preDataEditSendRabbit(ticketComment, ticket, user, files, (err, result) => {
                if (err) {
                    return callback(err);
                }
                return callback(null, result);
            });
        }
    });
    emitter.on('evt.ticket.removeProivderDataId', (data) =>{
        Ticket.findById(data._id, (err, result) =>{
            if(err){
                console.error(err, "remove provider_data_id fail");
                return;
            }
            result.provider_data_id = undefined;
            result.save((err_save) =>{
                if(err_save){
                    console.error(err_save, "update provider_data_id is undefined fail");
                    return;
                }
                return;
            });
        });
    })
};
