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
var mongoose = require('mongoose'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq')),
    peopleUserController = require('../../people/controllers/people.user.controller');

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

/**
 * Event send data to izicomment form izicore
 * @author Vupl
 */
module.exports = (emitter) =>{
    emitter.on('evt.ticket.izicomment.sendData', (ticket, user) =>{
        peopleUserController.findById_internal(user._id, {}, (err, result) =>{
            if(err){
                console.error(err, "send iziComment data faild");
                return;
            }
            rbSender(config.rabbit.sender.exchange.comment, {topic: 'izicore-comment-create-reply', payload: {
              izi_account_id : ticket.ed_user_id,
              ticket : ticket,
              user: result
            }});
        });
    });
};
