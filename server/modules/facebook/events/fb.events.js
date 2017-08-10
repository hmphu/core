'use strict';
//
//  ticket send email event.js
//  handle user.setting events
//
//  Created by vupl on 2015-01-04.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    moment = require('moment'),
    path = require('path'),
    fs = require('fs-extra'),
    config = require(path.resolve('./config/config')),
    file = require('../../core/resources/file'),
    Fb = require('../../core/resources/fb'),
    FbMessenger = require('../../core/resources/fb.send_messenger'),
    utils = require('../../core/resources/utils'),
    redis = require(path.resolve('./config/lib/redis')),
    socketIO = require(path.resolve('./config/lib/socket.io')),
    enums = require('../resources/enums'),
    peopleGroup = require('../../people/controllers/people.group.user.controller'),
    ticketEnums = require('../../ticket/resources/enums'),
    ticketController = require('../../ticket/controllers/ticket.controller'),
    userFbAccountController = require('../../user.setting/controllers/user.fb.account.controller'),
    userFbPageController = require('../../user.setting/controllers/user.fb.page.controller'),
    FbPage = mongoose.model('UserFbPage'),
    FbAccount = mongoose.model('UserFbAccount'),
    providers = require('../providers/index.provider'),
    providerTicket = require('../../ticket/providers/index.provider'),
    fbController = require('../controllers/fb.controller'),
    fbModel = mongoose.model('Fb'),
    Ticket = mongoose.model('Ticket'),
    TicketComment = mongoose.model('TicketComment'),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq'));
//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========

var preData = (data, user) =>{
    return new Promise ((resolve, reject) =>{
        var idOwner = utils.getParentUserId(user);
        var apiUrl = utils.getFullUrl(user);
        var message = data.content;
        if(data.attachments && data.attachments.length > 0){
            let ownerPath = `${config.assets_path}${idOwner}`;
            if(data.provider == enums.Provider.comment){
                return resolve({
                    message: message,
                    attachments_url: _.isString(data.attachments[0])? data.attachments[0]: `${ownerPath}/${data.attachments[0].filename}`
                })
            } else {
                var attachments = [];
                for(var i = 0; i < data.attachments.length; i++){
                    let file = _.isString(data.attachments[i])? data.attachments[i]:`${ownerPath}/${data.attachments[i].filename}`;
                    attachments.push(file);
                }
                return resolve({
                    message: message,
                    attachments: attachments
                });
            }

        } else {
            if(data.provider == enums.Provider.comment){
                return resolve({message: message})
            } else {
                return resolve({message: message});
            }
        }
    });
};

var getAccessToken = (data) =>{
    return new Promise ((resolve, reject) =>{
        if(data.sender_id){
            var fb_data = {
                ed_user_id: data.ed_user_id,
                fb_id: data.sender_id,
                is_active: true
            };
            userFbAccountController.getAccessToken(fb_data, (err, result) =>{
                if(err){
                    console.error(err, "Failed to get access token facebook user");
                    return reject(err);
                }

                return resolve(result);
            });
        } else {
            var fb_data = {
                ed_user_id: data.ed_user_id,
                is_active: true,
                page_id: data.page_id
            };
            userFbPageController.getAccessToken(fb_data, (err, result) =>{
                if(err){
                    console.error(err, "Failed to get access token facebook page");
                    return reject(err);
                }

                return resolve(result);
            });
        }
    });
};

var getDetailsFacebookPage = (data) =>{
    return new Promise((resolve, reject) =>{
        let fb_data = {
            ed_user_id: data.ed_user_id,
            is_active: true,
            page_id: data.page_id
        };
        userFbPageController.getAccessToken(fb_data, (err, result) =>{
            if(err){
                console.error(err, "Failed to get details facebook page");
                return reject(err);
            }
            if(!result){
                return reject();
            }
            return resolve(result);
        });
    });
};

var sendConversation = (data, info_page, res_data, access_token, next) =>{
    Fb.replyMessageFacebook(res_data, access_token, (err, res) =>{
        res = res || {};
        res.fb_detail = {
            id: data.sender_id ? info_page.fb_id : info_page.page_id,
            name: info_page.name
        }
        if(err || !res){
            console.error(err, "Failed message to facebook");
//                    return next(new TypeError("Failed message to facebook"));
            return next(new TypeError("facebook.send_message_failured"), res);
        }

        return next(null, res);
    });
};

var sendMessenger = (data, info_page, res_data, access_token, next) =>{
    FbMessenger.webhook(res_data, access_token, (err, res) =>{
        var response = {
            id: res
        }
        response.fb_detail = {
            id: data.sender_id ? info_page.fb_id : info_page.page_id,
            name: info_page.name
        }
        if(err || !res){
//                    return next(new TypeError("Failed message to facebook"));
            return next(err || new TypeError("facebook.send_message_failured"), response);
        }

        return next(null, response);
    });
};

// find ticket by thread_id
var getTicketByThreadId = (data, next) =>{
    ticketModel.findOne({
        ed_user_id: data.ed_user_id,
        is_delete: false,
        status: { $ne: ticketEnums.TicketStatus.Closed },
        provider: ticketEnums.Provider.fbMessage,
        'provider_data.thread_id': data.provider_data.thread_id
    }, (err, ticket) =>{
        if(err){
            console.error(err, `fb core: getTicketByThreadId ==> ${JSON.stringify(data)}`);
        }
        return next(ticket);
    });
};


var getTimestamp = (thread_id) =>{
    if(!thread_id ) { return +moment.utc();}
    if(!isNaN(thread_id)){ return thread_id;}
    var match = thread_id.match(/((mid|m_mid)\.)([0-9]*)(.*?)/gm);
    var str = "";
    if(match.length == 0){
        return thread_id;
    }

    str = match[0];
    return str.replace(/(mid|m_mid)\./, '');
}

var moveAttachment = (data)=> {
    if(data.attachments && data.attachments.length > 0){
        file.moveFile(data.ed_user_id, data.attachments);
        var path = `${config.upload.path}${data.ed_user_id}/${data.attachments[0].filename}`
        while(!fs.existsSync(path)){
            break;
        }
    }
}

var createComment = (data)=> {
    var attachments = []
    if(data.attachments){
        attachments = data.attachments.map(file=>file.filename);
    }
    var provider_data = {};
    if(data.ticket.provider == ticketEnums.Provider.fbMessage){
        provider_data = providers.setConversation({
            attachments: data.attachments,
            message_id: data.conversation_id,
            thread_id: data.ticket.provider_data.thread_id,
            thread_id_v1: data.ticket.provider_data.thread_id_v1,
            sender_id: data.fb_detail.id,//fb user id
            sender_name: data.fb_detail.name, //fb user name
            users: data.users,
            page_id: data.page_id,
            is_error: data.is_error,
            is_echo: true
        });
    }else{
        provider_data = providers.setComment({
            attachments: data.attachments,
            page_id: data.page_id,
            post_id: data.post_id,
            sender_id: data.fb_detail.id,//fb user id
            sender_name: data.fb_detail.name, //fb user name
            comment_id: data.comment_id,
            parent_id: data.parent_id,
            comment_parent_id: data.comment_parent_id,
            is_like : data.is_like || false,
            is_hidden : data.is_hidden || false,
            is_user_post: data.is_user_post || false,
            is_error: data.is_error || false,
            is_reply: data.is_error || false,
            is_user_post: data.is_user_post,
            is_echo : true
        });
    }
    var comment = new TicketComment({
        ed_user_id: data.ed_user_id,
        ticket_id: data.ticket._id,
        comment_id: data.comment_id,
        content: data.content || "---",
        attachments: data.attachments,
        provider_data: provider_data,
        user_id: data.user_id,
        user_name: data.user_name,
        provider: data.ticket.provider,
        is_requester: false,
        is_first: data.is_first,
        is_internal: false,
        is_public: true,
        is_child: data.is_child || false,
        add_time: data.add_time || +moment.utc()
    }).toJSON();
    comment.isNew = true;
    return comment;
};

var addTicket = (data, user, next)=>{
    var ticket = new Ticket({
        ed_user_id: data.ed_user_id,
        ticket_id: data.ticket._id,
        comment_id: data.comment_id,
        content: data.content || "---",
        provider_data: providers.setComment({
            page_id: data.page_id,
            post_id: data.post_id,
            sender_id: data.fb_detail.id,//fb user id
            sender_name: data.fb_detail.name, //fb user name
            comment_id: data.comment_id,
            parent_id: data.parent_id,
            is_user_post: data.is_user_post,
            is_error: data.is_error || false,
            is_echo: true
        }),
        user_id: user._id,
        user_name: user.name,
        provider: ticketEnums.Provider.fbComment,
        is_requester: false,
        status : ticketEnums.TicketStatus.Open,
        subject: data.content,
        add_time: +moment.utc()
    }).toJSON();

    ticket.isNew = true;

    var comment = createComment(Object.assign({}, data, {ticket: ticket, is_first: true, user_id: user._id}));

    peopleGroup.findGroupUser(data.ed_user_id, user._id, (err, result) => {
        if (err) { return next(err); }
        ticket.agent_id = user._id;
        ticket.group_id = result.group_id;
        rbSender(config.rabbit.sender.exchange.trigger, {topic: 'izi-trigger-ticket-flow', payload:  {
            ticket: ticket,
            comments: [comment],
            submitter_id: user._id
        }});
        return next(null, Object.assign({}, ticket, { last_comment: comment }));
    });
};

var addCommentToTicket = (comment, user, data, next)=> {
    var idOwner = utils.getParentUserId(user);
    var query = { ed_user_id: idOwner, _id: data.ticket._id };

    Ticket.findOne(query, (err, old_ticket) => {
        if (err) { return next(err); }
        if (!old_ticket) { return next("zalo.ticket_not_found"); }

        var ticket = old_ticket.toJSON();
        var status = old_ticket.status;
        var now = +moment.utc();

        if (old_ticket.status == ticketEnums.TicketStatus.New) {
            status = ticketEnums.TicketStatus.Open;
        }

        if (data.update_ticket_status !== undefined) {
            status = data.update_ticket_status;
        }

        if (old_ticket.status != status) {
            ticket.status_date = now;
            if (status == ticketEnums.TicketStatus.Solved) {
                ticket.solved_date = now;
            }
        }
        ticket.__v = undefined;
        ticket.stats = undefined;
        ticket.status = status;
        if (status != ticketEnums.TicketStatus.Solved || ticket.agent_id || old_ticket.status == ticketEnums.TicketStatus.Solved) {
            rbSender(config.rabbit.sender.exchange.trigger, {topic: 'izi-trigger-ticket-flow', payload:  {
                ticket: ticket,
                comments: [comment],
                submitter_id: user._id
            }});
            return next(null, Object.assign({}, ticket, { comment: comment }));
        }
        peopleGroup.findGroupUser(idOwner, user._id, (err, result) => {
            if (err) { return next(err); }
            ticket.agent_id = user._id;
            ticket.group_id = result.group_id;
            rbSender(config.rabbit.sender.exchange.trigger, {topic: 'izi-trigger-ticket-flow', payload:  {
                ticket: ticket,
                comments: [comment],
                submitter_id: user._id
            }});
            return next(null, Object.assign({}, ticket, { comment: comment }));
        });
    });
}
//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========
module.exports = (emitter) =>{
    emitter.on('evt.facebook.sendConversation', (data, user, next) =>{
        Promise.all([preData(data, user), getAccessToken(data)]).then(result =>{
            if(!result[1]){
                return next(null, null);
            }
            let message = result[0];
            let sender_info = result[1];
            let access_token = sender_info.access_token;
            let res_data = {
                page_id: data.page_id,
                thread_id: data.thread_id,
                message: message.message,
                attachments: message.attachments
            };
            moveAttachment(data);
            if(data.thread_id){
                 sendMessenger(data, sender_info, res_data, access_token, (err, result)=>{
                    if(!err){
                        return next(err, result);
                    }

                    console.log("Send conversation facebook error", JSON.stringify(err));
                    res_data.thread_id = data.thread_id_v1;
                    sendConversation(data, sender_info, res_data, access_token, next);
                });
            } else {
                res_data.thread_id = data.thread_id_v1;
               sendConversation(data, sender_info, res_data, access_token, next);
            }
        }).catch(error =>{
            console.error("Failed send message to facebook", JSON.stringify(error), true);
            return next(new TypeError("facebook.send_message_failured"), null);
        });
    });

    emitter.on('evt.facebook.sendComment', (data, user, next) =>{
        Promise.all([preData(data, user), getAccessToken(data)]).then(result =>{
            if(!result[1]){
                return next(null, null);
            }
            let message = result[0],
                access_token = result[1].access_token,
                res_data = {
                    page_id: data.page_id,
                    post_id: data.post_id,
                    message: message.message,
                    attachment_url: message.attachments_url
                };

            moveAttachment(data);// move file
            Fb.replyCommentFacebook(res_data, access_token, (err, res) =>{
                res = res || {};
                res.fb_detail = {
                    id: data.sender_id ? result[1].fb_id : result[1].page_id,
                    name: result[1].name
                };

                if(err || !res){
                    return next(err || new TypeError("facebook.send_comment_failured"), data);
                }
                return next(null, res);
            });
        }).catch(error => {
            console.error(error, "Failed comment to facebook");
            return next(new TypeError("facebook.send_comment_failured"), null);
        });
    });

    emitter.on('evt.facebook.sendRepliesComment', (data, user, next) =>{
        Promise.all([preData(data, user), getAccessToken(data)]).then(result =>{
            if(!result[1]){
                return next(null, null);
            }

            let message = result[0],
                access_token = result[1].access_token,
                res_data = {
                    page_id: data.page_id,
                    post_id: data.post_id,
                    comment_id: data.comment_id,
                    message: message.message,
                    attachment_url: message.attachments_url
                };

            moveAttachment(data);// move file

            Fb.replyCommentFacebook(res_data, access_token, (err, res) =>{
                res = res || {};

                res.fb_detail = {
                    id: data.sender_id ? result[1].fb_id : result[1].page_id,
                    name: result[1].name
                };
                if(err || !res){
                    return next(err || new TypeError("facebook.send_reply_failured"), res);
                }

                return next(null, res);
            });
        }).catch(error =>{
            console.error(error, "Failed send reply comment to facebook");
            return next(new TypeError("facebook.send_reply_failured"), null);
        });
    });

    emitter.on('evt.facebook.addCommentTicket', (data, user, next) =>{
        getAccessToken(data).then(result =>{
            let page_setting = result;
            data.fb_detail = data.fb_detail || {
                id: data.sender_id ? result.fb_id : result.page_id,
                    name: result.name
            };
            
            if(!data.ticket.provider_data.is_user_post){
                addTicket(data, user, (err, ticket)=>{
                    next(null, ticket);
                });
            }else{
                data.is_first = false;
                data.user_id = user._id;
                data.user_name = user.user_name;

                if(data.auto_solve_ticket){ data.update_ticket_status = ticketEnums.TicketStatus.Solved; }
                var comment = createComment(data);
                addCommentToTicket(comment, user, data, (err, ticket) => {
                    if (err) { return next(err); }
                    next(null, comment);
                });
            }
        }).catch(error =>{
            console.error(error, "Failed to add fb", true);
            return;
        });
    });

    emitter.on('evt.facebook.addRepliesCommentTicket', (data, user, next) =>{
        getDetailsFacebookPage(data).then(result =>{
            data.is_first = false;
            data.is_child = data.is_user_post;
            data.user_id = user._id;
            data.user_name = user.user_name;

            if(data.auto_solve_ticket){ data.update_ticket_status = ticketEnums.TicketStatus.Solved; }
            let page_setting = result;
            let fb_detail = data.fb_detail || {};
            var comment = createComment(data);

            addCommentToTicket(comment, user, data, (err, ticket) => {
                if (err) { return next(err); }
                next(null, comment);
            });
        }).catch(error =>{
            console.error(error, "Failed to add fb", true);
            return;
        });
    });
    
    emitter.on('evt.facebook.addConversationTicket', (data, user, next) =>{
        data.is_first = false;
        data.user_id = user._id;
        data.user_name = user.user_name;
        data.add_time= data.conversation_id? getTimestamp(data.conversation_id): +moment.utc();
        if(data.auto_solve_ticket){ data.update_ticket_status = ticketEnums.TicketStatus.Solved}

        let fb_detail = data.fb_detail || {};
        let comment = createComment(data);

        addCommentToTicket(comment, user, data, (err, ticket) => {
            if (err) { return next(err); }
            next(null, comment);
        });
    });
    
    emitter.on('evt.facebook.addTicketCommentFacebook', (data) =>{
        let fbData = {
            fb_id: data.provider_data.comment_id,
            ed_user_id: data.ed_user_id,
            page_id: data.provider_data.page_id,
            message: data.content,
            sender: {
                id: data.provider_data.sender_id ? data.provider_data.sender_id : data.provider_data.page_id
            },
            provider: enums.Provider.comment,
            provider_data: {
                photos: data.attachments,
                post_id: data.provider_data.post_id,
                parent_id: data.provider_data.parent_id,
                is_reply: data.provider_data.is_reply || false
            },
            add_time: data.add_time,
            ticket_id: data.ticket_id,
            ticket_comment_id: data._id
        }
        if(fbData.page_id == fbData.sender.id){
            FbPage.findOne({ed_user_id: fbData.ed_user_id,page_id:fbData.page_id}).exec((err, page)=>{
                if(err || !page){
                  console.log(err || new TypeError('Cannot found facebook page'));
                }else{
                    fbData.sender.name = page.name;
                }
                fbController.add(fbData, (err, result_fb)=>{
                    if(err){
                        console.error(err, "fb core: add Ticket comment facebook data");
                        return;
                    }
                    return;
                });
            });
        }else{
            FbAccount.findOne({ed_user_id: data.ed_user_id,fb_id:fbData.sender.id}).exec((err, fbAccount)=>{
                if(err || !fbAccount){
                      console.log(err || new TypeError('Cannot found facebook account'));
                }else{
                      fbData.sender.name = fbAccount.name;
                }
                
                fbController.add(fbData, (err, result_fb)=>{
                    if(err){
                        console.error(err, "fb core: add Ticket comment facebook data");
                        return;
                    }
                    return;
                });
            });
        }
    });
    
    emitter.on('evt.facebook.addTicketConversationFacebook', (data) =>{
        let fbData = {
            fb_id: data.provider_data.message_id,
            ed_user_id: data.ed_user_id,
            page_id: data.provider_data.page_id,
            message: data.content,
            sender: {
                id: data.provider_data.sender_id ? data.provider_data.sender_id : data.provider_data.page_id
            },
            provider: enums.Provider.conversation,
            provider_data: {
                attachments: data.attachments,
                thread_id: data.provider_data.thread_id,
                message_id: data.provider_data.message_id
            },
            add_time: data.add_time,
            ticket_id: data.ticket_id,
            ticket_comment_id: data._id
        }
        if(fbData.page_id == fbData.sender.id){
            FbPage.findOne({ed_user_id: fbData.ed_user_id,page_id:fbData.page_id}).exec((err, page)=>{
                if(err || !page){
                  console.log(err || new TypeError('Cannot found facebook page'));
                }else{
                    fbData.sender.name = page.name;
                }
                fbController.add(fbData, (err, result_fb)=>{
                    if(err){
                        console.error(err, "fb core: add Ticket comment facebook data");
                        return;
                    }
                    return;
                });
            });
        }else{
            FbAccount.findOne({ed_user_id: data.ed_user_id,fb_id:fbData.sender.id}).exec((err, fbAccount)=>{
                if(err || !fbAccount){
                      console.log(err || new TypeError('Cannot found facebook account'));
                }else{
                      fbData.sender.name = fbAccount.name;
                }
                
                fbController.add(fbData, (err, result_fb)=>{
                    if(err){
                        console.error(err, "fb core: add Ticket comment facebook data");
                        return;
                    }
                    return;
                });
            });
        }
    });
    
    emitter.on('evt.facebook.likeComment', (data, user, next) =>{
        Promise.all([getAccessToken(data)]).then(result =>{
                if(!result[0]){
                    return next(null, null);
                }
                let access_token = result[0].access_token,
                req_data = {
                    page_id: data.page_id,
                    comment_id: data.comment_id,
                    method: data.is_like? 'POST' : 'DELETE'
                };
            Fb.likeFacebookComment(req_data, access_token, (err, res) =>{
                if(err || !res){
                    console.error(err, "Failed like comment to facebook");
//                    return next(new TypeError("Failed like comment to facebook"));
                    return next(err || new TypeError("facebook.like_failured"));
                }
                var update = {
                    ticket : {
                        _id: data.ticket._id,
                    },
                    submitter_id: user._id
                }
                if(data.is_ticket){
                    update.ticket.provider_data = Object.assign(data.ticket.provider_data, {is_like: data.is_like});
                }else{
                    update.comments = [{
                        _id: data.comment._id,
                        provider_data: Object.assign(data.comment.provider_data, {is_like: data.is_like})
                    }];
                }

                rbSender(config.rabbit.sender.exchange.trigger, {topic: 'izi-trigger-ticket-flow', payload:  update});
                return next(err, res);
            });
        }).catch(error => {
            console.error(error, "Failed comment to facebook");
            return next(new TypeError("facebook.like_failured"), null);
        });
    });
    
    emitter.on('evt.facebook.hideComment', (data, user, next) =>{
        Promise.all([getAccessToken(data)]).then(result =>{
                if(!result[0]){
                    return next(null, null);
                }
                let access_token = result[0].access_token,
                req_data = {
                    page_id: data.page_id,
                    comment_id: data.comment_id,
                    type: data.is_hidden
                };
            Fb.hideFacebookComment(req_data, access_token, (err, res) =>{
                if(err || !res){
                    console.error(err, "Failed hide comment to facebook");
//                    return next(new TypeError("Failed hide comment to facebook"));
                    return next(err || new TypeError("facebook.hide_failured"));
                }
                var editData = {
                    ed_user_id: data.ed_user_id,
                    _id: data._id,
                    update:{
                        provider_data:{
                            is_hidden: data.is_hidden
                        }
                    }
                };
                fbController.edit(editData, (err, res_edit)=>{
                    return next(err, res_edit);
                });
            });
        }).catch(error => {
            console.error(error, "Failed comment to facebook");
            return next(new TypeError("facebook.hide_failured"), null);
        });
    });

    emitter.on('evt.facebook.convertFacebookThreadToTicket', (data) =>{
        getTicketByThreadId(data, ticket =>{
            if(ticket){
                var sendData = data.toObject();
                sendData.ticket = ticket;
                rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-realtime-fb-create-ticket-comment', payload: {
                    data: sendData
                }});
                return;
            }
            redis.evalsha(config.redis.findAndUpdate, 1, [`fb_thread_id_${data.provider_data.thread_id}`], null, null, (err, isAvailable)=>{
                if(err){
                    console.error(err, `receivedMessage izi-realtime-fb-delayed-conversation-create-ticket: ${JSON.stringify(data)}`);
                }
                if(isAvailable){
                    rbSender(config.rabbit.sender.delayedExchange.batch, {topic: 'izi-realtime-fb-delayed-conversation-create-ticket', headers: {'x-delay': 5000}, payload: {
                        thread_id: data.provider_data.thread_id,
                        ed_user_id: data.ed_user_id
                    }});
                }
            });
            return;
        });
    });

    emitter.on('evt.facebook.solved', (data, user) =>{
        rbSender(config.rabbit.sender.exchange.trigger, {topic: 'izi-trigger-ticket-flow', payload:  {
            ticket: data,
            submitter_id: user._id
        }});
    });
};
