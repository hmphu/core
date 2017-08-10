'use strict';
//
//  voip.controller.js
//  handle core system routes
//
//  Created by vupl on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    Voip = mongoose.model('Voip'),
    User = mongoose.model('User'),
    moment = require('moment'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    utils = require('../../core/resources/utils'),
    validate = require('../validator/voip.validator'),
    enums = require('../../voip/resources/enums');

/**
 * list history voip
 * author vupl
 */
exports.history = [
    (req, res, next) => {
        if (req.body.voip_convert_ticket) {
            req.body.voip_convert_ticket = parseInt(req.body.voip_convert_ticket);
        }
        
        if (req.body.call_status) {
            req.body.call_status = parseInt(req.body.call_status);
        }
        
        if (req.body.call_type) {
            req.body.call_type = parseInt(req.body.call_type);
        }
        
        validate.validate_history_query_data(req.body, next);
    },
    (req, res, next) => {
        var query = {
            ed_user_id : mongoose.Types.ObjectId(utils.getParentUserId(req.user)),
            add_time : {
                $lte : req.body.to_date,
                $gte : req.body.from_date
            }
        };
        
        var callStatus = parseInt(req.body.call_status);
        if (!isNaN(callStatus)) {
            query.call_status = callStatus;
            
            if (callStatus === enums.VoipStatus.NONE) {
                query.call_status = null;
            }
        }

        if (req.body.call_type) {
            query['caller.call_type'] = parseInt(req.body.call_type);
        }

        if (req.body.voip_convert_ticket) {
            if (req.body.voip_convert_ticket === enums.VoipisTicket.is_convert_to_ticket) {
                query.ticket_id = {
                    $ne : null
                }
            } else if (req.body.voip_convert_ticket == enums.VoipisTicket.is_not_convert_to_ticket) {
                query.ticket_id = null
            }
        }

        query.$and = [];

        if (req.body.agent_ids.length > 0) {
            var agentIdList = req.body.agent_ids.map(agentId => {
                return mongoose.Types.ObjectId(agentId);
            });

            var or = {
                $or : [
                    {
                        'caller.from' : { $in : agentIdList }
                    },
                    {
                        'caller.to' : { $in : agentIdList }
                    }
                ]
            };

            query.$and.push(or);
        }

        if (req.body.requester_ids.length > 0) {
            var requesterIdList = req.body.requester_ids.map(requesterId => {
                return mongoose.Types.ObjectId(requesterId);
            });

            var or = {
                $or : [
                    {
                        'caller.from' : { $in : requesterIdList }
                    },
                    {
                        'caller.to' : { $in : requesterIdList }
                    }
                ]
            };

            query.$and.push(or);
        }

        if (query.$and.length === 0) {
            delete query.$and;
        }

        if (req.body.count) { // if only count
            Voip.count(query, (err, count) => {
                if (err) {
                    return next(err);
                }

                res.json(count);
            });

            return;
        }
        
        if (req.query.skip) {
            query.add_time = {
                $lt : Number(req.query.skip),
                $gt : req.body.from_date
            }
        } else {
            query.add_time = {
                $lte : req.body.to_date,
                $gte : req.body.from_date
            }
        }

        var stages = [
          {
              $match : query
          }, {
              $lookup : {
                  from : `${config.dbTablePrefix}user`,
                  localField : 'caller.from',
                  foreignField : '_id',
                  as : 'caller.from'
              }
          }, {
              $lookup : {
                  from : `${config.dbTablePrefix}user`,
                  localField : 'caller.to',
                  foreignField : '_id',
                  as : 'caller.to'
              }
          }, {
              $lookup : {
                  from : `${config.dbTablePrefix}ticket`,
                  localField : 'ticket_id',
                  foreignField : '_id',
                  as : 'ticket_id'
              }
          }, {
              $project : {
                  _id : 1,
                  add_time : 1,
                  call_status : 1,
                  call_tta : 1,
                  call_id : 1,
                  'ticket_id._id' : 1,
                  'ticket_id.subject' : 1,
                  'caller.call_type' : 1,
                  'caller.from._id' : 1,
                  'caller.from.name' : 1,
                  'caller.from.is_requester' : 1,
                  'caller.from.profile_image' : 1,
                  'caller.to._id' : 1,
                  'caller.to.name' : 1,
                  'caller.to.is_requester' : 1,
                  'caller.to.profile_image' : 1,
                  'content.duration' : 1,
                  'content.record_file' : 1,
                  'content.note' : 1,
                  'phone_no.from' : 1,
                  'phone_no.to' : 1
              }
          }, {
              $project : {
                  _id : 1,
                  add_time : 1,
                  call_status : 1,
                  call_tta : 1,
                  call_id : 1,
                  ticket_id : { $arrayElemAt : ['$ticket_id', 0] },
                  'caller.call_type' : 1,
                  'caller.from' : { $arrayElemAt : ['$caller.from', 0] },
                  'caller.to' : { $arrayElemAt : ['$caller.to', 0] },
                  'content.duration' : 1,
                  'content.record_file' : 1,
                  'content.note' : 1,
                  'phone_no.from' : 1,
                  'phone_no.to' : 1
              }
          }, {
              $project : {
                  _id : 1,
                  add_time : 1,
                  call_status : 1,
                  call_tta : 1,
                  call_id : 1,
                  ticket_id : { $ifNull : ['$ticket_id', null] },
                  caller : 1,
                  content : 1,
                  phone_no : 1
              }
          }, {
              $sort: {
                  add_time: -1
              }
          }, {
              $limit : 15
          }
        ];
        
        var results = [];
        var cursor = Voip.aggregate(stages).allowDiskUse(true).cursor({ batchSize : 1000 }).exec();
        cursor.each((err, doc) => {
            if (err) {
                return next(err);
            }

            if (doc) {
                results.push(doc);
            } else {
                res.json(results);
             }
        });
    }
];

/**
 * update history voip
 * author vupl
 */
exports.update = (ticket, voip_call_id) =>{
    Voip.update({
        ed_user_id: ticket.ed_user_id,
        call_id: voip_call_id
    },{
        ticket_id: ticket._id
    },(err, result) =>{
        if(err){
            console.error(err);
            return;
        }
        return;
    });
};
