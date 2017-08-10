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
                    photo.push(`${config.assets_path}${data.ed_user_id}/${file.filename}`);
                }
            }else{
                video.push(`${config.assets_path}${data.ed_user_id}/${file.filename}`);
            }
        });
    }
    
    return {
        photos: photo,
        video: video,
        post_id: data.post_id,
        parent_id: data.parent_id,
        is_like: data.is_like || false,
        is_hidden: data.verb == 'hide'? true: false,
        is_reply: data.is_reply || false,
        is_user_post : data.is_user_post || false
    };
};
