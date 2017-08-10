'use strict';
//
//  comment.js
//  feed comment data for fb schema
//
//  Created by thanhdh on 2016-02-22.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash');
var path = require('path');
var config = require(path.resolve('./config/config'));

/**
 * set comment channel to provider
 * author : thanhdh
 */
exports.setComment = (data) => {
    let photo = [];
    let video = [];
    if(_.isArray(data.photos)){
        photo = data.photos;
    }
    if(data.attachment && data.attachment.media && data.attachment.media.image){
        photo.push(data.attachment.media.image.src);
    }
    if(data.photo){
        photo.push(data.photo);
    }
    
    if(data.attachments ){
        var imageType = "image/png image/jpg image/jpeg image/gif image/svg";
        data.attachments.forEach(file=>{
            if(imageType.indexOf(file.mimetype) != -1){
                if(photo.length == 0){
                    photo.push(file.filename);
                }
            }else{
                video.push(file.filename);
            }
        });
    }
    
    return {
        photos: photo,
        video: video,
        post_id: data.post_id,
        page_id: data.page_id,
        comment_id: data.comment_id,
        parent_id: data.parent_id,
        is_like: data.is_like || false,
        is_error: data.is_error || false,
        is_hidden: data.verb == 'hide'? true: false,
        is_reply: data.is_reply || false,
        is_user_post : data.is_user_post || false,
        sender_id: data.sender_id,
        sender_name: data.sender_name,
        is_echo: data.is_echo
    };
};
