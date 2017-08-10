'use strict';

var path = require('path'),
    ticketCommentController = require('../../ticket/controllers/ticket.comment.controller'),
    fbController = require('../../facebook/controllers/fb.controller'),
    channelComment = require('../../izi.channel/controllers/comment.controller'),
    channelChat = require('../../izi.channel/controllers/chat.controller'),
    channelZalo = require('../../zalo/controllers/zalo.msg.controller'),
    config = require(path.resolve('./config/config'));

// Create the chat configuration
module.exports = function(message, callback){

    switch(message.topic){
        case 'izicomment-update-comment-provider': {
            let data = {
                comment_id: message.payload.ticket_comment_id,
                provider_data: message.payload.provider_data,
                ed_user_id: message.payload.ed_user_id
            }
            ticketCommentController.update(data, message.payload.provider);
            return callback();
            break;
        }
        /*case 'izi-reset-fb-ticket-ids': {
            let data = message.payload;
            fbController.resetFacebookTicketId(data);
            return callback();
            break;
        }*/
        //CHANNEL COMMENT
        case 'izicomment-request-userbranding' : {
            channelComment.syncUserBranding(message.payload);
            return callback();
        }
        case 'izicomment-request-usersetting' : {
            channelComment.syncUserSetting(message.payload);
            return callback();
        }
        case 'izicomment-request-userlocal' : {
            channelComment.syncUserLocal(message.payload);
            return callback();
        }
        case 'izicomment-request-users' : {
            channelComment.syncUsers(message.payload);
            return callback();
        }
        case 'izicomment-request-contacts' : {
            channelComment.syncContacts(message.payload);
            return callback();
        }
        //CHANNEL CHAT
        case 'izichat-request-userbranding' : {
            channelChat.syncUserBranding(message.payload);
            return callback();
        }
        case 'izichat-request-usersetting' : {
            channelChat.syncUserSetting(message.payload);
            return callback();
        }
        case 'izichat-request-userlocal' : {
            channelChat.syncUserLocal(message.payload);
            return callback();
        }
        case 'izichat-request-usercalendar' : {
            channelChat.syncUserCalendar(message.payload);
            return callback();
        }
        case 'izichat-request-groups' : {
            channelChat.syncGroups(message.payload);
            return callback();
        }
        case 'izichat-request-groupusers' : {
            channelChat.syncGroupUsers(message.payload);
            return callback();
        }
        case 'izichat-request-users' : {
            channelChat.syncUsers(message.payload);
            return callback();
        }
        case 'izichat-request-contacts' : {
            channelChat.syncContacts(message.payload);
            return callback();
        }
        case 'zalo-realtime-messages' : {
            channelZalo.realtimeMessages(message.payload);
            return callback();
        }
        default :{
            callback();
            console.log(message);
            return;
        }
    }
};
