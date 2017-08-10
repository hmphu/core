'use strict';
//
//  ticket event.js
//  filter ticket for view based on some pre-conds
//
//  Created by vupl on 2017-03-01.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    mongoose = require('mongoose'),
    moment = require('moment'),
    translation = require('../resources/translate.res'),
    config = require(path.resolve('./config/config')),
    utils = require('../../core/resources/utils'),
    filterCondV2 = require('../resources/filter.cond.v2'),
    es = require(path.resolve('./config/lib/elasticsearch')),
    TicketComment = mongoose.model('TicketComment'),
    ViewTicket = mongoose.model('ViewTicket'),
    filterUtils = require(path.resolve('./modules/filter/resources/utils.v2')),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq'));


//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========
var getFirstTicketComment = (data, index, next) =>{
    if(!data[index]){
        return next(data);
    }
    var query = {
        ticket_id: data[index]._id,
        is_first: true
    };
    TicketComment.findOne(query).exec((err, result) =>{
        if(err){
            return getFirstTicketComment(data, ++index, next);
        }
        if(!result){
            return getFirstTicketComment(data, ++index, next);
        }
        data[index].content = result.content;
        return getFirstTicketComment(data, ++index, next);
    })
}

exports.list = (req, res, next) =>{
    var ed_user_id = utils.getParentUserId(req.user),
        start = Number(req.query.start || NaN),
        end = Number(req.query.end || NaN),
        skip = Number(req.query.skip || NaN),
        limit = Number(req.query.limit || NaN);

    filterCondV2(req.user, req.view, (is_break, filter) =>{
        if(is_break){
            if(req.query.is_counter){
                return res.json(0);
            } else {
                return res.json({
                    counter: 0,
                    data: []
                });
            }
        }
        if(req.view.order_by == 'comment_time'){
            req.view.order_by = 'stats.last_time_cmt';
        }
        // add start & end cond to top of filter array
        if(!isNaN(start) && !isNaN(end)){
            filter.unshift({
                range: {
                    [req.view.order_by]: {
                        gte: start,
                        lte: end
                    }
                }
            });
        }
        var query = {
            index: `ticket-${ed_user_id}`,
            body: {
                from: isNaN(skip)? 0: skip,
                size: isNaN(limit)? config.paging.limit: limit,
                query: {
                    bool: {
                        filter: filter
                    }
                },
                sort: [{
                    [req.view.order_by]: req.view.order_ascending? 'asc' : 'desc'
                }]
            }
        };
        // call to ES json api to search
        es.search(query, (err, data)=>{
            if(err){
                console.error(err, JSON.stringify(query));
                return next(err);
            }
            if(req.query.is_counter){
                return res.json(data.hits.total);
            } else {
                var res_data = [];
                _.forEach(data.hits.hits, item =>{
                    res_data.push(mappingElastics(item));
                });

                getFirstTicketComment(res_data, 0, (resp) =>{
                    return res.json({
                        counter: data.hits.total,
                        data: resp
                    });
                });

            }
        });
    });
}

exports.download = (req, res, next) =>{
    var ed_user_id = utils.getParentUserId(req.user),
        start = Number(req.query.start || NaN),
        end = Number(req.query.end || NaN),
        columns = filterUtils.getColsReport(translation[req.user.language || "en"]);

    filterCondV2(req.user, req.view, (is_break, filter) =>{
        if(is_break){
            return res.json({
                is_empty: true
            });
        }
        
        if(req.view.order_by == 'comment_time'){
            req.view.order_by = 'stats.last_time_cmt';
        }
        // add start & end cond to top of filter array
        if(!isNaN(start) && !isNaN(end)){
            filter.unshift({
                range: {
                    [req.view.order_by]: {
                        gte: start,
                        lte: end
                    }
                }
            });
        }
        var payload = {
            idOwner: ed_user_id,
            ticket_view_id: req.view._id,
            user_id: req.user._id,
            lang: req.user.language,
            now:  +moment(),
            time_zone: req.user.time_zone.value,
            cols: columns,
            query: {
                bool: {
                    filter: filter
                }
                /*sort: [{
                    [req.view.order_by]: req.view.order_ascending? 'asc' : 'desc'
                }]*/
            }
        };
        
        rbSender(config.rabbit.sender.exchange.report, {topic: 'izi-report-export-xlsx', payload: payload });
        return res.json({});
    });
};

exports.internalCount = (user, view, next) =>{
    var idOwner = utils.getParentUserId(user);
    filterCondV2(user, view, (is_break, filter) =>{
        if(is_break){
            return next(0);
        }
        var query = {
            index: `ticket-${idOwner}`,
            body: {
                query: {
                    bool: {
                        filter: filter
                    }
                }
            }
        };
        // call to ES json api to search
        es.search(query, (err, data)=>{
            if(err){
                console.error(err, JSON.stringify(query));
                return next(0);
            }
            return next(data.hits.total);
        });
    });
}

var mappingElastics = (data) =>{
    return {
        _id: data._id,
        ticket_id: data._id,
        subject: data._source.subject,
        status: data._source.status,
        sla: data._source.sla,
        add_time: data._source.add_time,
        comment_time: (data._source.stats || {}).last_time_cmt,
        agent_id: data._source.agent_id,
        requester_id: data._source.requester_id,
        group_id: data._source.group_id,
        solved_date: (data._source.stats || {}).last_time_status_solved
    }
}

exports.viewById = (req, res, next, id) => {
        // check the validity of view idf
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('view.ticket.id.objectId'));
    }
    var idOwner = utils.getParentUserId(req.user);
    ViewTicket.findOne({
        _id: mongoose.Types.ObjectId(id),
        is_active: true,
        ed_user_id: idOwner
    }).exec((err, view) =>{
        if(err){
            return next(err);
        }
        if(!view){
            return next(new TypeError('view.ticket.not_found'));
        }
        req.view = view.toObject();
        next();
    });
};
