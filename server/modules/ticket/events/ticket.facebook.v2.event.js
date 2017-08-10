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
    path = require('path'),
    config = require(path.resolve('./config/config')),
    Fb = require('../../core/resources/fb'),
    FbMessenger = require('../../core/resources/fb.send_messenger'),
    userFbAccountController = require('../../user.setting/controllers/user.fb.account.controller'),
    userFbPageController = require('../../user.setting/controllers/user.fb.page.controller'),
    utils = require('../../core/resources/utils'),
    enums = require('../resources/enums'),
    socketIO = require(path.resolve('./config/lib/socket.io'));

var callback = (ticket, ticketComment, is_retry, err, handler) =>{
    if(!handler){
        if(err){
            console.error(err);
        }
        return;
    }
    if(err){
        return handler(err, ticketComment);
    }
    return handler(null, ticketComment);
};

var preData = (idOwner, ticketComment) =>{
    return new Promise ((resolve, reject) =>{
        var message = ticketComment.content;
        if(ticketComment.attachments && ticketComment.attachments.length > 0){
            if(ticketComment.provider == enums.Provider.fbComment){
                return resolve({
                    message: message,
                    attachment_url: `${config.assets_path}${idOwner}/${ticketComment.attachments[0]}`
                })
            } else {
                var attachments = [];
                _.forEach(ticketComment.attachments, (item) =>{
                    attachments.push(`${config.assets_path}${idOwner}/${item}`);
                });
                return resolve({
                    message: message,
                    attachments: attachments
                });
            }
        } else {
            if(ticketComment.provider == enums.Provider.fbComment){
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


var processAttachments = (comment)=>{
    // add file to provider_data
    var imageType = "png jpg jpeg gif svg";
    var photos = [];
    var video = [];
    (comment.attachments || []).forEach(file=>{
        if(file){
            var ext = file.split('.').pop();
            if(ext && imageType.indexOf(ext.toLowerCase()) != -1){
                photos.push(file);
            }else{
                video.push(file);
            }
        }

    });
    comment.provider_data.photos = photos;
    comment.provider_data.video = video;
};

var mappingSender = (ticketComment, facebookInfo) =>{
    ticketComment.provider_data.sender_id = facebookInfo.is_page ? facebookInfo.page_id : facebookInfo.fb_id;
    ticketComment.provider_data.sender_name = facebookInfo.name;
    ticketComment.provider_data.is_echo = true;
};

var getAccessToken = (idOwner, pageId, ticketComment) =>{
    return new Promise ((resolve, reject) =>{
        var fb_data = {
            ed_user_id: idOwner,
            is_active: true
        };
        if(ticketComment.provider_data.sender_id && ticketComment.provider_data.sender_id != pageId){
            fb_data.fb_id = ticketComment.provider_data.sender_id;
            userFbAccountController.getAccessToken(fb_data, (err, result) =>{
                if(err){
                    console.error(err, "Failed to get access token facebook user");
                    return resolve(err);
                }
                if(!result){
                    return resolve({});
                }
                result = result.toObject();
                result.is_page = false;
                return resolve(result);
            });
        } else {
            fb_data.page_id = pageId;
            userFbPageController.getAccessToken(fb_data, (err, result) =>{
                if(err){
                    console.error(err, "Failed to get access token facebook page");
                    return resolve(err);
                }
                if(!result){
                    return resolve({});
                }
                result = result.toObject();
                result.is_page = true;
                return resolve(result);
            });
        }
    });
};

var sendConversation = (ticket, ticketComment,facebookData, facebookInfo, accessToken, is_retry, next) =>{
    Fb.replyMessageFacebook(facebookData, accessToken, (err, res) =>{
        if(err || !res){
            if(ticketComment){
                ticketComment.provider_data.is_error = true;
                mappingSender(ticketComment, facebookInfo);
            }
            if(utils.isEmpty(err)){
                err = {};
            } else {
                err = JSON.parse(err.message || '{}').type;
            }
            console.error(err, "Failed message to facebook");
            return callback(ticket, ticketComment, is_retry, err, next);
        } else {
            ticketComment.provider_data.is_error = false;
            ticketComment.provider_data.message_id = res.id;
            mappingSender(ticketComment, facebookInfo);
            return callback(ticket, ticketComment, is_retry, null, next);
        }
    });
};

var sendMessenger = (ticket, ticketComment, facebookData, facebookInfo, accessToken, is_retry, next) =>{
    FbMessenger.webhook(facebookData, accessToken, (err, result) =>{
        if(err || !result){
            if(ticketComment){
                ticketComment.provider_data.is_error =true;
                mappingSender(ticketComment, facebookInfo);
            }
            if(utils.isEmpty(err)){
                err = {};
            } else {
                err = (err || {}).message;
            }
            console.error(err, "Failed message to facebook");
            return callback(ticket, ticketComment, is_retry, err, next);
        } else {
            ticketComment.provider_data.is_error = false;
            ticketComment.provider_data.message_id = result;
            mappingSender(ticketComment, facebookInfo);
            return callback(ticket, ticketComment, is_retry, null, next);
        }
    })
};

module.exports = (emitter) =>{
    emitter.on('evt.ticket.fb.comment.v2', (idOwner, ticket, ticketComment, is_retry, next) =>{
        Promise.all([preData(idOwner, ticketComment), getAccessToken(idOwner, ticket.provider_data.page_id, ticketComment)]).then(result =>{
            let message = result[0],
                accessToken = (result[1] || {}).access_token,
                facebookInfo = (result[1] || {}),
                facebookData = {
                    page_id: ticket.provider_data.page_id,
                    post_id: ticket.provider_data.post_id,
                    comment_id: ticketComment.provider_data.comment_id ? ticketComment.provider_data.comment_id : ticket.provider_data.comment_id,
                    sender_id: ticketComment.provider_data.sender_id,
                    message: message.message,
                    attachment_url:message.attachment_url
                };
            if(!accessToken){
                console.error('No access token found!', JSON.stringify(facebookData));
                if(ticketComment){
                    ticketComment.provider_data.is_error = true;
                }
                let err = 'No access token found!';
                return callback(ticket, ticketComment, is_retry, err, next);
            }
            Fb.replyCommentFacebook(facebookData, accessToken, (err, response) =>{
                if(err || !response){
                    if(ticketComment){
                        ticketComment.provider_data.is_error = true;
                    }
                    if(utils.isEmpty(err)){
                        err = {};
                    } else {
                        err = JSON.parse(err.message || '{}').message;
                    }
                    console.error(`${err} => ${JSON.stringify(facebookData)}`,`Failed comment to facebook => ${JSON.stringify(facebookData)}`);
                    return callback(ticket, ticketComment, is_retry, err, next);
                }
                ticketComment.comment_id = response.comment_id;
                ticketComment.provider_data.comment_id = response.comment_id;
                ticketComment.provider_data.is_error = false;
                mappingSender(ticketComment, facebookInfo);

                // process attachments file
                processAttachments(ticketComment);


                if(!ticket.provider_data.users){
                    ticket.provider_data.users = {};
                }
                ticket.provider_data.users[ticketComment.provider_data.sender_id] = {
                    sender_id: ticketComment.provider_data.sender_id,
                    sender_name: ticketComment.provider_data.sender_name,
                    is_requester: false,
                    is_owner: facebookInfo.is_page ? true : false,
                    group_id: ticketComment.group_id,
                    _id: facebookInfo.is_page ? facebookInfo.ed_user_id : facebookInfo.user_id
                }
                return callback(ticket, ticketComment, is_retry, null, next);
            });
        }).catch(error =>{
            console.error(error);
            if(ticketComment){
                ticketComment.provider_data.is_error = true;
            }
            return callback(ticket, ticketComment, is_retry, error, next);
        });
    });

    emitter.on('evt.ticket.fb.message.v2', (idOwner, ticket, ticketComment, is_retry, next) =>{
        Promise.all([preData(idOwner, ticketComment), getAccessToken(idOwner, ticket.provider_data.page_id, ticketComment)]).then(result =>{
            let message = result[0],
                accessToken = (result[1] || {}).access_token,
                facebookInfo = (result[1] || {}),
                facebookData = {
                    page_id: ticket.provider_data.page_id,
                    thread_id: ticket.provider_data.thread_id,
                    message: message.message,
                    attachments:message.attachments
                };
            if(!accessToken){
                console.error('No access token found!', JSON.stringify(facebookData));
                if(ticketComment){
                    ticketComment.provider_data.is_error = true;
                }
                let err = 'No access token found!';
                return callback(ticket, ticketComment, is_retry, err, next);
            }
            var type_send = ticket.provider_data.thread_id.split('.');

            // process attachments file
            processAttachments(ticketComment);

            if(ticket.provider_data.thread_id){
                 sendMessenger(ticket, ticketComment, facebookData, facebookInfo, accessToken, is_retry, (err, result)=>{
                    if(!err){
                        return next(err, result);
                    }

                    console.log("Send conversation facebook error", JSON.stringify(err));
                    facebookData.thread_id = ticket.provider_data.thread_id_v1;
                    sendConversation(ticket, ticketComment, facebookData, facebookInfo, accessToken, is_retry, next);
                });
            } else {
                facebookData.thread_id = ticket.provider_data.thread_id_v1;
                sendConversation(ticket, ticketComment, facebookData, facebookInfo, accessToken, is_retry, next);
            }
        }).catch(error =>{
            console.error(error);
            if(ticketComment){
                ticketComment.provider_data.is_error = true;
            }
            return callback(ticket, ticketComment, is_retry, error, next);
        })
    });
};
