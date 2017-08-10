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
    utils = require('../../core/resources/utils'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    enums = require('../../core/resources/enums.res'),
    biz_utils = require('../../biz.rule/resources/utils'),
    filterCond = require('../resources/filter.cond'),
    FilterTicketView = mongoose.model('FilterTicketView'),
    ViewTicket = mongoose.model('ViewTicket'),
    TicketComment = mongoose.model('TicketComment');

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========
var getFirstTicketComment = (data, index, next) =>{
    if(!data[index]){
        return next(data);
    }
    var query = {
        ticket_id: data[index].ticket_id,
        is_first: true
    };
    TicketComment.findOne(query).exec((err, result) =>{
        if(err){
            return getFirstTicketComment(data, ++index, next);
        }
        if(!result){
            return getFirstTicketComment(data, ++index, next);
        }
        data[index] = data[index].toObject();
        data[index].content = result.content;
        return getFirstTicketComment(data, ++index, next);
    })
}
//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========
/**
 * add filter ticket view
 * @author Vupl
 */
exports.add = (viewTicket, ticket, next) =>{
    var data = {
            update: {
                ed_user_id: ticket.ed_user_id,
                ticket_id: ticket._id,
                view_id: viewTicket,
                add_time: ticket.add_time,
                comment_time: ticket.comment_time
            },
            options: {
                upsert: true,
                new: true
            }
        },
        query = {
            ed_user_id: ticket.ed_user_id,
            view_id: viewTicket,
            ticket_id: ticket._id
        };
    tmp_data.findOneAndUpdate('filter_ticket_view', ticket.ed_user_id, data, FilterTicketView, query, (err, result) =>{
        if(err){
            return next(err);
        }
        return next(null, result);
    });
};

exports.remove = (query, next) =>{
    FilterTicketView.remove(query, (err, result) =>{
        if(err){
            return next(err);
        }
        return next(null, result);
    });
};

exports.list = (req, res, next) =>{
    var params = {
        is_secondary_preferred: true,
        query: {
            ed_user_id: utils.getParentUserId(req.user),
            view_id: req.view._id,
            is_delete: false
        },
        populate: {
            include: 'requester_id agent_id group_id',
            fields: '_id name'
        },
        select: 'ticket_id status subject requester_id agent_id group_id sla comment_time solved_date add_time is_delete',
        //skip: req.query.skip,
        limit: req.query.limit,
        sort_order: req.view.order_ascending? 1 : -1,
        sort: req.view.order_by
    };
    var start = Number(req.query.start || NaN),
        end = Number(req.query.end  || NaN),
        skip = Number(req.query.skip || NaN),
        startOp = '$gte',
        endOp = '$lte',
        rangeFilter = {};

    if(req.view.order_ascending){
        if(!isNaN(skip)){
            start = skip;
            startOp = '$gt';
        }
    } else {
        if(!isNaN(skip)){
            end = skip;
            endOp = '$lt';
        }
    }

    // only start
    if(!isNaN(start)){
        rangeFilter[startOp] = start;
    }
    // pnly end
    if(!isNaN(end)){
        rangeFilter[endOp] = end;
    }

    if(Object.keys(rangeFilter).length){
        params.query[req.view.order_by] = rangeFilter;
    }

    filterCond(req.user, req.view, filter =>{
        Object.assign(params.query, filter)

        utils.findByQuery(FilterTicketView, params).exec(function (err, result) {
            if(err){
                console.error(err);
                return next(err);
            }
            getFirstTicketComment(result, 0, (resp) =>{
                res.json(resp);
            });
        });
    });
}

exports.count = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: mongoose.Types.ObjectId(idOwner),
        view_id: req.view._id,
        is_delete: false
    };
    if(req.query.start && req.query.end){
        if(req.view.order_by == 'add_time'){
            query['add_time'] = {
                $gte: Number(req.query.start),
                $lte: Number(req.query.end)
            }
        } else if(req.view.order_by == 'comment_time'){
            query['comment_time'] = {
                $gte: Number(req.query.start),
                $lte: Number(req.query.end)
            }
        }
    }
    filterCond(req.user, req.view, filter =>{
        Object.assign(query, filter);
        var stage = [],
            stage3 = {};
        var stage1 = {
            $match: query
        };
        var stage4 = {
            $group: {
                _id: null,
                count: {$sum: 1}
            }
        }
        if(req.query.skip){
            if(req.view.order_ascending){
                if(req.query.start && req.query.end){
                    stage3 = {
                        $match:{
                            [req.view.order_by]: {
                                $gt: Number(req.query.skip),
                                $lte: Number(req.query.end)
                            }
                        }
                    }
                } else {
                    stage3 = {
                        $match:{
                            [req.view.order_by]: {
                                $gt: Number(req.query.skip)
                            }
                        }
                    }
                }

            } else {
                if(req.query.start && req.query.end){
                    stage3 = {
                        $match:{
                            [req.view.order_by]: {
                                $gte: Number(req.query.start),
                                $lt: Number(req.query.skip)
                            }
                        }
                    }
                } else {
                    stage3 = {
                        $match: {
                            [req.view.order_by]: {
                                $lt: Number(req.query.skip)
                            }
                        }
                    }
                }
            }
            stage = [stage1, stage3, stage4];
        } else {
            stage = [stage1, stage4];
        }
        FilterTicketView.aggregate(stage).read('secondaryPreferred').allowDiskUse(true).exec((err, result) =>{
            if(err){
                console.error(err);
                return next(err);
            }
            res.json(result[0] ? result[0].count : 0);
        });
    });
};

exports.getDetail = (req, res, next) =>{
    res.json(req.view);
}

exports.internalCount = (user, view, next) =>{
        var idOwner = utils.getParentUserId(user);
    var query = {
        ed_user_id: mongoose.Types.ObjectId(idOwner),
        view_id: view._id,
        is_delete: false
    };
    filterCond(user, view, filter =>{
        Object.assign(query, filter);
        var stage = [],
            stage3 = {};
        var stage1 = {
            $match: query
        };
        var stage4 = {
            $group: {
                _id: null,
                count: {$sum: 1}
            }
        }
        stage = [stage1, stage4];

        FilterTicketView.aggregate(stage).read('secondaryPreferred').allowDiskUse(true).exec((err, result) =>{
            if(err){
                console.error(err);
                return next(0);
            }
            return next(result[0] ? result[0].count : 0);
        });
    });
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
