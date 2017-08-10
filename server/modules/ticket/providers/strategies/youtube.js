'use strict';
//
//  youtube.js
//  feed youtube data for ticket schema
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//
var _ = require('lodash'),
    path = require('path'),
    mongoose = require('mongoose'),
    YoutubeVideo = mongoose.model('YoutubeVideo'),
    YoutubeChannel = mongoose.model('YoutubeChannel'),
    cache = require(path.resolve('./config/lib/redis.cache'));


/**
 * set yt provider
 * author : khanhpq
 */
exports.setYoutube = (data) => {
    return {
        channel_yt_id: data.channel_yt_id,
        video_id: data.video_id,
        sender_id: data.sender_id,
        like_count: data.like_count,
        dislike_count: data.dislike_count
    };
};

/**
 * set yt comment to provider
 * author : khanhpq
 */
exports.setYTComments = (data) => {
    return {
        channel_yt_id: data.channel_yt_id,
        video_id: data.video_id,
        sender_id: data.sender_id,
        comment_id: data.comment_id,
        parent_id: data.parent_id,
        comment_parent_id: data.comment_parent_id,
        like_count: data.like_count,
        dislike_count: data.dislike_count,
        is_reply: data.is_error || false
    };
};
