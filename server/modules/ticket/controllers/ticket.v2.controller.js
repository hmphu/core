'use strict';
//
// ticket.controller.js
// handle core system routes
//
// Created by vupl on 2017-03-06.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    utils = require('../../core/resources/utils'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    people_controller = require('../../people/controllers/people.user.controller'),
    group_user_controller = require('../../people/controllers/people.group.user.controller'),
    Ticket = mongoose.model('Ticket'),
    TicketComment = mongoose.model('TicketComment'),
    UserMailAccount = mongoose.model('UserMailAccount'),
    validate = require('../validator/ticket.validator'),
    file = require('../../core/resources/file'),
    enums = require('../resources/enums'),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq')),
    socketIO = require(path.resolve('./config/lib/socket.io')),
    utilsTicket = require('../resources/utils');

var editTicketComment = (data) => {
    return new Promise((resolve, reject) => {
        if (data.ticketComment.provider && data.ticketComment.provider != enums.Provider.web) {
            data.ticketComment.is_internal = false;
        }
        data.ticketComment.ed_user_id = data.idOwner;
        data.ticketComment.ticket_id = data.ticket._id ? data.ticket._id : undefined;
        if (data.ticketComment.attachments) {
            var attachments = [];
            _.forEach(data.ticketComment.attachments, (file) => {
                if (file.filename) {
                    attachments.push(file.filename);
                }
            });
            data.ticketComment.attachments = attachments;
        }
        if (data.files && data.files.attachments) {
            file.moveFile(data.idOwner, data.files.attachments);
        }
        resolve(data);
    });
};

var editContent = (data) => {
    return new Promise((resolve, reject) => {
        var is_dynamic_content = ((data.ticketComment.content || "").match(/\{\{[\w.]+\}\}/g)),
            language = data.user.language || "en";
        if (!is_dynamic_content || is_dynamic_content.length == 0) {
            return resolve(data);
        } else {
            utilsTicket.getContent(data.ticketComment.content, data.idOwner, language, [], (err, result) => {
                if (err) {
                    console.error(err, `get content ticket comment error`);
                    return resolve(data);
                }
                data.ticket.comment = data.ticketComment;
                utilsTicket.setTicketInfor(data.ticket, result, 'text', data.user, true, [], (content) => {
                    delete data.ticket.comment;
                    data.ticketComment.content = content;
                    return resolve(data);
                });
            });
        }
    });
};

var detectChannelSend = (data) => {
    return new Promise((resolve, reject) => {
        utilsTicket.mappingChannelSend(data, (err, result) => {
            return resolve(result);
        });
    });
};

var preDataRetrySendRabbit = (ticketComment, ticket, user, files) => {
    var idOwner = utils.getParentUserId(user),
        comments = [],
        data = {
            ticketComment: ticketComment.toObject(),
            ticket: ticket.toObject(),
            idOwner: idOwner,
            user: user,
            files: files,
            is_retry: true
        };
    detectChannelSend(data).then(result => {
        delete result.ticket.__v;
        delete result.ticket.stats;
        delete result.ticketComment.__v;
        result.ticketComment.user_name = user.name;// set user_name
        comments.push(result.ticketComment);
        socketIO.emit('/core', idOwner, {
            topic: 'izi-core-client-retry-comment-v2',
            payload: {
                ed_user_id: data.ed_user_id,
                ticket: ticket,
                comment: result.ticketComment,
                error: result.ticket.error ? { single: result.ticket.error } : {}
            }
        });
        delete result.ticket.error;
        rbSender(config.rabbit.sender.exchange.trigger, {
            topic: 'izi-trigger-ticket-flow',
            payload: {
                ticket: result.ticket,
                comments: comments,
                submitter_id: user._id,
                is_retry: true,
                is_not_socket: true
            }
        });
        return;
    });
}

exports.preDataEditSendRabbit = (ticketComment, ticket, user, files, next) => {
    var idOwner = utils.getParentUserId(user);
    if (ticketComment && ticketComment.content && !utils.isEmpty(ticketComment.content)) {
        let newTicketComment = new TicketComment(ticketComment).toObject();
        newTicketComment.isNew = true;
        if(files){
            newTicketComment.attachments = files.attachments;
        }
        var comments = [],
            data = {
                ticketComment: newTicketComment,
                ticket: ticket,
                idOwner: idOwner,
                user: user,
                files: files,
                is_retry: false
            };
        editTicketComment(data)
            .then(editContent)
            .then(detectChannelSend)
            .then(result => {
                result.ticketComment.user_name = user.name;// set user_name
                comments.push(result.ticketComment);
                delete result.ticket.error;
                rbSender(config.rabbit.sender.exchange.trigger, {
                    topic: 'izi-trigger-ticket-flow',
                    payload: {
                        ticket: result.ticket,
                        comments: comments,
                        submitter_id: user._id,
                        is_retry: false
                    }
                });
                result.ticketComment.user_id = utilsTicket.mappingUserId(user);
                result.ticket.comment = result.ticketComment;
                return next(null, result.ticket);
            }).catch(err => {
                console.log(err);
            })
    } else {
        //      send data to trigger by rabbitmq.
        rbSender(config.rabbit.sender.exchange.trigger, {
            topic: 'izi-trigger-ticket-flow',
            payload: {
                ticket: ticket,
                comments: [],
                submitter_id: user._id
            }
        });
        return next(null, ticket);
    }
};

/**
 * add a new ticket author : vupl
 */
exports.add = [
    (req, res, next) => {
        validate.check_add_ticket(req.body, next);
    },
    (req, res, next) => {
        if (req.body.geo) {
            req.body.geo.browser = req.header['user-agent'];
        }
        let ticketComment = req.body.comment;
        ticketComment.is_first = true;
        delete req.body.comment;
        let ticket = new Ticket(req.body);
        ticket = ticket.toObject();
        ticket.isNew = true;
        exports.preDataEditSendRabbit(ticketComment, ticket, req.user, req.files, (err, result) => {
            if (err) {
                return next(err);
            }
            res.json(result);
        });
    }
];

exports.addFromApi = [
    (req, res, next) => {
        if (!req.body.requester || !req.body.requester.name || !req.body.requester.email) {
            return next(new TypeError("ticket.requester.data.invalid"));
        }
        req.body.requester.value = req.body.requester.email;

        //find or add requester
        req.body.requester.req_user = req.user;
        people_controller.findOrAdd_internal(req.body.requester, (err, result) => {
            if (err) {
                return next(err);
            }
            req.body.requester_id = result._id;
            req.body.comment.is_requester = false;

            req.body.ed_user_id = utils.getParentUserId(req.user);
            next();
        });
    },
    (req, res, next) => {
        //get mail support
        UserMailAccount.findOne({
            ed_user_id: req.body.ed_user_id,
            is_default: true
        }).exec((err, mail_default) => {
            if (err) {
                return next(err);
            }
            req.body.comment.provider = mail_default.provider == enums.Provider.gmail ? enums.Provider.gmail : enums.Provider.iziMail;

            req.body.comment.provider_data = req.body.comment.provider_data || {};
            req.body.comment.provider_data.to_email = req.body.requester.value;
            req.body.comment.provider_data.from_email = mail_default.mail;
            next();
        });
    },
    (req, res, next) => {
        // validate submitter_id
        if (!req.body.agent_email || !utils.isValidEmail(req.body.agent_email)) {
            return next(new TypeError("ticket.agent_email.invalid_email_format"));
        }

        group_user_controller.getUserAndGroupFromEmail(req.body.ed_user_id, req.body.agent_email, function (err, result) {
            if (err) {
                return next(err);
            }
            if (!result) {
                return next(new TypeError("ticket.agent_email.not_found"));
            }
            req.body.comment.user_id = req.body.submitter_id = req.body.agent_id = result.agent._id;
            req.body.group_id = result.group_user.group_id;

            next();
        });
    },
    (req, res, next) => {
        if (!req.body.status) {
            req.body.status = enums.TicketStatus.New;
        }
        validate.check_add_ticket(req.body, next);
    },
    (req, res, next) => {
        if (req.body.geo) {
            req.body.geo.browser = req.header['user-agent'];
        }
        let ticketComment = req.body.comment;
        ticketComment.is_first = true;
        delete req.body.comment;
        let ticket = new Ticket(req.body);
        ticket = ticket.toObject();
        ticket.isNew = true;
        ticket.status_date = +moment.utc();
        ticket.comment_time = +moment.utc();
        exports.preDataEditSendRabbit(ticketComment, ticket, req.user, req.files, (err, result) => {
            if (err) {
                return next(err);
            }
            res.json(result);
        });
    }
];

/**
 * edit a new ticket author : vupl
 */
exports.update = [
    (req, res, next) => {
        validate.check_update_ticket(req.body, req.ticket, next);
    },
    (req, res, next) => {
        var oldTicket = new Ticket(req.ticket);
        var ticket = req.ticket;
        ticket = ticket.toObject();
        // Merge existing ticket
        if (utils.isEmpty(req.ticket.submitter_id)) {
            req.body.submitter_id = req.user._id;
        } else {
            req.body.submitter_id = req.ticket.submitter_id;
        }
        ticket = _.assign(ticket, req.body);
        delete ticket.comment;
        delete ticket.stats;
        delete ticket.__v;
        if (req.body.geo) {
            req.body.geo.browser = req.header['user-agent'];
        }
        if (oldTicket.status == enums.TicketStatus.Suppended) {
            ticket.status = enums.TicketStatus.Open;
        }
        if (oldTicket.status == enums.TicketStatus.New) {
            if (utils.isEmpty(req.body.agent_id)) {
                if (_.indexOf([enums.TicketStatus.Open, enums.TicketStatus.Pending], req.body.status)) {
                    ticket.status = req.body.status;
                } else {
                    ticket.status = enums.TicketStatus.Open;
                }
            }
        }
        if (oldTicket.status == enums.TicketStatus.Closed) {
            res.json(oldTicket);
        } else {
            exports.preDataEditSendRabbit(req.body.comment, ticket, req.user, req.files, (err, result) => {
                if (err) {
                    return next(err);
                }
                res.json(result);
            });
        }
    }
];

/*
 * update ticket from API
 * author : khanhpq
 */
exports.editFromApi = [
    (req, res, next) => {
        //find requester id
        req.body.comment.provider_data = req.body.comment.provider_data || {};
        req.body.ed_user_id = utils.getParentUserId(req.user);

        if (req.body.requester && req.body.requester.email) {
            req.body.requester.value = req.body.requester.email;
            req.body.requester.req_user = req.user
            people_controller.findOrAdd_internal(req.body.requester, (err, result) => {
                if (err) {
                    return next(err);
                }
                if (!result) {
                    return next(new TypeError("ticket.requester.not_found"));
                }
                req.body.requester_id = result._id;

                req.body.comment.provider_data.to_email = req.body.requester.email;

                next();
            });
        } else {
            if (req.ticket.requester_id) {
                User.findById(req.ticket.requester_id).exec((err, result) => {
                    if (err) {
                        return next(err);
                    }
                    if (!result) {
                        return next(new TypeError("ticket.requester.not_found"));
                    }
                    req.body.comment.provider_data.to_email = result.email;
                    next();
                });
            } else {
                next();
            }
        }
    },
    (req, res, next) => {
        //get agent infor
        if (!req.body.agent_email || !utils.isValidEmail(req.body.agent_email)) {
            return next(new TypeError("ticket.agent_email.invalid_email_format"));
        }

        group_user_controller.getUserAndGroupFromEmail(req.body.ed_user_id, req.body.agent_email, function (err, result) {
            if (err) {
                return next(err);
            }
            if (!result) {
                return next(new TypeError("ticket.agent_email.not_found"));
            }
            req.body.comment.user_id = req.body.submitter_id = req.body.agent_id = result.agent._id;
            req.body.group_id = result.group_user.group_id;

            next();
        });
    },
    (req, res, next) => {
        //get mail support
        UserMailAccount.findOne({
            ed_user_id: req.body.ed_user_id,
            is_default: true
        }).exec((err, mail_default) => {
            if (err) {
                return next(err);
            }
            req.body.comment.provider = mail_default.provider == enums.Provider.gmail ? enums.Provider.gmail : enums.Provider.iziMail;
            req.body.comment.provider_data.from_email = mail_default.mail;
            next();
        });
    },
    (req, res, next) => {
        if (!req.body.status) {
            req.body.status = req.ticket.status;
        }

        validate.check_update_ticket(req.body, req.ticket, next);
    },
    (req, res, next) => {
        var oldTicket = new Ticket(req.ticket);
        var ticket = req.ticket;
        ticket = ticket.toObject();
        // Merge existing ticket
        if (utils.isEmpty(req.ticket.submitter_id)) {
            req.body.submitter_id = req.user._id;
        } else {
            req.body.submitter_id = req.ticket.submitter_id;
        }
        ticket = _.assign(ticket, req.body);
        delete ticket.comment;
        delete ticket.stats;
        delete ticket.__v;
        if (req.body.geo) {
            req.body.geo.browser = req.header['user-agent'];
        }
        if (oldTicket.status == enums.TicketStatus.Suppended) {
            ticket.status = enums.TicketStatus.Open;
        }
        if (oldTicket.status == enums.TicketStatus.New) {
            if (utils.isEmpty(req.body.agent_id)) {
                if (_.indexOf([enums.TicketStatus.Open, enums.TicketStatus.Pending], req.body.status)) {
                    ticket.status = req.body.status;
                } else {
                    ticket.status = enums.TicketStatus.Open;
                }
            }
        }
        if (oldTicket.status == enums.TicketStatus.Closed) {
            res.json(oldTicket);
        } else {
            exports.preDataEditSendRabbit(req.body.comment, ticket, req.user, req.files, (err, result) => {
                if (err) {
                    return next(err);
                }
                res.json(result);
            });
        }
    }
];

/*
 * retry ticket comment is error when send to external api.
 */
exports.retryTicketComment = (req, res, next) => {
    TicketComment.findOne({
        ed_user_id: utils.getParentUserId(req.user),
        ticket_id: req.params.ticketId,
        _id: req.params.commentId
    }, (err, result) => {
        if (err) {
            return next(err);
        }
        if (!result) {
            return res.json({
                is_success: true
            });
        }
        var ticket = req.ticket,
            files = result.attachments.length > 0 ? {
                attachments: result.attachments
            } : undefined;
        preDataRetrySendRabbit(result, ticket, req.user, files);
        res.json({
            is_success: true
        });
    });
};

/*
 * logically delete the current ticket author : vupl
 */
exports.delete = (req, res, next) => {
    var ticket = req.ticket;
    ticket = ticket.toObject();
    ticket.is_delete = true;
    ticket.deleted_agent = req.user._id;
    exports.preDataEditSendRabbit({}, ticket, req.user, {}, (err, result) => {
        if (err) {
            return next(err);
        }
        return res.json(result);
    });
};

/*
 * logically delete the any ticket author : vupl
 */
exports.deleteTickets = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var ids = req.query.ids;
    var id_failed = [];
    if (!Array.isArray(ids)) {
        return next(new TypeError("ticket.delete_ticket.data_must_array"));
    }

    var delete_ticket = (data, index) => {
        if (utils.isEmpty(data[index])) {
            if (id_failed.length > 0) {
                return res.status(400).json({
                    errors: id_failed
                });
            }
            return res.json({
                message: "ticket.delete_success"
            });
        }
        Ticket.findById(data[index]).exec((err, ticket) => {
            if (err) {
                console.error(err, `fails delete ticket id ${data[index]}`);
                id_failed.push(data[index]);
                return delete_ticket(data, ++index);
            }
            if (!ticket || !_.isEqual(ticket.ed_user_id, idOwner) || ticket.is_delete) {
                console.error(`fails delete ticket id ${data[index]}`);
                id_failed.push(data[index]);
                return delete_ticket(data, ++index);
            }
            ticket = ticket.toObject();
            ticket.is_delete = true;
            ticket.provider_data_id = undefined;
            ticket.deleted_agent = req.user._id;
            exports.preDataEditSendRabbit({}, ticket, req.user, {}, (err, result) => {
                if (err) {
                    return delete_ticket(data, ++index);
                }
                return delete_ticket(data, ++index);
            });
        });
    }
    delete_ticket(ids, 0);
}
