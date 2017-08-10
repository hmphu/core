'use strict';
//
//  user.mail.controller.js
//  handle user mail setting routes
//
//  Created by dientn on 2015-12-25.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    UserTicket = mongoose.model('UserTicket'),
    path = require('path'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    utils = require('../../core/resources/utils'),
    validator = require('../validator/user.ticket.validator'),
    cache = require(path.resolve('./config/lib/redis.cache'));

/**
 * add a new ticket setting
 * author : dientn
 */
exports.add = (idOwner, data, next) => {
    var ticketSetting  = new UserTicket(data);
    ticketSetting.ed_user_id = idOwner;
    
    tmp_data.save('setting_add_ticket', idOwner, ticketSetting, ticketSetting, (err, result) =>{
        if(err){
            return next(err);
        }
        next(null, ticketSetting);
    });
};

/**
 * show current ticket setting
 * author : dientn
 */
exports.read = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: idOwner
    };
    cache.findOneWithCache(idOwner, 'user.setting.ticket', UserTicket, query, (err, ticketSetting) =>{
        if(err){
            return next(err);
        }
        res.json(ticketSetting);
    })
};

/**
 * update the current ticket settting by id owner
 * author : dientn
 */
exports.update = [
    (req, res, next)=>{
        validator(req.body, next);
    },
    (req, res, next) => {
        var idOwner = utils.getParentUserId(req.user);

        UserTicket.findOne({ed_user_id : idOwner}, (err, ticketSetting) => {
            if(err){
                return next(err);
            }

            if(!ticketSetting){
                return next(new TypeError('user.ticket.not_found'));
            }
            
            ticketSetting = _.assign(ticketSetting, req.body);
            cache.saveAndUpdateCache(idOwner, 'user.setting.ticket', ticketSetting, (err) =>{
                if(err){
                    return next(err);
                }
                res.json(ticketSetting);
            })
        });
    }
];

/**
 * get the current user setting ticket
 * author : vupl
 */
exports.userTicketByOwnerId = (idOwner, next) =>{
    var query = {
        ed_user_id: idOwner
    }

    cache.findOneWithCache(idOwner, 'user.setting.ticket', UserTicket, query, (err, result) =>{
        if(err){
            console.error(err);
            return next(err);
        }
        return next(null, result);
    });
}
