'use strict';
//
//  facebook.js
//  feed fb data for ticket schema
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//
var _ = require('lodash'),
    path = require('path'),
    mongoose = require('mongoose'),
    FbUserPage = mongoose.model('UserFbPage'),
    enumsContactType = require('../../../people/resources/enums.res'),
    cache = require(path.resolve('./config/lib/redis.cache')),
    requesterContact = require(path.resolve('./modules/people/controllers/people.user.contact.controller'));

/**
 * set fb comment to provider
 * author : thanhdh
 */
exports.setFbComments = (data) => {
    return {
        page_id: data.page_id,
        post_id: data.post_id,
        sender_id: data.sender_id, //fb user id
        comment_id: data.comment_id,
        parent_id: data.parent_id,
        comment_parent_id: data.comment_parent_id,
        is_like : data.is_like || false,
        is_hidden : data.is_hidden || false,
        is_user_post: data.is_user_post || false,
        is_echo: true,
        is_error: data.is_error || false,
        is_reply: data.is_error || false
    };
};

/**
 * set fb private message to provider
 * author : thanhdh
 */
exports.setFbPrivateMsg = (data) => {
    return {
        page_id: data.page_id,
        thread_id: data.thread_id,
        message_id: data.message_id,
        is_error: data.is_error || false
    };
};

/**
 * validate provider data facebook
 * author : vupl
 */
exports.validateDataFb = (data, global, next) =>{
    var query = {
        fb_id: data.sender_id
    };
    cache.findOneWithCache(global.data.ed_user_id, `fb_user_${data.sender_id}`, FbUserPage, query, (err, result) =>{
        if(err){
            console.error(err);
            return next(err);
        }
        if(!result || !_.isEqual(result.ed_user_id, global.data.ed_user_id) || result.is_active == false){
            return next(new TypeError('ticket_comment.provider_data.sender_id_not_found'));
        }
        if(data.page_id != global.ticket.provider_data.page_id){
            return next(new TypeError('ticket_comment.provider_data.notFound'));
        }
        return next(null, result);
    });
};
