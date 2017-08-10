'use strict';

var path = require('path'),
    config = require(path.resolve('./config/config')),
    fbController = require('../controllers/fb.controller'),
    utils = require('../../core/resources/utils'),
    enums = require('./enums'),
    ticketEnums = require('../../ticket/resources/enums'),
    moment = require('moment'),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq')),
    providers = require('../providers/index.provider'),
    mongoose = require('mongoose'),
    fbModel = mongoose.model('Fb'),
    ticketModel = mongoose.model('Ticket');

var getTicketById = (id, next) =>{
    if(!id){
        return next();
    }
    ticketModel.findById(id, (err, ticket) =>{
        if(err){
            console.error(err, `fb realtime: getTicketById ==> ${id}`);
        }
        if(!ticket || ticket.is_delete || ticket.status == ticketEnums.TicketStatus.Closed){
            return next();
        }
        return next(ticket);
    });
}

/**
 * check fb comment from user/page to page
 * author : thanhdh
 */
var getCommentParent = (comment, next) =>{
    let fb_id = (comment.provider_data.post_id == comment.provider_data.parent_id)? comment.provider_data.post_id: comment.provider_data.parent_id;

    fbModel.findOne({
        ed_user_id: comment.ed_user_id,
        fb_id: fb_id
    }, (err, parent) =>{
        if(err){
            console.error(err, `fb realtime: getCommentParent ==> ${JSON.stringify(comment)}`);
        }
        return next(parent);
    });
}

/**
 * handle parent of comment in case it's not converted to ticket yet
 * author : thanhdh
 */
var convertParentToTicket = (data) =>{
    // only user post here
    if(data.provider != 'comment'){
        rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-realtime-fb-create-ticket', payload: {
            data: data
        }});
        return;
    }
    // only comment type here
    getCommentParent(data, parent => {
        if(!parent){
            rbSender(config.rabbit.sender.delayedExchange.batch, {topic: 'izi-realtime-fb-delayed-orphan-comment', headers: {'x-delay': 5000}, payload: {
                data: data
            }});
            return;
        }
        if(parent.provider == 'wallpost'){
            rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-realtime-fb-create-ticket', payload: {
                data: data
            }});
            return;
        }
        getTicketById(parent.ticket_id, ticket=>{
            // have enough data, create ticket comment
            if(ticket){
                data.ticket = ticket;
                rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-realtime-fb-create-ticket-comment', payload: {
                    data: data
                }});
                return;
            }
            // put current comment into delay queue
            rbSender(config.rabbit.sender.delayedExchange.batch, {topic: 'izi-realtime-fb-delayed-create-ticket-comment', headers: {'x-delay': 5000}, payload: {
                data: data
            }});
            // get parent to convert ticket
            rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-realtime-fb-create-ticket', payload: {
                data: parent
            }});
        });
    });
}

exports.processConvertCommentToTicket = (comment) => {
    getCommentParent(comment, parent => {
        if(!parent){
            rbSender(config.rabbit.sender.delayedExchange.batch, {topic: 'izi-realtime-fb-delayed-orphan-comment', headers: {'x-delay': 5000}, payload: {
                data: comment
            }});
            return;
        }
        // create ticket for current comment
        if(parent.provider == 'wallpost'){
            rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-realtime-fb-create-ticket', payload: {
                data: comment
            }});
            return;
        }
        getTicketById(parent.ticket_id, ticket=>{
            // have enough data, create ticket comment
            if(ticket){
                comment.ticket = ticket;
                rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-realtime-fb-create-ticket-comment', payload: {
                    data: comment
                }});
                return;
            }
            // convert parent into ticket
            convertParentToTicket(parent.toObject());
            // put current comment into delay queue
            rbSender(config.rabbit.sender.delayedExchange.batch, {topic: 'izi-realtime-fb-delayed-create-ticket-comment', headers: {'x-delay': 5000}, payload: {
                data: comment
            }});
        });
    });
};
