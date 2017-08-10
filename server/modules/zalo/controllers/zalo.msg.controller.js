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
var _ = require('lodash'),
    mongoose  = require('mongoose'),
    path = require('path'),
    moment = require('moment'),

    config = require(path.resolve('./config/config')),
    utils = require('../../core/resources/utils'),
    file_utils = require('../../core/resources/file'),
    zalo_utils = require('../resources/zalo.utils'),
    enumsTicket = require('../../ticket/resources/enums'),
    providerTicket = require('../../ticket/providers/index.provider'),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq')),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    ticketController = require('../../ticket/controllers/ticket.controller'),
    peopleGroup = require('../../people/controllers/people.group.user.controller'),

    UserZaloOA = mongoose.model("UserZaloOA"),
    Ticket = mongoose.model("Ticket"),
    TicketComment = mongoose.model("TicketComment"),
    User = mongoose.model("User");

exports.test = [
    function (req, res, next) {
//        console.log(req.file, req.files);
//        console.log(req.query)
//        console.log(req.body);
//        res.send(`Received ` + JSON.stringify(req.body));

        zalo_utils.getMessages({
            offset: 0,
            count: 1,
            uid: "1336325875880804122",
            accessTok: "LQO6R31fGYj2aWj7UJjWF1M6644Y3q8KRuP7IIe64mft-3TR2GHyDpIl9ZrW86KvJ9SpP0SQGnj-dH1UAc9rEasfF61XCXvJ1O1m40WQSDWiW3EGRR6WWafxnCOzaEpOPYpBnr2pqTq7BkQIChpiyoDVoDTbq8Z1DqwlnYOEVHa541nY7m"
        }).then(result => {
            console.log(result);
            res.json(result);
        }, (err) => {
            res.json(err);
            console.log(err);
        });

//        var url = "http://s240.avatar.talk.zdn.vn/2/3/e/4/23/240/c8dbaf412d1e4c8705199b8edc6a2ef5.jpg";
//        var dir = "assets/uploads/575e6faf68b17cfd2a1b7e57";
//        var name = "test.jpg";
//        zalo_utils.downloadImage(url, dir, name).then(result => {
//            console.log(result);
//            res.json(result);
//        }, (err) => {
//            res.json(err);
//            console.log(err);
//        });

//        res.sendStatus(200);
    }
];

exports.list = [
    function (req, res, next) {

        var page = req.zalo_oa;

        var limit = 10,
            skip = parseInt(req.query.skip||"") || 0,
            qskip = parseInt(req.query.qskip||"") || 0;

        var query = {
            ed_user_id: utils.getParentUserId(req.user),
            is_delete: false,
            provider: enumsTicket.Provider.zaloMessage,
            "provider_data.zalouid": req.params.id,
            "provider_data.oaid": page.page_id
        };

        if (qskip) {
            query.add_time = { $lt: qskip };
        }

        TicketComment.find(query).skip(skip).limit(limit + 1).sort("-add_time").exec((err, messages) => {
            if (err) {
                return next(err);
            }
            var is_all = true;
            if (messages.length > limit) {
                is_all = false;
                messages.pop();
            }
            res.json({
                is_all: is_all,
                messages: messages
            });
        });
    }
];

exports.realtimeMessages = data => {
    console.log(JSON.stringify(data));
};

exports.commentPostMessage = (idOwner, zalo_info, content, file, next) => {
    if (file) {
        file.path = `${config.upload.path}${idOwner}/${file.filename}`;
    }
    var data = {
        oaid: zalo_info.oaid,
        idOwner: idOwner,
        file: file,
        msg: {
            content: content,
            uid: zalo_info.zalouid
        }
    };
    detectZaloOA(data)
    .then(uploadMessageImg)
    .then(sendMessageToZalo)
    .then(result => {
        next&&next(null, {
            msgid: result.msgid,
            provider_data: providerTicket.setZaloMsgComment({
                fromuid: zalo_info.zalouid,
                oaid: zalo_info.oaid,
                display_as: file?"image":"text"
            })
        });
    }, err => {
        next&&next(err);
    });
};

function detectZaloOA(data) {
    return new Promise((resolve, reject) => {
        UserZaloOA.findOne({
            page_id: data.oaid,
            ed_user_id: data.idOwner
        }, (err, oa) => {
            if (err) {
                return reject(err);
            }
            if (!oa) {
                return reject("zalo.page_not_found");
            }
            if (!oa.is_active) {
                return reject("zalo.page_deactive");
            }
            if (+moment.utc() - oa.permission.add_time >= 31536000*1000) { //777600 = 90*86400
                return reject("zalo.access_token_expire");
            }
            data.access_token = oa.permission.access_token;
            resolve(data);
        });
    });
}

exports.createMessage = [
    function (req, res, next) {
        if (req.body.content || req.file) {
            return next();
        }
        return next(new TypeError('zalo.content_empty'));
    },
    function (req, res, next) {
        if (!mongoose.Types.ObjectId.isValid(req.body.ticket_id)) {
            return next(new TypeError('zalo.ticket_not_object_id'));
        }

        var oa = req.zalo_oa;
        if (!oa.is_active) {
            return next(new TypeError('zalo.page_deactive'));
        }

        Ticket.findOne({
            _id: req.body.ticket_id,
            ed_user_id: utils.getParentUserId(req.user),
            is_delete: false,
            status: {$ne: enumsTicket.TicketStatus.Closed}
        }).select("provider status ed_user_id submitter_id requester_id provider_data").exec((err, ticket) => {
            if (err) {
                return next(err);
            }
            if (!ticket) {
                return next(new TypeError('zalo.ticket_invalid'));
            }
            ticket = ticket.toObject();
            req.ticket = ticket;
            next();
        });
    },
    function (req, res, next) {
        var oa = req.zalo_oa;
        var access_token = oa.permission.access_token;
        var data = {
            idOwner: utils.getParentUserId(req.user),
            page: oa,
            ticket: req.ticket,
            user: req.user,
            access_token: access_token,
            file: req.file,
            msg: {
                content: req.body.content,
                uid: req.ticket.provider_data.zalouid //"4634985350737671363"
            }
        };
        if (req.body.solved) {
            data.update_ticket_status = enumsTicket.TicketStatus.Solved;
        }

        uploadMessageImg(data)
        .then(sendMessageToZalo)
        .then(moveAttachment)
        .then(createComment)
        .then(result => {
            res.json(result);
        }, err => {
            if (err) {
                if (err.errorMsg) {
                    return next(new TypeError(err.errorMsg));
                }
                next(new TypeError(err));
            }
        });
    }
];

function uploadMessageImg(data) {
    return new Promise((resolve, reject) => {
        if (!data.file) { return resolve(data); }
        zalo_utils.uploadImage(data.file, data.access_token).then(result => {
            data.msg.imgid = result.body.data.imageId;
            resolve(data);
        }, err => {
            reject(err);
        });
    });
}

function sendMessageToZalo(data) {
    return new Promise((resolve, reject) => {
        zalo_utils.postMessage(data.msg, data.access_token).then(result => {
            data.msgid = result.body.data.msgId;
            resolve(data);
        }, err => {
            reject(err);
        });
    });
}

function moveAttachment(data) {
    return new Promise((resolve, reject) => {
        if (!data.file) { return resolve(data); }

        var beg_path = config.upload.tmp_path,
            des_path = `${config.upload.path}${data.idOwner}`;
        file_utils.moveFilesWithPath([data.file], beg_path, des_path, err => {
            console.error(err);
        });
        data.attachments = [data.file.filename];
        resolve(data);
    });
}

function createComment(data) {
    return new Promise((resolve, reject) => {
        var comment = new TicketComment({
            ed_user_id: data.idOwner,
            ticket_id: data.ticket._id,
            comment_id: data.msgid,
            content: data.msg.content || "---",
            attachments: data.attachments,
            provider_data: providerTicket.setZaloMsgComment({
                fromuid: data.msg.uid,
                oaid: data.page.page_id,
                display_as: data.file?"image":"text"
            }),
            user_id: data.user._id,
            provider: data.ticket.provider,
            is_requester: false,
            is_first: false,
            is_internal: false,
            is_public: false, //not continue send to zalo and move attachments
            add_time: +moment.utc()
        }).toJSON();
        comment.isNew = true;

        addCommentToTicket(comment, data.user, data, (err, ticket) => {
            if (err) { return reject(err); }
            resolve(data);
        });
    });
}

function addCommentToTicket(comment, user, data, next) {
    var idOwner = utils.getParentUserId(user);
    var query = { ed_user_id: idOwner, _id: data.ticket._id };

    Ticket.findOne(query, (err, old_ticket) => {
        if (err) { return next(err); }
        if (!old_ticket) { return next("zalo.ticket_not_found"); }

        var ticket = old_ticket.toJSON();
        var status = old_ticket.status;
        var now = +moment.utc();

        if (old_ticket.status == enumsTicket.TicketStatus.New) {
            status = enumsTicket.TicketStatus.Open;
        }

        if (data.update_ticket_status !== undefined) {
            status = data.update_ticket_status;
        }

        if (old_ticket.status != status) {
            ticket.status_date = now;
            if (status == enumsTicket.TicketStatus.Solved) {
                ticket.solved_date = now;
            }
        }
        ticket.__v = undefined;
        ticket.stats = undefined;
        ticket.status = status;
        if (status != enumsTicket.TicketStatus.Solved || ticket.agent_id || old_ticket.status == enumsTicket.TicketStatus.Solved) {
            emitter.emit('evt.zalo.trigger.update.ticket', {
                ticket: ticket,
                comments: [comment],
                submitter_id: user._id
            });
            return next(null, Object.assign({}, ticket, { comment: comment }));
        }
        peopleGroup.findGroupUser(idOwner, user._id, (err, result) => {
            if (err) { return next(err); }
            ticket.agent_id = user._id;
            ticket.group_id = result.group_id;
            emitter.emit('evt.zalo.trigger.update.ticket', {
                ticket: ticket,
                comments: [comment],
                submitter_id: user._id
            });
            return next(null, Object.assign({}, ticket, { comment: comment }));
        });
    });
}
