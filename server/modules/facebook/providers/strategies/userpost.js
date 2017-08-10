'use strict';
//
//  wallpost.js
//  feed wallpost data for fb schema
//
//  Created by thanhdh on 2016-02-22.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//
var _ = require('lodash');

/**
 * set wallpost channel to provider
 * author : thanhdh
 */
exports.setUserpost = (data) => {
    let photo = [],
        video = [];
    if(_.isArray(data.photos)){
        photo = data.photos;
    }
    if(data.attachments && data.attachments.data.length > 0){
        _.forEach(data.attachments.data, (item) =>{
            if(item.type == "video_inline"){
                photo.push(item.media.image.src);
                video.push(item.target.url);
            } else {
                photo.push(item.media.image.src);
            }
        });
    }
    if(data.photo){
        photo.push(data.photo);
    }
    if(data.link){
        video.push(data.link);
    }
    return {
        photos: photo,
        video: video,
        post_id: data.post_id,
        parent_id: data.post_id,
        is_like: data.is_like || false,
        is_hidden: data.verb == 'hide'? true: false,
    };
};
