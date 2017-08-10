'use strict'
//
//  utils.js
//  define sys utils
//
//  Created by vupl on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var _ = require('lodash'),
    path = require('path'),
    moment = require('moment'),
    config = require(path.resolve('./config/config')),
    dcController = require('../../dc/controllers/dc.controller'),
    userController = require('../../people/controllers/people.user.controller'),
    userContactController = require('../../people/controllers/people.user.contact.controller'),
    customSettingsController = require('../../custom.setting/controllers/custom.setting.controller'),
    enumContact = require('../../people/resources/enums.res'),
    enumTicket = require('../../ticket/resources/enums'),
    enumCs = require('../../custom.setting/resources/enums.res'),
    utils = require('../../core/resources/utils'),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq')),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter'));

/*
 * @author: vupl
 * get content mail
 */
exports.getContent = (str, idOwner, language, arrData, next) =>{
    // Get DyamicContent string
    var arrDC = (str || "").match( /\{\{dc.\w+\}\}/g );
    // replace array keys data
    if ( arrData ) {
        for ( var key in arrData ) {
            str = str.replace( new RegExp( "{{" + key + "}}", "g" ), arrData[ key ] );
        }
    }
    if(arrDC && arrDC.length > 0){
        dcController.findByPlaceHolder(idOwner, (err, arrayDC) =>{
            if(err){
                return next(err);
            }
            if(!arrayDC){
                return next(null, str);
            }
            arrayDC.forEach(dc =>{
                str = str.replace( new RegExp(dc.placeholder, "g"), dc.content);
            });
            return next(null, str);
        });
    } else {
        return next(null, str);
    }
};

/*
 * @author: vupl
 * set ticket infor
 */
exports.setTicketInfor = ( ticket, value, type, user, is_show_placeholde, attachments, next) =>{
    var apiUrl = utils.getFullUrl(user);
    var ed_user_id = utils.getParentUserId(user);
    var attach = '';
    if(attachments && attachments.length > 0){
        attach = '<br>Attachment:'
        for(var i = 0; i< attachments.length; i++){
            attach += `<br>${config.assets_path}${ed_user_id}/${attachments[i]}`;
        }
    }
    var arrPlaceHolders = ( value || "" ).match( /\{\{[\w.]+\}\}/g );
    if ( value && arrPlaceHolders ) {
        content(value, ticket, user, type, is_show_placeholde, attach, apiUrl, arrPlaceHolders, 0, (result) =>{
            return next(result);
        });
    } else {
        return next(value);
    }
};

var content = (value, ticket, user, type, is_show_placeholde, attach, apiUrl, arrPlaceHolders, index, next) =>{
    var arr = arrPlaceHolders[index];
    if(!arr){
        return next(value);
    }
    replaceContent(arr, ticket, user, attach, apiUrl, type, (field) =>{
        if ( field == '' || field == undefined || field == null ) {
            field = "";
        }
        var reg = new RegExp( arr, 'g' );
        value = value.replace( reg, (!field && is_show_placeholde) ? arr : field);
        return content(value, ticket, user, type, is_show_placeholde, attach, apiUrl, arrPlaceHolders , ++index, next);
    });
}

var replaceContent = (arrPlaceHolders, ticket, user, attach, apiUrl, type, next) =>{
    var arr = arrPlaceHolders.replace( '}}', '' ).split( '.' );
        var field = arr[ 1 ];
        if ( arr[ 0 ].indexOf( 'ticket' ) != -1 ) {
            switch ( field ) {
                case 'id':
                    field = ticket[ '_id' ] || ticket[ 'id' ];
                    return next(field);
                    break;
                case 'title':
                    field = ticket[ 'subject' ];
                    return next(field);
                    break;
                case 'link':
                    field = `${apiUrl}/#/izi/ticket/edit/${ticket._id || ticket.id}`;
                    field = ( type === 'text' ? field : ( '<a href="' + field + '">' + ticket.subject + '</a>' ) );
                    return next(field);
                    break;
                case 'status':
                    field = ticket[ 'status' ] ? utils.getEnumKeyByValue(enumTicket.TicketStatus, ticket['status']) : '';
                    return next(field);
                    break;
                case 'priority':
                    field = ticket[ 'priority' ] ? utils.getEnumKeyByValue(enumTicket.TicketPriority, ticket['priority']) : '-';
                    return next(field);
                    break;
                case 'ticket_type':
                    field = ticket[ 'type' ] ? utils.getEnumKeyByValue(enumTicket.TicketType, ticket['type']) : '-';
                    return next(field);
                    break;
                case 'comment':
                    field = ticket.comment['content'];
                    return next(field);
                    break;
                case 'good_rating_link':
                    //field = `${apiUrl}/api/tickets/rating/${ticket._id || ticket.id}/good`;
                    var strb64 = new Buffer(JSON.stringify({
                        id: ticket._id || ticket.id,
                        ed_id: ticket.ed_user_id,
                        rating: 'good'
                    })).toString('base64');
                    field = `${apiUrl}/#/rating?p=${strb64} `;
                    //field = `${apiUrl}/rating?i=${ticket._id || ticket.id}&rating=good`;
                    return next(field);
                    break;
                case 'bad_rating_link':
                    //field = `${apiUrl}/api/tickets/rating/${ticket._id || ticket.id}/bad`;
                    var strb64 = new Buffer(JSON.stringify({
                        id: ticket._id || ticket.id,
                        ed_id: ticket.ed_user_id,
                        rating: 'bad'
                    })).toString('base64');
                    field = `${apiUrl}/#/rating?p=${strb64} `;
                    return next(field);
                    break;
                case 'assignee':
                    if(!arr[2] || !ticket.agent_id){
                        field = '';
                        return next(field);
                    } else {
                        if(arr[2] == "name"){
                            userController.findById_internal(ticket.agent_id, {},(err, result) =>{
                                if(err){
                                    console.error(err);
                                    field = '';
                                    return next(field);
                                }
                                field = result.name;
                                return next(field);
                            });
                        }
                    }
                    break;
                case 'requester':
                    if(!arr[2] || !ticket.requester_id){
                        field = '';
                        return next(field);
                    } else {
                        if(arr[2] == 'name'){
                            userController.findById_internal(ticket.requester_id, {},(err, result) =>{
                                if(err){
                                    console.error(err);
                                    field = '';
                                    return next(field);
                                }
                                field = result.name;
                                return next(field);
                            });
                        } else if(arr[2] == "email"){
                            var params = {
                                query: {
                                    ed_user_id: ticket.ed_user_id,
                                    user_id: ticket.requester_id,
                                    type: enumContact.UserContactType.email
                                }
                            }
                            userContactController.findOneByQuery(params, (err, result) =>{
                                if(err){
                                    console.error(err);
                                    field = '';
                                    return next(field);
                                }
                                if(!result){
                                    field = '';
                                    return next(field);
                                } else {
                                    field = result.value;
                                    return next(field);
                                }
                            });
                        } else if(arr[2] == "phone"){
                            var params = {
                                query: {
                                    ed_user_id: ticket.ed_user_id,
                                    user_id: ticket.requester_id,
                                    type: enumContact.UserContactType.phone
                                }
                            }
                            userContactController.findOneByQuery(params, (err, result) =>{
                                if(err){
                                    console.error(err);
                                    field = '';
                                    return next(field);
                                }
                                if(!result){
                                    field = '';
                                    return next(field);
                                } else {
                                    field = result.value;
                                    return next(field);
                                }
                            });
                        } else {
                            field = '';
                            return next(field);
                        }
                    }
                    break;
                case 'attachments':
                    field = attach;
                    return next(field);
                    break;
                case 'cs':
                    field = ticket.fields[arr[2]];
                    var data = {
                        ed_user_id: ticket.ed_user_id,
                        field_key: arr[2],
                        is_active: true
                    }
                    customSettingsController.customs_settingFindOneByQuery(data, (err, result) =>{
                        if(err){
                            field = '';
                            return next(field);
                        }
                        if(!result){
                            field = '';
                            return next(field);
                        }
                        if(result.cs_type == enumCs.CustomFieldType.dropdown){
                            if(!ticket.fields[arr[2]]){
                                return next(field);
                            }
                            _.forEach(result.cs_type_data.values, (item) =>{
                                if(item.value == ticket.fields[arr[2]]){
                                    field = item.text;
                                    return next(field);
                                }
                            });
                        } else if(result.cs_type == enumCs.CustomFieldType.date){
                            let lng = user.language || 'en',
                                format = lng == 'vi'? 'DD/MM/YYYY H:mm': 'MM/DD/YYYY H:mm',
                                time_zone = user.time_zone.value;
                            field = moment(ticket.fields[arr[2]]).utcOffset(time_zone).format(format);
                            return next(field);
                        } else {
                            return next(field);
                        }
                    });
                    break;
                default:
                    field = ticket[ field ];
                    return next(field);
                    break;
            };
        } else if ( arr[ 0 ].indexOf( 'current_user' ) != -1 ) {
            switch ( field ) {
                case "name":
                    field = ( user.name || '' );
                    return next(field);
                    break;
                case "email":
                    field = user.email;
                    return next(field);
                    break;
                case "phone":
                    var params = {
                        query: {
                            ed_user_id: user.ed_parent_id ? user.ed_parent_id : user._id,
                            user_id: user._id,
                            type: enumContact.UserContactType.phone
                        }
                    }
                    userContactController.findOneByQuery(params, (err, result) =>{
                        if(err){
                            console.error(err);
                            field = '';
                            return next(field);
                        }
                        if(!result){
                            field = '';
                            return next(field);
                        } else {
                            field = result.value;
                            return next(field);
                        }
                    });
                    break;
                case "organization":
                    if ( arr[ 2 ] == 'name' ) {
                        field = user.organization_id;
                    }
                    return next(field);
                    break;
                default:
                    field = ticket[ field ];
                    return next(field);
                    break;
            };
        } else {
            field = '';
            return next(field);
        }
}

exports.mappingUserId = (user) =>{
    return {
        _id: user._id,
        name: user.name,
        profile_image: user.profile_image
    };
};

exports.mappingChannelSend = (data, next) =>{
    var ticketComment = data.ticketComment,
        files = data.files ? data.files.attachments : []
    switch(ticketComment.provider){
        case enumTicket.Provider.api:
            return next(null, data);
            break;
        case enumTicket.Provider.fbComment:
            if(ticketComment.is_public){
                return sendToFbComment(data, next);
            }
            return next(null, data);
            break;
        case enumTicket.Provider.fbMessage:
            sendToFbMessage(data, next);
            break;
        case enumTicket.Provider.gmail:
        case enumTicket.Provider.iziMail:
            next(null, data);
            sendToEmail(data);
            break;
        case enumTicket.Provider.iziComment:
            sendToIziComment(data, next);
            break;
        case enumTicket.Provider.iziChat:
            return next(null, data);
            break;
        case enumTicket.Provider.sms:
            return next(null, data);
            break;
        case enumTicket.Provider.web:
            data.ticketComment.is_internal = true;
            return next(null, data);
            break;
        case enumTicket.Provider.voip:
            emitter.emit('evt.voip.update.history', data.ticket, data.ticketComment.provider_data.call_id);
            return next(null, data);
            break;
        case enumTicket.Provider.youtube:
            sendToYouTube(data,next);
            break;
        case enumTicket.Provider.zaloMessage:
            sendToZaloMessage(data, files, next);
            break;
        default:
            return next(null, data);
            break;
    }
};

var sendToZaloMessage = (data, files, next) =>{
    emitter.emit('evt.ticket.zalo.sendToZalo.v2', data.idOwner, data.ticket, data.ticketComment, files, (err_zalo, result_zalo) =>{
        data.ticketComment = result_zalo;
        data.ticket.error = err_zalo;
        return next(null, data);
    });
};

var sendToFbComment = (data, next) =>{
    emitter.emit('evt.ticket.fb.comment.v2', data.idOwner, data.ticket, data.ticketComment, data.is_retry, (err_fbComment, result_fbComment) =>{
        data.ticketComment = result_fbComment;
        data.ticket.error = err_fbComment;
        return next(null, data);
    });
};

var sendToFbMessage = (data, next) =>{
    emitter.emit('evt.ticket.fb.message.v2', data.idOwner, data.ticket, data.ticketComment, data.is_retry, (err_fbMessage, result_fbMessage) =>{
        data.ticketComment = result_fbMessage;
        data.ticket.error = err_fbMessage;
        return next(null, data);
    });
};
//TO DO
var sendToEmail = (data, next) =>{
    let ticket = data.ticket,
        user = data.user;
    ticket.comment = data.ticketComment;
    rbSender(config.rabbit.sender.exchange.batch, {
        topic: 'izi-core-ticket-sendEmail',
        payload: {
            ticket: ticket,
            user: user
        }
    });
    return next(null, data);
};

var sendToIziComment = (data, next) =>{
    let ticket = data.ticket,
        user = data.user;
    ticket.comment = data.ticketComment;
    rbSender(config.rabbit.sender.exchange.comment, {
        topic: 'izicore-comment-create-reply',
        payload:{
            izi_account_id : ticket.ed_user_id,
            ticket : ticket,
            user: user
        }
    });
    return next(null, data);
};

var sendToYouTube = (data, next) =>{
    emitter.emit('evt.ticket.youtube.comment.v2', data.idOwner, data.ticket, data.ticketComent, (err_youtube, result_youtube) =>{
        data.ticketComment = result_youtube;
        data.ticket.error = err_youtube;
        return next(null, data);
    });
}
