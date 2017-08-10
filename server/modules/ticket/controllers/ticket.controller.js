'use strict';
//
// ticket.controller.js
// handle core system routes
//
// Created by thanhdh on 2015-12-17.
// Copyright 2015 Fireflyinnov. All rights reserved.
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
    Ticket = mongoose.model('Ticket'),
    TicketHist = mongoose.model('TicketHist'),
    User = mongoose.model('User'),
    Group = mongoose.model('Group'),
    UserMailAccount = mongoose.model('UserMailAccount'),
    validate = require('../validator/ticket.validator'),
    enums = require('../resources/enums'),
    enumsCore = require('../../core/resources/enums.res'),
    provider = require('../providers/index.provider'),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq')),
    utilsTicket = require('../resources/utils'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    peolpe_enums = require('../../people/resources/enums.res'),
    moment = require('moment'),
    people_controller = require('../../people/controllers/people.user.controller'),
    group_user_controller = require('../../people/controllers/people.group.user.controller'),
    socketIO = require(path.resolve('./config/lib/socket.io'));


/**
 * add a new internal ticket author : vupl
 */
exports.addInternal = (data, user, next) => {
    var ticket = new Ticket(data);
    tmp_data.save('ticket_add', ticket.ed_user_id, ticket, ticket, (errTicket, resultTicket) =>{
        if(errTicket){
            return next(errTicket);
        }
        if(resultTicket.tags && resultTicket.tags.length > 0){
            rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-core-tag-cloud', payload: {
                tagCloud: resultTicket.tags,
                idOwner: ticket.ed_user_id,
                tag_cloud_type: enumsCore.TagCloud.Ticket
            }});
        }
        data.comment.is_first = true;
        emitter.emit('evt.ticket.comment.add', data.comment, ticket, user, (errComment, resultComment) =>{
            if(errComment){
                return next(errComment);
            }
            ticket.comment = resultComment;
            let dataSend = ticket.toObject();
            dataSend.macro_id = data.macro_id;
            dataSend.comment = {
                "_id": resultComment._id,
                "ticket_id": resultComment.ticket_id,
                "user_id": resultComment.user_id._id,
                "group_id": resultComment.group_id,
                "geo": resultComment.geo,
                "content": resultComment.content,
                "provider": resultComment.provider,
                "provider_data": resultComment.provider_data,
                "attachments": resultComment.attachments,
                "is_internal": resultComment.is_internal,
                "is_requester": resultComment.is_requester
            };
            if(ticket.comment.provider == enums.Provider.sms){
                emitter.emit('evt.sms.sendSms', ticket);
            }
            else if(resultTicket.comment.provider == enums.Provider.iziMail || resultTicket.comment.provider == enums.Provider.gmail){
                rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-core-ticket-sendEmail', payload: {
                    ticket: dataSend,
                    user: user
                }});
            }

            var data_res = ticket.toObject();
            data_res.comment = {
                "ticket_id": resultComment.ticket_id,
                "user_id": resultComment.user_id,
                "content": resultComment.content,
                "provider": resultComment.provider,
                "provider_data": resultComment.provider_data,
                "attachments": resultComment.attachments,
                "_id": resultComment._id
            };
            return next(null, data_res);
        });
    });
};


/**
 * edit a internal ticket author : vupl
 */
exports.editInternal = (data, newTicket, oldTicket, user, next) =>{
    tmp_data.save('ticket_edit', data.ed_user_id, newTicket, newTicket, (errTicket, resultTicket) =>{
        if(errTicket){
            return next(errTicket);
        }
        if(data.comment && data.comment.content && !utils.isEmpty(data.comment.content)){
            emitter.emit('evt.ticket.comment.add', data.comment, resultTicket, user, (errComment, resultComment) =>{
                if(errComment){
                    return next(errComment);
                }
                if(resultTicket.tags && resultTicket.tags.length > 0){
                    rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-core-tag-cloud', payload: {
                        tagCloud: resultTicket.tags,
                        idOwner: resultTicket.ed_user_id,
                        tag_cloud_type: enumsCore.TagCloud.Ticket
                    }});
                }
                resultTicket.comment = resultComment;
                let dataSend = resultTicket.toObject(); // data send to channel of rabbit
                dataSend.macro_id = data.macro_id;
                dataSend.comment = {
                    "_id": resultComment._id,
                    "ticket_id": resultComment.ticket_id,
                    "user_id": resultComment.user_id._id,
                    "group_id": resultComment.group_id,
                    "geo": resultComment.geo,
                    "content": resultComment.content,
                    "provider": resultComment.provider,
                    "provider_data": resultComment.provider_data,
                    "attachments": resultComment.attachments,
                    "is_internal": resultComment.is_internal,
                    "is_requester": resultComment.is_requester
                };
                if(resultTicket.comment.provider == enums.Provider.fbComment){
                    if(resultComment.is_public){
                        emitter.emit('evt.ticket.fb.comment', resultTicket, user, false, (err_emitter, result_comment) =>{
                            if(err_emitter || !result_comment){
                                var data_res = resultTicket.toObject();
                                data_res.macro_id = data.macro_id;
                                data_res.comment = {
                                    "_id": resultComment._id,
                                    "ticket_id": resultComment.ticket_id,
                                    "user_id": resultComment.user_id,
                                    "group_id": resultComment.group_id,
                                    "geo": resultComment.geo,
                                    "content": resultComment.content,
                                    "provider": resultComment.provider,
                                    "provider_data": resultComment.provider_data,
                                    "attachments": resultComment.attachments,
                                    "is_internal": resultComment.is_internal,
                                    "is_requester": resultComment.is_requester
                                };
                                rbSender(config.rabbit.sender.exchange.report, {topic: 'izi-core-edit-ticket', payload: {
                                    ticket: data_res,
                                    oldTicket: oldTicket,
                                    user: {
                                        "_id" : user._id,
                                        "name": user.name,
                                        "ed_parent_id": user.ed_parent_id,
                                        "sub_domain": user.sub_domain
                                    }
                                }});
                                next(null, data_res);
                                delete data_res.comment;
                                setTimeout(()=>{
                                    socketIO.emit('/core', data_res.ed_user_id, {
                                        topic: 'izi-core-client-facebook-comment',
                                        payload: {
                                            fb_data: {
                                                ed_user_id: data_res.ed_user_id,
                                                ticket: data_res,
                                                comment: result_comment,
                                                error: {single : err_emitter}
                                            }
                                        }
                                    });
                                }, 3000)
                                return;
                            }
                            var data_res = resultTicket.toObject();
                            data_res.macro_id = data.macro_id;
                            data_res.comment = {
                                "_id": result_comment._id,
                                "ticket_id": result_comment.ticket_id,
                                "user_id": result_comment.user_id,
                                "group_id": result_comment.group_id,
                                "content": result_comment.content,
                                "geo": result_comment.geo,
                                "provider": result_comment.provider,
                                "provider_data": result_comment.provider_data,
                                "is_internal": result_comment.is_internal,
                                "attachments": result_comment.attachments,
                                "is_requester": result_comment.is_requester
                            };
                            rbSender(config.rabbit.sender.exchange.report, {topic: 'izi-core-edit-ticket', payload: {
                                ticket: data_res,
                                oldTicket: oldTicket,
                                user: {
                                    "_id" : user._id,
                                    "name": user.name,
                                    "ed_parent_id": user.ed_parent_id,
                                    "sub_domain": user.sub_domain
                                }
                            }});
                            next(null, data_res);
                            delete data_res.comment;
                            return;

                        });
                    } else {
                        var data_res = resultTicket.toObject();
                        data_res.macro_id = data.macro_id;
                        data_res.comment = {
                            "_id": resultComment._id,
                            "ticket_id": resultComment.ticket_id,
                            "user_id": resultComment.user_id,
                            "group_id": resultComment.group_id,
                            "geo": resultComment.geo,
                            "content": resultComment.content,
                            "provider": resultComment.provider,
                            "provider_data": resultComment.provider_data,
                            "attachments": resultComment.attachments,
                            "is_internal": resultComment.is_internal,
                            "is_requester": resultComment.is_requester
                        };
                        rbSender(config.rabbit.sender.exchange.report, {topic: 'izi-core-edit-ticket', payload: {
                            ticket: data_res,
                            oldTicket: oldTicket,
                            user: {
                                "_id" : user._id,
                                "name": user.name,
                                "ed_parent_id": user.ed_parent_id,
                                "sub_domain": user.sub_domain
                            }
                        }});
                        return next(null, data_res);
                    }
                } else {
                    if(resultTicket.comment.provider == enums.Provider.sms){
                        emitter.emit('evt.sms.sendSms', resultTicket);
                    }
                    else if(resultTicket.comment.provider == enums.Provider.iziMail || resultTicket.comment.provider == enums.Provider.gmail){
                        rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-core-ticket-sendEmail', payload: {
                            ticket: dataSend,
                            user: user
                        }});
                    }
                    else if(resultTicket.comment.provider == enums.Provider.fbMessage){
                        emitter.emit('evt.ticket.fb.message', resultTicket, user, false);
                    }
                    else if(resultTicket.comment.provider == enums.Provider.iziComment){
                        emitter.emit('evt.ticket.izicomment.sendData', dataSend, user);
                    }
                    else if( resultTicket.comment.provider == enums.Provider.voip){
                        emitter.emit('evt.voip.update.history', resultTicket, resultTicket.comment.provider_data.call_id);
                    } else if(resultTicket.comment.provider == enums.Provider.zaloMessage){
                        if (resultComment.is_public == true) {
                            emitter.emit('evt.ticket.zalo.sendToZalo', resultTicket.ed_user_id, resultTicket, resultTicket.comment, data.files);
                        }
                    }
                    rbSender(config.rabbit.sender.exchange.report, {topic: 'izi-core-edit-ticket', payload: {
                        ticket: dataSend,
                        oldTicket: oldTicket,
                        user: {
                            "_id" : user._id,
                            "name": user.name,
                            "ed_parent_id": user.ed_parent_id,
                            "sub_domain": user.sub_domain
                        }
                    }});
                    var data_res = resultTicket.toObject();
                    data_res.comment = {
                        "add_time": resultComment.add_time,
                        "ticket_id": resultComment.ticket_id,
                        "user_id": resultComment.user_id,
                        "content": resultComment.content,
                        "provider": resultComment.provider,
                        "provider_data": resultComment.provider_data,
                        "is_internal": resultComment.is_internal,
                        "attachments": resultComment.attachments,
                        "_id" : resultComment._id
                    };
                    return next(null, data_res);
                }
            });
        } else {
            if(resultTicket.tags && resultTicket.tags.length > 0){
                rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-core-tag-cloud', payload: {
                    tagCloud: resultTicket.tags,
                    idOwner: resultTicket.ed_user_id,
                    tag_cloud_type: enumsCore.TagCloud.Ticket
                }});
            }
//            resultTicket.macro_id = data.macro_id;
            var ticket_res = resultTicket.toObject();
            ticket_res.comment = undefined;
            ticket_res.macro_id = data.macro_id;
            rbSender(config.rabbit.sender.exchange.report, {topic: 'izi-core-edit-ticket', payload: {
                ticket: ticket_res,
                oldTicket: oldTicket,
                user: {
                    "_id" : user._id,
                    "name": user.name,
                    "ed_parent_id": user.ed_parent_id,
                    "sub_domain": user.sub_domain
                }
            }});
            return next(null, ticket_res);
        }
    });
};
/**
 * add a new ticket author : vupl
 */
exports.add = [
    (req, res, next) =>{
        validate.check_add_ticket(req.body, next);
    },
    (req, res, next) =>{
        if(req.body.geo){
            req.body.geo.browser = req.header['user-agent'];
        }
        exports.addInternal(req.body, req.user, (err, result) =>{
            if(err){
                return next(err);
            }
            res.json(result);
        });
    }
];

/**
 * find or add new requester
 * add a new ticket
 * author : khanhpq
 * body: {
        requester: {
            name: "",
            value: "",
            code: "",
            name: "",
            type: "",
        },
        fields: {key1: value, ...},
        type:1,
        priority:1,
        subject: "",
        comment: ""
    }
 */
exports.addFromAPI = [
    (req, res, next) =>{
        if(!req.body.requester || !req.body.requester.name || !req.body.requester.email){
             return next(new TypeError("ticket.requester.data.invalid"));
        }
        req.body.requester.value = req.body.requester.email;

        //find or add requester
        req.body.requester.req_user = req.user;
        people_controller.findOrAdd_internal(req.body.requester, (err, result) => {
            if(err){
                return next(err);
            }
            req.body.requester_id = result._id;
            req.body.comment.is_requester = false;

            req.body.ed_user_id = utils.getParentUserId(req.user);
            next();
        });
    },
    (req, res, next) =>{
        //get mail support
        UserMailAccount.findOne({
            ed_user_id: req.body.ed_user_id,
            is_default: true
        }).exec((err, mail_default) =>{
            if(err){
                return next(err);
            }
            req.body.comment.provider = mail_default.provider == enums.Provider.gmail ? enums.Provider.gmail : enums.Provider.iziMail;

            req.body.comment.provider_data = req.body.comment.provider_data || {};
            req.body.comment.provider_data.to_email = req.body.requester.value;
            req.body.comment.provider_data.from_email = mail_default.mail;
            next();
        });
    },
    (req, res, next) =>{
        // validate submitter_id
        if(!req.body.agent_email || !utils.isValidEmail(req.body.agent_email)){
            return next(new TypeError("ticket.agent_email.invalid_email_format"));
        }

        group_user_controller.getUserAndGroupFromEmail(req.body.ed_user_id, req.body.agent_email, function(err, result){
            if(err){
                return next(err);
            }
            if(!result){
                return next(new TypeError("ticket.agent_email.not_found"));
            }
            req.body.comment.user_id = req.body.submitter_id = req.body.agent_id = result.agent._id;
            req.body.group_id = result.group_user.group_id;

            next();
        });
    },
    (req, res, next) =>{
        validate.check_add_ticket(req.body, next);
    },
    (req, res, next) =>{
        if(req.body.geo){
            req.body.geo.browser = req.header['user-agent'];
        }
        req.body.status_date = req.body.comment_time = +moment.utc();
        exports.addInternal(req.body, req.user, (err, result) =>{
            if(err){
                return next(err);
            }
            res.json(result);
        });
    }
];

/*
 * update ticket from API
 * author : khanhpq
 */
exports.editFromAPI = [
    (req, res, next) =>{
        //find requester id
        req.body.comment.provider_data = req.body.comment.provider_data || {};
        req.body.ed_user_id = utils.getParentUserId(req.user);

        if(req.body.requester && req.body.requester.email){
            req.body.requester.value = req.body.requester.email;
            req.body.requester.req_user = req.user
            people_controller.findOrAdd_internal(req.body.requester, (err, result) => {
                if(err){
                    return next(err);
                }
                if(!result){
                    return next(new TypeError("ticket.requester.not_found"));
                }
                req.body.requester_id = result._id;

                req.body.comment.provider_data.to_email = req.body.requester.email;

                next();
            });
        }else{
            if(req.ticket.requester_id){
                User.findById(req.ticket.requester_id).exec((err, result) =>{
                    if(err){
                        return next(err);
                    }
                    if(!result){
                        return next(new TypeError("ticket.requester.not_found"));
                    }
                    req.body.comment.provider_data.to_email = result.email;
                    next();
                });
            }else{
                next();
            }
        }
    },
    (req, res, next) =>{
        //get agent infor
          if(!req.body.agent_email || !utils.isValidEmail(req.body.agent_email)){
            return next(new TypeError("ticket.agent_email.invalid_email_format"));
        }

        group_user_controller.getUserAndGroupFromEmail(req.body.ed_user_id, req.body.agent_email, function(err, result){
            if(err){
                return next(err);
            }
            if(!result){
                return next(new TypeError("ticket.agent_email.not_found"));
            }
            req.body.comment.user_id = req.body.submitter_id = req.body.agent_id = result.agent._id;
            req.body.group_id = result.group_user.group_id;

            next();
        });
    },
    (req, res, next) =>{
        //get mail support
        UserMailAccount.findOne({
            ed_user_id: req.body.ed_user_id,
            is_default: true
        }).exec((err, mail_default) =>{
            if(err){
                return next(err);
            }
            req.body.comment.provider = mail_default.provider == enums.Provider.gmail ? enums.Provider.gmail : enums.Provider.iziMail;
            req.body.comment.provider_data.from_email = mail_default.mail;
            next();
        });
    },
    (req, res, next) =>{
        if(!req.body.status){
            req.body.status = req.ticket.status;
        }

        validate.check_update_ticket(req.body, req.ticket, next);
    },
    (req, res, next) =>{
        var oldTicket = new Ticket(req.ticket);
        var ticket = req.ticket;
        ticket = _.assign(ticket, req.body);

        if(oldTicket.status != ticket.status){
            ticket.status_date = +moment.utc();
        }
        ticket.comment_time = +moment.utc();

        exports.editInternal(req.body, ticket, oldTicket, req.user, (err, result) =>{
            if(err){
                return next(err);
            }
            res.json(result);
        });
    }
];

/**
 * show current ticket author : vupl
 */
exports.read = (req, res, next) => {
    var ticket = req.ticket.toObject();
    
    if((ticket.stats || {}).last_time_status_solved){
        ticket.solved_date = ticket.stats.last_time_status_solved;
    }
    res.json(ticket);
};

/**
 * update the current ticket author : thanhdh
 */
exports.update = [
    (req, res, next) => {
        validate.check_update_ticket(req.body, req.ticket, next);
    },
    (req, res, next) => {
        var oldTicket = new Ticket(req.ticket);
        var ticket = req.ticket;
        // Merge existing ticket
        if(utils.isEmpty(req.ticket.submitter_id)){
            req.body.submitter_id = req.user._id;
        } else {
            req.body.submitter_id = req.ticket.submitter_id;
        }
        ticket = _.assign(ticket, req.body);
        if(req.body.geo){
            req.body.geo.browser = req.header['user-agent'];
        }
        if(oldTicket.status == enums.TicketStatus.Suppended){
            ticket.status = enums.TicketStatus.Open;
        }
        if(oldTicket.status == enums.TicketStatus.New){
            if(utils.isEmpty(req.body.agent_id)){
                if(_.indexOf([enums.TicketStatus.Open, enums.TicketStatus.Pending], req.body.status)){
                    ticket.status = req.body.status;
                } else {
                    ticket.status = enums.TicketStatus.Open;
                }
            }
        }
        if(oldTicket.status == enums.TicketStatus.Closed){
            res.json(oldTicket);
        } else{
            // get files send to provider Zalo.
            req.body.files = req.files ? req.files.attachments : [];
            exports.editInternal(req.body, ticket, oldTicket, req.user, (err, result) =>{
                if(err){
                    return next(err);
                }
                res.json(result);
            });
        }
    }
];

/**
 * logically delete the current ticket author : thanhdh
 */
exports.delete = (req, res, next) => {
    var ticket = req.ticket;
    ticket.is_delete = true;
    ticket.provider_data_id = undefined;
    ticket.agent_is_delete = req.user._id;
    ticket.save((err) => {
        if (err) {
            return next(err);
        }
        emitter.emit('evt.ticket.comment.delete', ticket);
        rbSender(config.rabbit.sender.exchange.report, {topic: 'izi-core-ticket-delete-stats', payload: {
            ticket: ticket
        }});
        rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-report-filter-ticket', payload: {
            ticket: ticket,
            user: req.user,
            is_delete: true
        }});
        /*if(ticket.provider == enums.Provider.fbComment || ticket.provider == enums.Provider.fbMessage){
            emitter.emit('evt.ticket.facebook.delete_ticket_id', ticket);
        }*/
        res.json(ticket);
    });
};

exports.deleteTickets = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user);
    var ids = req.query.ids;
    var id_failed = [];
    if(!Array.isArray(ids)){
        return next(new TypeError("ticket.delete_ticket.data_must_array"));
    }

    var delete_ticket = (data, index) =>{
        if(utils.isEmpty(data[index])){
            if(id_failed.length > 0){
                return res.status(400).json({
                    errors: id_failed
                });
            }
            return res.json({
                message: "ticket.delete_success"
            });
        }
        Ticket.findById(data[index]).exec((err, ticket) =>{
            if(err){
                console.error(err, `fails delete ticket id ${data[index]}`);
                id_failed.push(data[index]);
                return delete_ticket(data, ++index);
            }
            if(!ticket || !_.isEqual(ticket.ed_user_id, idOwner) || ticket.is_delete){
                console.error(`fails delete ticket id ${data[index]}`);
                id_failed.push(data[index]);
                return delete_ticket(data, ++index);
            }
            ticket.is_delete = true;
            ticket.provider_data_id = undefined;
            ticket.save(err =>{
                if (err) {
                    return delete_ticket(data, ++index);
                }
                emitter.emit('evt.ticket.comment.delete', ticket);
                rbSender(config.rabbit.sender.exchange.report, {topic: 'izi-core-ticket-delete-stats', payload: {
                    ticket: ticket
                }});
                rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-report-filter-ticket', payload: {
                    ticket: ticket,
                    user: req.user,
                    is_delete: true
                }});
                /*if(ticket.provider == enums.Provider.fbComment || ticket.provider == enums.Provider.fbMessage){
                    emitter.emit('evt.ticket.facebook.delete_ticket_id', ticket);
                }*/
                return delete_ticket(data, ++index);
            })

        });
    }
    delete_ticket(ids, 0);
}

/**
 * rating the current ticket author : dientn
 */
exports.rating =[
    (req, res, next)=>{
        validate.validateRating(req.body, next);
    },
    (req, res, next) => {
        if(req.body.ticket_id != req.params.ticketId_rating){
            return next(new TypeError('ticket.id_invalid'));
        }
        
        new Promise(function(resolve, reject) {
            //find ticket
           Ticket.findById(req.params.ticketId_rating).exec((err, ticket) => {
               if(err){
                    return reject(err);
               }
               resolve({ticket: ticket});
           });
        }).then(function(data) {
            return new Promise(function(resolve, reject) {
                //find agent
                if(!mongoose.Types.ObjectId.isValid(req.body.agent_id)){
                    return resolve(data);
                }
                User.findById(req.body.agent_id).exec((err, agent) => {
                    if(err){
                        return reject(err);
                    }
                    data.agent = agent;
                    resolve(data);
                });
            });

        }).then(function(data) {
            return new Promise(function(resolve, reject) {
                //find group
                if(!mongoose.Types.ObjectId.isValid(req.body.group_id)){
                    return resolve(data);
                }

                Group.findById(req.body.group_id).exec((err, group) => {
                    if(err){
                        return reject(err);
                    }
                    data.group = group;
                    resolve(data);
                });
            });

        }).then(result => {
            rbSender(config.rabbit.sender.exchange.trigger, {topic: 'izi-trigger-ticket-flow', payload:  {
                ticket: {
                    _id: req.body.ticket_id,
                    provider: result.ticket.provider,
                    ed_user_id: result.ticket.ed_user_id,
                    rating: {
                        value : enums.TicketRating[req.body.rating],
                        comment: req.body.comment,
                        agent_id: req.body.agent_id,
                        agent_name: result.agent ? result.agent.name : undefined,
                        group_id: req.body.group_id,
                        group_name: result.group ? result.group.name : undefined,
                        upd_time : +moment()        
                    }
                },
                submitter_id: ticket.ed_user_id
            }});
            res.json({is_success: true});
        }).catch(error => {
            return next(error);
        });
    }
];


/**
 * update rating in ticket stats
 * author: dientn
 */
exports.updateRating = (data, next) =>{
    var ticket = {
        _id: data.ticket_id,
        provider: data.provider,
        ed_user_id: data.ed_user_id,
        rating: {
            value : data.rating,
            upd_time : +moment()        
        }
    };
    
    if(data.ticket && data.comment != undefined){
        ticket.rating.comment = data.comment;
    }
    
    rbSender(config.rabbit.sender.exchange.trigger, {topic: 'izi-trigger-ticket-flow', payload:  {
        ticket: ticket,
        submitter_id: data.submitter_id
    }});
    return next();
}

















/**
 * get Ticket Info author: vupl
 */
exports.getTicketInfo = (ticket_id, next) =>{
    Ticket.findById(ticket_id)
        .populate({
            path: 'requester_id agent_id group_id organization',
            select: '_id name'
        }).exec((err, ticket) =>{
            if(err){
                return next(err);
            }
            return next(null, ticket);
    });
}

/**
 * search ticket by id or subject or requester author: vupl
 */
exports.search = [
    (req, res, next) =>{
        validate.check_search_ticket(req.body, next);
    },
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        var stage = [];
        var skip = req.param.skip ? req.param.skip : config.paging.skip;
        if(req.body.type == enums.SearchTicketBy.requester){
            stage = [
                {
                    $match: {
                        ed_parent_id: idOwner,
                        is_requester: true,
                        name : {
                            $regex : utilsTicket.addslashes(req.body.value),
                            $options: "i"
                        }
                    }
                },
                {
                    $lookup: {
                        from: config.dbTablePrefix.concat('ticket'),
                        localField:  '_id',
                        foreignField: 'requester_id',
                        as: "ticket_docs"
                    }
                },{
                    $unwind: "$ticket_docs"
                },{
                    $match: {
                        "ticket_docs.status": {
                            $lt: enums.TicketStatus.Closed
                        },
                        "ticket_docs.is_delete": {
                            $ne: true
                        }
                    }
                },{
                    $project: {
                        "_id" : "$ticket_docs._id",
                        "status" : "$ticket_docs.status",
                        "subject" : "$ticket_docs.subject",
                        "add_time" : "$ticket_docs.add_time",
                        "name" : "$name",
                        "is_delete" : "$ticket_docs.is_delete"
                    }
                },{
                    $sort: {
                        "add_time" : -1
                    }
                },{
                    $skip: skip
                },{
                    $limit: config.paging.limit
                }
            ];
            User.aggregate(stage).exec((err, result) =>{
                if(err){
                    console.error(err, "Failed find ticket by requester");
                    return next(err);
                }
                res.json(result);
            });
        }else {
            var query = {
                ed_user_id: idOwner,
                status: {
                    $lt: enums.TicketStatus.Closed
                },
                is_delete: {
                    $ne: true
                }
            };
            if(req.body.type == enums.SearchTicketBy.id){
                query['_id'] = req.body.value;
            } else if(req.body.type == enums.SearchTicketBy.subject){
                query['subject'] = {
                    $regex : utilsTicket.addslashes(req.body.value),
                    $options: "i"
                };
            }
            stage = [
                {
                    $match: query
                },{
                    $lookup: {
                        from: config.dbTablePrefix.concat('user'),
                        localField:  'requester_id',
                        foreignField: '_id',
                        as: "requester_docs"
                    }
                },{
                    $unwind: {
                        path: "$requester_docs",
                        preserveNullAndEmptyArrays: true
                    }
                },{
                    $project: {
                        "_id": "$_id",
                        "status" : "$status",
                        "subject": "$subject",
                        "add_time": "$add_time",
                        "name": {
                            $cond: {
                                if : {
                                    $eq: ["$requester_docs.length", 0]
                                }, then: "", else: "$requester_docs.name"
                            }
                        }
                    }
                },{
                    $sort: {
                        "add_time": -1
                    }
                },{
                    $skip: skip
                },{
                    $limit: config.paging.limit
                }
            ];
            Ticket.aggregate(stage).exec((err, result) =>{
                if(err){
                    console.error(err, "Failed find ticket by id and subject")
                }
                res.json(result);
            });
        }
    }
];

exports.listTicket = (req, res, next) =>{
    var params = {
        query: {
            ed_user_id: utils.getParentUserId(req.user),
            status: {
                $in: [enums.TicketStatus.New, enums.TicketStatus.Open, enums.TicketStatus.Pending]
            },
            is_delete: false
        },
        select: '_id status subject requester_id',
        populate: ({
            include: 'requester_id',
            fields: 'name is_requester _id profile_image'
        }),
        skip: req.query.skip,
        sort: 'upd_time',
        limit: 5
    };
    utils.findByQuery(Ticket, params).exec((err, ticket) =>{
        if (err) {
            return next(err);
        }
        res.json(ticket);
    });
}

exports.listHist = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user),
        skip = req.query.skip,
        ticket_id = req.params.ticketId;
   var params = {
        query: {
            ed_user_id: idOwner,
            ticket_id: ticket_id
        },
        select: '_id user_id comment_id comments submitter_id changed business geo add_time',
        populate: ({
            include: 'user_id comment_id submitter_id comments._id comments.user_id',
            fields: 'name is_requester _id content add_time profile_image'
        }),
        sort: 'add_time',
        skip: skip
    };
    utils.findByQuery(TicketHist, params).exec((err, ticketHist) =>{
        if (err) {
            return next(err);
        }
        res.json(ticketHist);
    });
};

/**
 * Ticket middleware
 */
exports.ticketByID = (req, res, next, id) => {
    // check the validity of ticket id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('ticket.id.objectId'));
    }
    var idOwner = utils.getParentUserId(req.user);
    // find ticket by its id
    Ticket.findById(id).exec((err, ticket) => {
        if (err){
            return next(err);
        }
        if (!ticket || !_.isEqual(ticket.ed_user_id, idOwner) || ticket.is_delete) {
            return next(new TypeError('ticket.id_not_found'));
        }
        req.ticket = ticket;
        next();
    });
}
