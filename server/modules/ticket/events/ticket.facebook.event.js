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
    path = require('path'),
    config = require(path.resolve('./config/config')),
    Fb = require('../../core/resources/fb'),
    FbMessenger = require('../../core/resources/fb.send_messenger'),
    utils = require('../../core/resources/utils'),
    enums = require('../resources/enums'),
    userFbAccountController = require('../../user.setting/controllers/user.fb.account.controller'),
    userFbPageController = require('../../user.setting/controllers/user.fb.page.controller'),
    socketIO = require(path.resolve('./config/lib/socket.io'));

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========
var preData = (data, user) =>{
    return new Promise ((resolve, reject) =>{
        var idOwner = utils.getParentUserId(user);
        var message = data.comment.content;
        if(data.comment.attachments && data.comment.attachments.length > 0){
            if(data.comment.provider == enums.Provider.fbComment){
                return resolve({
                    message: message,
                    attachment_url: `${config.assets_path}${idOwner}/${data.comment.attachments[0]}`
                })
            } else {
                var attachments = [];
                _.forEach(data.comment.attachments, (item) =>{
                    attachments.push(`${config.assets_path}${idOwner}/${item}`);
                });
                return resolve({
                    message: message,
                    attachments: attachments
                });
            }
        } else {
            if(data.comment.provider == enums.Provider.fbComment){
                return resolve({
                    message: message
                })
            } else {
                return resolve({
                    message: message
                });
            }
        }
    });
};

var getAccessToken = (data, user) =>{
    return new Promise ((resolve, reject) =>{
        if(data.comment.provider_data.sender_id){
            var fb_data = {
                ed_user_id: data.ed_user_id,
                fb_id: data.comment.provider_data.sender_id,
                is_active: true
            };
            userFbAccountController.getAccessToken(fb_data, (err, result) =>{
                if(err){
                    console.error(err, "Failed to get access token facebook user");
                    return resolve(err);
                }
                return resolve(result);
            });
        } else {
            var fb_data = {
                ed_user_id: data.ed_user_id,
                is_active: true,
                page_id: data.provider_data.page_id
            };
            userFbPageController.getAccessToken(fb_data, (err, result) =>{
                if(err){
                    console.error(err, "Failed to get access token facebook page");
                    return resolve(err);
                }
                return resolve(result);
            });
        }
    });
};

var sendConversation = (data, res_data, access_token, emitter, is_retry) =>{
    Fb.replyMessageFacebook(res_data, access_token, (err, res) =>{
        if(err || !res){
            if(data.comment){
                data.comment.provider_data.is_error = true;
            }
            if(utils.isEmpty(err)){
                err = {};
            } else {
                err = JSON.parse(err.message || '{}').type;
            }
            socketIO.emit('/core', data.ed_user_id, {
                topic: 'izi-core-client-facebook-comment',
                payload: {
                    fb_data: {
                        ed_user_id: data.ed_user_id,
                        ticket: data,
                        comment: data.comment,
                        error: {single : err}
                    }
                }
            });
            emitter.emit('evt.ticket.facebook.update_is_error', data);
            console.error(err, "Failed message to facebook");
            return;
        } else {
            if(data.comment._id){
                let res_data = {
                    ed_user_id: data.ed_user_id,
                    comment_id: data.comment._id,
                    message_id: res.id
                };
                emitter.emit('evt.ticket.comment.update', res_data, enums.Provider.fbMessage);
                data.comment.provider_data.is_error = false;
                data.comment.provider_data.message_id = res.id;
                emitter.emit('evt.facebook.addTicketConversationFacebook', data.comment);
                if(is_retry){
                    socketIO.emit('/core', data.ed_user_id, {
                        topic: 'izi-core-client-facebook-comment',
                        payload: {
                            fb_data: {
                                ed_user_id: data.ed_user_id,
                                ticket: data,
                                comment: data.comment,
                                error: {}
                            }
                        }
                    });
                }
                return;
            }
            return;
        }
    });
};

var sendMessenger = (data, res_data, access_token, emitter, is_retry) =>{
    FbMessenger.webhook(res_data, access_token, (err, result) =>{
        if(err || !result){
            if(data.comment){
                data.comment.provider_data.is_error = true;
            }
            if(utils.isEmpty(err)){
                err = {};
            } else {
                err = (err || {}).message;
            }
            socketIO.emit('/core', data.ed_user_id, {
                topic: 'izi-core-client-facebook-comment',
                payload: {
                    fb_data: {
                        ed_user_id: data.ed_user_id,
                        ticket: data,
                        comment: data.comment,
                        error: {single : err}
                    }
                }
            });
            emitter.emit('evt.ticket.facebook.update_is_error', data);
            //console.error(err, "Failed message to facebook");
            return;
        } else {
            if(data.comment._id){
                let res_data = {
                    ed_user_id: data.ed_user_id,
                    comment_id: data.comment._id,
                    message_id: result
                };
                emitter.emit('evt.ticket.comment.update', res_data, enums.Provider.fbMessage);
                data.comment.provider_data.is_error = false;
                data.comment.provider_data.message_id = result;
                emitter.emit('evt.facebook.addTicketConversationFacebook', data.comment);
                if(is_retry){
                    socketIO.emit('/core', data.ed_user_id, {
                        topic: 'izi-core-client-facebook-comment',
                        payload: {
                            fb_data: {
                                ed_user_id: data.ed_user_id,
                                ticket: data,
                                comment: data.comment,
                                error: {}
                            }
                        }
                    });
                }
                return;
            }
            return;
        }
    });
}
//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========
module.exports = (emitter) =>{
    emitter.on('evt.ticket.fb.comment', (data, user, is_retry, callback) =>{
        Promise.all([preData(data, user), getAccessToken(data, user)]).then((result) =>{
            let message = result[0];
            let access_token = (result[1] || {}).access_token;
            let res_data = {
                page_id: data.provider_data.page_id,
                post_id: data.provider_data.post_id,
                comment_id: data.comment.provider_data.comment_id ? data.comment.provider_data.comment_id : data.provider_data.comment_id,
                sender_id: data.comment.provider_data.sender_id,
                message: message.message,
                attachment_url:message.attachment_url
            };
            if(!access_token){
                console.error('No access token found!', JSON.stringify(res_data));
                if(data.comment){
                    data.comment.provider_data.is_error = true;
                    emitter.emit('evt.ticket.facebook.update_is_error', data);
                }
                if(callback){
                    return callback('No access token found!', data.comment);
                } else {
                    socketIO.emit('/core', data.ed_user_id, {
                        topic: 'izi-core-client-facebook-comment',
                        payload: {
                            fb_data: {
                                ed_user_id: data.ed_user_id,
                                ticket: data,
                                comment: data.comment,
                                error: {single : new TypeError('No access token found!')}
                            }
                        }
                    });
                    return;
                }
            }
            Fb.replyCommentFacebook(res_data, access_token, (err, res) =>{
                if(err || !res){
                    if(data.comment){
                        data.comment.provider_data.is_error = true;
                    }
                    if(utils.isEmpty(err)){
                        err = {};
                    } else {
                        err = JSON.parse(err.message || '{}').message;
                    }
                    emitter.emit('evt.ticket.facebook.update_is_error', data);
                    console.error(`${err} => ${JSON.stringify(res_data)}`,`Failed comment to facebook => ${JSON.stringify(res_data)}`);
                    if(callback){
                        return callback(err, null);
                    } else {
                        socketIO.emit('/core', data.ed_user_id, {
                            topic: 'izi-core-client-facebook-comment',
                            payload: {
                                fb_data: {
                                    ed_user_id: data.ed_user_id,
                                    ticket: data,
                                    comment: data.comment,
                                    error: {single : err}
                                }
                            }
                        });
                        return;
                    }
                } else {
                    let res_data = {
                        ed_user_id: data.ed_user_id,
                        comment_id: data.comment._id,
                        fb_comment_id: res.comment_id
                    };
                    emitter.emit('evt.ticket.comment.update', res_data, enums.Provider.fbComment);
                    data.comment.provider_data.is_error = false;
                    data.comment.provider_data.comment_id = res.comment_id;
                    emitter.emit('evt.facebook.addTicketCommentFacebook', data.comment);
                    if(callback){
                        return callback(null, data.comment);
                    } else {
                        if(is_retry){
                            socketIO.emit('/core', data.ed_user_id, {
                                topic: 'izi-core-client-facebook-comment',
                                payload: {
                                    fb_data: {
                                        ed_user_id: data.ed_user_id,
                                        ticket: data,
                                        comment: data.comment,
                                        error: {}
                                    }
                                }
                            });
                        }
                        return;
                    }
                }
            });
        }).catch((err) =>{
            console.error(err, "Failed comment to facebook");
            if(callback){
                return callback(err);
            } else {
                return;
            }
        });
    });
    emitter.on('evt.ticket.fb.message', (data, user, is_retry) =>{
        Promise.all([preData(data, user), getAccessToken(data, user)]).then((result) =>{
            let message = result[0];
            let access_token = (result[1] || {}).access_token;
            let res_data = {
                page_id: data.provider_data.page_id,
                thread_id: data.provider_data.thread_id,
                message: message.message,
                attachments:message.attachments
            };
            if(!access_token){
                console.error('No access token found!', JSON.stringify(res_data));
                return;
            }
            var type_send = res_data.thread_id.split('.');
            if(type_send.length === 2){
                sendConversation(data, res_data, access_token, emitter, is_retry);
            } else {
                sendMessenger(data, res_data, access_token, emitter, is_retry);
            }
        }).catch((err) =>{
            console.error(err, "Failed message to facebook");
            return;
        });
    });
};
