'use strict';
//
//  ticket send email event.js
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
    mongoose = require('mongoose'),

    config = require(path.resolve('./config/config')),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq')),
    enumsTicket = require('../../ticket/resources/enums'),
    zaloController = require('../controllers/zalo.msg.controller'),

    UserZaloOA = mongoose.model("UserZaloOA");

module.exports = (emitter) =>{
    emitter.on('evt.ticket.zalo.sendToZalo.v2', (idOwner,ticket, ticketComment , file, callback) =>{
        //TODO send to zalo
        zaloController.commentPostMessage(idOwner, ticket.provider_data, ticketComment.content, file, (err, result) =>{
            if(err){
                ticketComment.provider_data = {
                    is_error: true
                };
                console.error(err, `send data to zalo error ${JSON.stringify(ticketComment)}`);
                return callback(err, ticketComment);
            }
            ticketComment.comment_id = result.msgid ? result.msgid : undefined;
            ticketComment.provider_data = result.provider_data;
            return callback(null, ticketComment);
        });
    });
    emitter.on('evt.ticket.zalo.sendToZalo', (idOwner, ticket, ticketComment, files) =>{
        var file = files ? files[0] : undefined;
        zaloController.commentPostMessage(idOwner, ticket.provider_data, ticketComment.content, file, (err, result) =>{
            var res_data = {
                ed_user_id: ticketComment.ed_user_id,
                ticket_comment_id: ticketComment._id
            }
            if(err){
                res_data.provider_data = {
                    is_error: true
                };
                emitter.emit('evt.ticket.comment.update', res_data, enumsTicket.Provider.zaloMessage);
                console.log("error", err);
                console.error(err, `send data to zalo error ${JOSN.stringify(ticketComment)}`);
                return;
            }
            res_data.provider_data = result.provider_data;
            res_data.msgid = result.msgid ? result.msgid : undefined;
            emitter.emit('evt.ticket.comment.update', res_data, enumsTicket.Provider.zaloMessage);
            if (ticketComment.toJSON) {
                ticketComment = ticketComment.toJSON();
            }
            sendToZaloParts(Object.assign({}, ticketComment, {
                provider_data: result.provider_data,
                user_id: ticketComment.user_id._id,
                ed_user_id: ticket.ed_user_id
            }), ticket);
            return;
        });
    });

    emitter.on('evt.zalo.trigger.update.ticket', data => {
        rbSender(config.rabbit.sender.exchange.trigger, {topic: 'izi-trigger-ticket-flow', payload: data});
    });
}

