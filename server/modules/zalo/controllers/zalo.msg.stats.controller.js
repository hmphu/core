'use strict';
//
//  fb.controller.js
//  handle fb logic
//
//  Created by thanhdh on 2016-02-23.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var fs = require('fs'),
    path = require('path'),
    mongoose  = require('mongoose'),
    moment = require('moment'),

    config = require(path.resolve('./config/config')),
    utils = require('../../core/resources/utils'),
    enumsTicket = require('../../ticket/resources/enums'),
    ticketController = require('../../ticket/controllers/ticket.controller'),
    peopleGroup = require('../../people/controllers/people.group.user.controller'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    elastic = require('../resources/elastic'),

    Ticket = mongoose.model("Ticket"),
    User = mongoose.model('User');



exports.solveTicket = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user),
        ticket_id = req.params.ticket_id;

    var query = {
        _id: ticket_id,
        ed_user_id: idOwner,
        provider: enumsTicket.Provider.zaloMessage,
        status: {
            $lt: enumsTicket.TicketStatus.Closed
        }
    };

    Ticket.findOne(query, (err, ticket) => {
        if (err) {
            return next(err);
        }
        if (!ticket) {
            return next(new TypeError('zalo.ticket_not_found'));
        }

        if (ticket.status == enumsTicket.TicketStatus.Solved) {
            return res.json({ is_updated: true });
        }
        var now = +moment.utc();
        var update = {
            status: enumsTicket.TicketStatus.Solved,
            status_date: now,
            solved_date: now,
            __v: undefined,
            stats: undefined
        };

        if (ticket.agent_id) {
            emitter.emit('evt.zalo.trigger.update.ticket', {
                ticket: Object.assign({}, ticket.toJSON(), update),
                submitter_id: req.user._id
            });
            return res.json({ is_updated: true });
        }
        peopleGroup.findGroupUser(idOwner, req.user._id, (err, result) => {
            if (err) { return next(err); }
            emitter.emit('evt.zalo.trigger.update.ticket', {
                ticket: Object.assign({}, ticket.toJSON(), update, {
                    agent_id: req.user._id, group_id: result.group_id }),
                submitter_id: req.user._id
            });
            res.json({ is_updated: true });
        });
    });
}

exports.search = [
    function (req, res, next) {
        var idOwner = utils.getParentUserId(req.user);
        var limit = parseInt(req.query.limit) || 10;
        var query = {
            oaids: req.body.pages,
            requester_name: req.body.keyword,
            limit: limit + 1
        };

        elastic.filterTicket(idOwner, query, (err, result) => {
            if (err) { return next(err); }
            let is_all = true;
            if (result.hits.length > limit) {
                result.hits.pop();
                is_all = false;
            }
            res.json({
                tickets: processTickets(result.hits),
                is_all: is_all
            });
        });
    }
];

exports.getUserProfileImage = [
    function (req, res, next) {
        var user = req.profile;
        var image   = user.profile_image,
            ownerId = utils.getParentUserId(req.user || {}),
            noImg = path.resolve('./assets/img/no-img.jpg'),
            file = path.resolve("./assets/img/default.png");

        if (!image || !ownerId) {
            return res.sendFile(noImg);
        }
        if (image != "default.png") {
            file = path.resolve(`./assets/uploads/${ownerId}/${image}`);
        }
        // cache control
        var maxAge = 60 * 60 * 24 * 30;
        res.header('Cache-Control', `public max-age=${maxAge}`);
        res.header('Expires', (new Date(new Date().getTime() + maxAge * 1000)).toUTCString());

        // response file
        if (fs.existsSync(file)) {
            res.sendFile(file);
        } else {
            res.sendFile(noImg);
        }
    }
];

exports.getUserProfile = [
    function (req, res, next) {
        var idOwner = utils.getParentUserId(req.user);
        User.findOne({
            ed_parent_id: idOwner,
            "provider_data.uid": req.params.zalouid
        }, (err, user) => {
            if (err) { return next(err); }
            if (!user) {
                return next(new TypeError('zalo.user_not_found'));
            }
            res.json({
                _id: user._id, name: user.name
            });
        });
    }
];

exports.getLastTicketComment = [
    function (req, res, next) {
        var idOwner = utils.getParentUserId(req.user);
        var ticket_id = req.params.id;
        elastic.getLastTicketCmt(idOwner, ticket_id, (err, result) => {
            if (err) { return next(err); }
            if (!result.total) {
                return next(new TypeError("zalo.ticket_not_found"));
            }
            var comment = result.hits[0];
            res.jsonp(Object.assign({}, comment._source, {
                _id: comment._id, data: undefined, provider_data: comment._source.data
            }));
        });
    }
];

function processTickets(data) {
    
    return data.map(item => Object.assign({}, item._source, {_id: item._id, data: undefined, provider_data: item._source.data}));
//    let res_data = [];
//    data.forEach(item => {
//        let ticket = item._source;
//        ticket._id = item._id;
//        res_data.push(Object.assign({}, item._source, {_id: item._id}));
//        res_data.push({
//            _id: item._id,
//            requester_id: ticket.requester_id? ticket.requester_id._id: null,
//            requester: Object.assign(ticket.requester_id || {}, {zalouid: ticket.data.zalouid}),
//            agent_id: ticket.agent_id? ticket.agent_id._id: null,
//            agent: ticket.agent_id || {},
//            status: ticket.status,
//            page_id: ticket.data.oaid,
//            last_time_cmt: ticket.stats.last_time_cmt,
//            is_replied: ticket.stats.is_agent_answered,
//            is_delete: ticket.stats.is_delete
//        });
//    });
    return res_data;
}
