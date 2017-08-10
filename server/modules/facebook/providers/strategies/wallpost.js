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
exports.setWallpost = (data) => {
    var photos = [],
        video = [];
    if(_.isArray(data.photos)){
        photos = data.photos;
    }
    if(data.photo){
        photos.push(data.photo);
    }
    if(data.attachments && data.attachments.data.length > 0){
        _.forEach(data.attachments.data, (item) =>{
            if(item.subattachments && item.subattachments.data.length > 0){
                _.forEach(item.subattachments.data, (item_sub) =>{
                    photos.push(item_sub.media.image.src);
                });
            }
            if(item.type == "photo"){
                photos.push(item.media.image.src);
            }else if(item.type == "video_inline"){
                photos.push(item.media.image.src);
                video.push(item.target.url);
            }
        });
    }
    return {
        photos: photos,
        video: video
    };
};
