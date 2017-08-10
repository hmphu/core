'use strict';
//
//  ticket comment.controller.js
//  handle core system routes
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    moment = require('moment'),
    sanitizeHtml = require('sanitize-html'),
    mongoose = require('mongoose'),
    Utils = require('../../core/resources/utils'),
    utilsTicket = require('../resources/utils'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    TicketComment = mongoose.model('TicketComment'),
    UserContactController = require('../../people/controllers/people.user.contact.controller'),
    userFbPageController = require('../../user.setting/controllers/user.fb.page.controller'),
    Ticket = mongoose.model('Ticket'),
    User = mongoose.model('User'),
    file = require('../../core/resources/file'),
    enums = require('../resources/enums'),
    enumsContacts = require('../../people/resources/enums.res'),
    enumsVoip = require('../../voip/resources/enums'),
    enumsTicket = require('../resources/enums'),
    enumsCore = require('../../core/resources/enums.res'),
    translation = require('../resources/translation'),
    sendmail = require('../../core/resources/sendmail'),
    config = require(path.resolve('./config/config')),
    provider_stategies = require('../providers/index.provider'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter'));


/**
 * add a new ticket
 * author : vupl
 */
exports.add =  (data, ticket, user, next) =>{
    if(data.provider && data.provider != enums.Provider.web){
        data.is_internal = false;
    }
    if(data.provider == enums.Provider.iziComment){
        data.provider_data = {};
    }
    var ticketComment = new TicketComment(data),
        language = user.language || "en";
    ticketComment.ed_user_id = ticket.ed_user_id;
    ticketComment.ticket_id = ticket._id;
    if(data.attachments){
        _.forEach(data.attachments, (file) => {
            if(file.filename){
                ticketComment.attachments.push(file.filename);
            }
        });
    }
    //pre data content with dynamic content
    new Promise ((resolve, reject) =>{
        var is_dynamic_content = ((ticketComment.content || "").match( /\{\{[\w.]+\}\}/g ));
        if(!is_dynamic_content || is_dynamic_content.length == 0){
            return resolve(ticketComment.content);
        }else{
            utilsTicket.getContent(ticketComment.content, ticketComment.ed_user_id, language, [], (err, result) =>{
                if(err){
                    return reject(err);
                }
                ticket.comment = ticketComment;
                utilsTicket.setTicketInfor(ticket, result, 'text' , user, true, [], (content) =>{
                    return resolve(content);
                });
            });
        }
    }).then(value =>{
        ticketComment.content= value;
        tmp_data.save('ticket_comment_add', ticketComment.ed_user_id, ticketComment, ticketComment, (err, result) =>{
            if(err){
                return next(err, null);
            }
            if (ticketComment.is_public) {
                file.moveFile(ticketComment.ed_user_id, data.attachments);
            }
            User.findOne({_id: result.user_id}).select('_id name profile_image').exec((err, result) =>{
                if(err){
                    return next(err, null);
                }
                ticketComment.user_id = result;
                return next(null, ticketComment);
            })
        });
    }).catch(err =>{
        console.error(err, "Fail get content info");
        return next(err, null);
    })
};

exports.update = (data, provider) =>{
    if(provider == enums.Provider.sms){
        TicketComment.findOneAndUpdate({
        ed_user_id: data.ed_user_id,
        _id: data.comment_id
        },{
            "provider_data.uid" : data.uid
        },{
            upsert: true,
            new: true
        },(err, result) =>{
            if(err){
                console.error(err, "Error failed update ticket comment");
                return;
            }
            return;
        });
    } else if(provider == enums.Provider.fbComment){
        TicketComment.findOneAndUpdate({
            ed_user_id: data.ed_user_id,
            _id: data.comment_id
        },{
            "provider_data.comment_id": data.fb_comment_id,
            "provider_data.is_error": false
        }, {
            upsert: true,
            new: true
        },(err, result) =>{
            if(err){
                console.error(err, "Error failed update ticket comment");
                return;
            }
            return;
        });
    } else if(provider == enums.Provider.fbMessage){
        TicketComment.findOneAndUpdate({
            ed_user_id: data.ed_user_id,
            _id: data.comment_id
        },{
            "provider_data.message_id": data.message_id,
            "provider_data.is_error": false
        },{
            upsert: true,
            new: true
        }, (err, result) =>{
            if(err){
                console.error(err, "Error failed update ticket comment");
                return;
            }
            return;
        })
    } else if(provider == enums.Provider.iziComment){
        let provider_data = provider_stategies.setCommentReply(data.provider_data);
        TicketComment.findOneAndUpdate({
            ed_user_id: data.ed_user_id,
            _id: data.comment_id
        },{
            provider_data: provider_data
        },{
            upsert: true,
            new: true
        },(err, result) =>{
            if(err){
                console.error(err, "Error failed update provider iziComment");
                return;
            }
            return;
        })
    } else if (provider == enums.Provider.zaloMessage){
        var update = { provider_data: data.provider_data };
        if (data.msgid) {
            update.comment_id = data.msgid;
        }
        TicketComment.findOneAndUpdate({
            ed_user_id: data.ed_user_id,
            _id: data.ticket_comment_id
        }, update, (err, result) =>{
            if(err){
                console.error(err, "Error failed update provider zaloMessage");
                return;
            }
            return;
        })
    } else {
        return;
    }
};

/**
 * show current ticket comment author : vupl
 */
exports.read = (req, res, next) => {
    var ticketCmtId = req.params.comment_id;
    // check the validity of ticket id
    if (!mongoose.Types.ObjectId.isValid(ticketCmtId)) {
        return next(new TypeError('ticket.id.objectId'));
    }
    var idOwner = Utils.getParentUserId(req.user);
    // find ticket by its id
    TicketComment.findById(ticketCmtId).exec((err, ticketCmt) => {
        if (err){
            return next(err);
        }
        if (!ticketCmt || !_.isEqual(ticketCmt.ed_user_id, idOwner) || ticketCmt.is_delete) {
            return res.json({});
        }
        res.json(ticketCmt);
    });
};

/**
 * delete comment with id_delete = true
 * author: vupl
 */
exports.delete = (ticket) =>{
    TicketComment.update({
        ed_user_id: ticket.ed_user_id,
        ticket_id: ticket._id
    },{
        is_delete: true
    },{
        multi: true
    }, (err, result) =>{
        if(err){
            console.error(err);
            return;
        }
        return;
    });
};

exports.closeTicket = (ticket) =>{
    TicketComment.update({
        ed_user_id: ticket.ed_user_id,
        ticket_id: ticket._id
    }, {
        is_closed: true
    }, {
        multi: true
    }, (err, result) =>{
        if(err){
            console.error(err);
            return;
        }
        return;
    });
};

exports.firstComment = (req, res, next) =>{
    TicketComment.findOne(
        {
            ed_user_id: Utils.getParentUserId(req.user),
            ticket_id: req.params.ticketId,
            is_first: true
        }).select('_id content attachments').exec((err, result) =>{
            if(err){
                return next(err);
            }
            res.json(result);
        });
}

/**
 * list comment
 * author: vupl
 */
exports.list = (req, res, next) =>{
    var params = {
        query: {
            ed_user_id: Utils.getParentUserId(req.user),
            ticket_id: req.params.ticketId,
            is_first: false,
            is_child: false
        },
        select: '_id user_id ticket_id provider provider_data content attachments is_internal upd_time add_time is_requester',
        populate: ({
            include: 'user_id',
            fields: 'name is_requester _id profile_image roles'
        }),
        skip: req.query.skip,
        sort_order: req.query.sort_order,
        limit: req.query.limit
    };
    Utils.findByQuery(TicketComment, params).exec((err, ticketComment) =>{
        if (err) {
            return next(err);
        }
        res.json(ticketComment);
    });
};


exports.listChildCommentUserPost = (req, res, next) =>{
    var params = {
        query: {
            ed_user_id: Utils.getParentUserId(req.user),
            ticket_id: req.params.ticketId,
            is_first: false,
            is_child: true
        },
        select: '_id user_id provider provider_data content attachments is_internal upd_time add_time is_requester',
        populate: ({
            include: 'user_id',
            fields: 'name is_requester _id profile_image roles'
        }),
        skip: req.query.skip,
        sort_order: req.query.sort_order,
        limit: req.query.limit
    };
    if(req.query.provider == enumsTicket.Provider.youtube){
        params.query['provider_data.parent_yt_id'] = req.params.comment_id;
    } else {
        params.query['provider_data.parent_id'] =  req.params.comment_id
    }
    Utils.findByQuery(TicketComment, params).exec((err, ticketComment) =>{
        if (err) {
            return next(err);
        }
        res.json(ticketComment);
    });
}

exports.listChildComment = (req, res, next) =>{
    var params = {
        query: {
            ed_user_id: Utils.getParentUserId(req.user),
            ticket_id: req.params.ticketId,
            is_first: false,
            is_child: true,
            'provider_data.comment_parent_id': req.params.comment_id
        },
        select: '_id user_id provider provider_data content attachments is_internal upd_time add_time is_requester',
        populate: ({
            include: 'user_id',
            fields: 'name is_requester _id profile_image roles'
        }),
        skip: req.query.skip,
        sort_order: req.query.sort_order,
        limit: req.query.limit
    };
    Utils.findByQuery(TicketComment, params).exec((err, ticketComment) =>{
        if (err) {
            return next(err);
        }
        res.json(ticketComment);
    });
}

exports.updateFacebookError = (data) =>{
    TicketComment.findOneAndUpdate({
        ed_user_id: data.ed_user_id,
        _id: data.comment._id
    },{
        "provider_data.is_error": true
    },{
        upsert: true,
        new: true
    }, (err, result) =>{
        if(err){
            console.error(err, "Error failed update ticket comment");
            return;
        }
        return;
    });
}

exports.retryTicketComment = (req, res, next) =>{
    TicketComment.findOne({
        ed_user_id: Utils.getParentUserId(req.user),
        ticket_id: req.params.ticketId,
        _id: req.params.comment_id
    }, (err, result) =>{
        if(err){
            console.error(err, "Error failed retry facebook comment");
            return next(err);
        }
        var ticket = req.ticket;
        ticket.comment = result;
        User.findOne({_id: result.user_id}).select('_id name profile_image').exec((err_find, result_find) =>{
            if(err_find){
                return next(err, null);
            }
            ticket.comment.user_id = result_find;
            if(req.ticket.provider == enums.Provider.fbComment){
                emitter.emit('evt.ticket.fb.comment', ticket, req.user, true);
                res.json({is_success: true});
            } else if(req.ticket.provider == enums.Provider.fbMessage){
                emitter.emit('evt.ticket.fb.message', ticket, req.user, true);
                res.json({is_success: true});
            } else {
                res.json({is_success: true});
            }
        });
    });
}

exports.listTicketComment = (req, res, next) =>{
     var params = {
        query: {
            ed_user_id: Utils.getParentUserId(req.user),
            ticket_id: req.params.ticketId
        },
        select: '_id user_id provider provider_data content attachments is_internal upd_time add_time is_requester',
        populate: ({
            include: 'user_id',
            fields: 'name is_requester _id profile_image roles'
        }),
        skip: req.query.skip,
        sort_order: 1,
        limit: req.query.limit
    };
    Utils.findByQuery(TicketComment, params).exec((err, ticketComment) =>{
        if (err) {
            return next(err);
        }
        res.json(ticketComment);
    });
}

exports.ticketTranscript = (req, res, next) =>{
    var idOwner = Utils.getParentUserId(req.user),
        to_email = req.body.email_send,
        is_attachments = req.body.is_attachments,
        lng = req.user.language || 'en',
        format = lng == 'vi'? 'DD/MM/YYYY H:mm': 'MM/DD/YYYY H:mm',
        time_zone = req.user.time_zone.value,
        content = [],
        regex = new RegExp("^(http[s]?:\\/\\/(www\\.)?|ftp:\\/\\/(www\\.)?|www\\.){1}([0-9A-Za-z-\\.@:%_\+~#=]+)+((\\.[a-zA-Z]{2,3})+)(/(.)*)?(\\?(.)*)?");
    var params = {
        query : {
            ed_user_id: idOwner,
            ticket_id: req.params.ticketId
        },
        select: '_id user_id attachments content add_time',
        populate: ({
            include: 'user_id',
            fields: 'name _id'
        }),
        sort_order: 1,
        limit: 999999
    };
    Utils.findByQuery(TicketComment, params).exec((err, result) =>{
        if(err){
            return next(err);
        }
        result.forEach((item) =>{
            var data = {
                add_time: moment(item.add_time).utcOffset(time_zone).format(format),
                user_name: item.user_id.name,
                message: sanitizeHtml(item.content, {
                    allowedTags: [],
                    allowedAttributes: []
                }),
                attachments: []
            };
            if(is_attachments){
                item.attachments.forEach(attachment =>{
                    if(regex.test(attachment)){
                        data.attachments.push(attachment)
                    } else {
                        data.attachments.push(`${config.assets_path}${idOwner}/${attachment}`)
                    }
                });
            }
            content.push(data);
        });
        var data = {
            contents: content
        }
        
        var options = {
            template : `modules/ticket/templates/export-ticket-transcript.html`,
            from : config.mailer.from,
            to : to_email,
            subject : `[Transcript - ${moment(req.ticket.add_time).utcOffset(time_zone).format(format)}] ${req.ticket.subject}`,
            messageId: `izi.${+moment.utc()}-notify@izihelp.com`
        };
        sendmail(data, options);
        res.json({is_success: true});
    });
}

exports.getChannelByTicket = (req, res, next) =>{
    var idOwner = Utils.getParentUserId(req.user),
        ticket_id = mongoose.Types.ObjectId.isValid(req.query.ticket_id) ? req.query.ticket_id : null,
        requester_id = (req.query.requester_id && req.query.requester_id != 'undefined') ? req.query.requester_id : null,
        provider = req.query.provider,
        groups_user = req.query.groups_user,
        ticket_setting_groups = req.query.ticket_setting_groups,
        array_group_user = groups_user.split(","),
        array_ticket_setting_groups = ticket_setting_groups.length > 0 ? ticket_setting_groups.split(",") : [],
        page_id = req.query.page_id,
        t = req.user.language || "en",
        data = [
            getLastTicketComment(idOwner, ticket_id),
            getRequesterContact(idOwner, requester_id)
        ];
    if(provider && (provider === enumsTicket.Provider.fbComment || provider === enumsTicket.Provider.fbMessage)){
        data.push(checkExistsFacebookPage(idOwner, page_id));
    }
    // get ticket comment and all contact of user
    Promise.all(data).then(results =>{
        var res_data = {
                reply_as: [],
                chooser_channel: ''
            },
            ticket_comment_last = results[0],
            is_page_active = results[2] ? results[2] : false;
        //pre data reply_as and channel last comment
        Promise.all([getChooserChannel(ticket_comment_last),
                    getReplyBy(provider, page_id, results[1], is_page_active, t)]).then(result =>{
            res_data.chooser_channel = result[0];
            res_data.reply_as = result[1];
            if(req.user.roles[0] !== enumsCore.UserRoles.owner){
                if(array_ticket_setting_groups.length > 0){
                    let is_in_groups = false;
                    // filter check user in groups
                    array_group_user.filter(item =>{
                        if(array_ticket_setting_groups.indexOf(item) != -1){
                            is_in_groups = true;
                            return;
                        }
                    });
                    // if user exists setting groups is comment public or user not exists is comment internal
                    if(!is_in_groups){
                        res_data.chooser_channel = undefined;
                        res_data.reply_as = [];
                        res_data.reply_as.push(result[1][0]);
                    }
                }
            }
            return res.json(res_data);
        }).catch(error =>{
            console.error(error);
            return next(error);
        });
    }).catch(errors =>{
        console.error(errors);
        return next(errors);;
    });
}

// get ticket comment last
var getLastTicketComment = (idOwner, ticket_id) =>{
    return new Promise((resolve, reject) =>{
        var params = {
            query : {
                ed_user_id: idOwner,
                ticket_id: ticket_id
            },
            select: '_id user_id attachments content add_time provider provider_data',
            sort_order: -1
        };
        Utils.findByQuery(TicketComment, params).exec((err, result) =>{
            if(err){
                return resolve(err);
            }
            if(!result || result === undefined){
                return resolve();
            }
            return resolve(result[0]);
        })
    });
}

// get all contact of requester
var getRequesterContact = (idOwner, requester_id) =>{
    return new Promise((resolve, reject) =>{
        var type = [enumsContacts.UserContactType.phone, enumsContacts.UserContactType.email];
        UserContactController.getListInternal(idOwner, requester_id, 'phone-email', (err, result) =>{
            if(err){
                return resolve(err);
            }
            return resolve(result);
        });
    })
}

var checkExistsFacebookPage = (idOwner, page_id) =>{
    return new Promise((resolve, reject) =>{
        var data = {
            ed_user_id: idOwner,
            page_id: page_id,
            is_active: true
        }
        userFbPageController.getAccessToken(data, (err, result) =>{
            if(err){
                return resolve(false);
            }
            if(!result){
                return resolve(false);
            }
            return resolve(true);
        });
    })
};

var getChooserChannel = (data) =>{
    return new Promise((resolve, reject) =>{
        if(!data || data.provider == enumsTicket.Provider.web){
            return resolve(undefined);
        } else if(data.provider == enumsTicket.Provider.fbComment || data.provider == enumsTicket.Provider.fbMessage){
            return resolve(data.provider_data.page_id);
        } else if(data.provider == enumsTicket.Provider.gmail || data.provider == enumsTicket.Provider.iziMail){
            return resolve(data.provider_data.to_email ? data.provider_data.to_email : data.provider_data.from_email);
        } else if(data.provider == enumsTicket.Provider.sms){
            return resolve(data.provider_data.phone_no);
        } else if (data.provider == enumsTicket.Provider.zaloMessage){
            return resolve(data.provider_data.oaid);
        } else if(data.provider == enumsTicket.Provider.voip){
            if(data.provider_data.call_type == enumsVoip.VoipType.incoming_call || data.provider_data.call_type == enumsVoip.VoipType.incoming_missed_call){
                return resolve(`izi-voip-${data.provider_data.from}`);
            } else {
                return resolve(`izi-voip-${data.provider_data.to}`);
            }
        } else {
            return resolve('IZIComment');
        }
    });
}

var getReplyBy = (provider, page_id, data, is_page_active, t) =>{
    return new Promise((resolve, reject) =>{
        let reply_as = [];
        reply_as.push({
            id : undefined,
            text : `${translation[t].internal_note}`,
            provider : undefined,
            no_url : true
        });
        if (provider && (provider === enumsTicket.Provider.fbComment || provider === enumsTicket.Provider.fbMessage) && is_page_active) {
            reply_as.push({
                id : page_id,
                text : page_id,
                provider : provider
            });
        } else if (provider && provider === enumsTicket.Provider.iziComment) {
            reply_as.push({
                id : 'IZIComment',
                text : `IZIComment`,
                provider : enumsTicket.Provider.iziComment,
                no_url : true
            });
        } else if (provider && provider === enumsTicket.Provider.zaloMessage){
            reply_as.push({
                id: page_id,
                text: page_id,
                provider: provider
            });
        }
        if(data === undefined){
            return resolve(reply_as);
        } else {
            (data.email || []).forEach(email =>{
                reply_as.push({
                    id: email.value,
                    text : `${translation[t].email_to}: ${email.value}`,
                    provider : enumsTicket.Provider.iziMail,
                    no_url : true
                });
            });
            (data.phone || []).forEach(phone => {
                reply_as.push({
                    id : phone.value,
                    text : `${translation[t].sms_to}: ${phone.value}`,
                    provider : enumsTicket.Provider.sms,
                    no_url : true
                });
            });
            (data.phone || []).forEach(phone => {
                reply_as.push({
                    id : `izi-voip-${phone.value}`,
                    text : `${translation[t].call_to}: ${phone.value}`,
                    provider : enumsTicket.Provider.voip,
                    no_url : true
                });
            });
            return resolve(reply_as);
        }
    });
}
