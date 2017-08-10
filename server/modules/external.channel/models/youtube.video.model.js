"use strict";

/**
 * Module dependencies.
 *
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var YoutubeVideoSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    channel_id: {
        type: Schema.Types.ObjectId,
        ref: "YoutubeChannel",
        index: true
    },
    channel_yt_id: {
        type: String,
        index: true
    },
    ticket_id: {
        type: Schema.Types.ObjectId,
        ref: "Ticket",
        index: true
    },
    title: {
        type: String,
        index: true
    },
    description: String,
    is_active: {
        type: Boolean,
        default: true
    },
    video_id: {
        type: String,
        index: true,
        unique : true
    },
    next_page_token: String,
    last_count_result: Number,
    published: Number,
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
});

/**
 * Pre-save hook
 */
YoutubeVideoSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("YoutubeVideo", YoutubeVideoSchema, config.dbTablePrefix.concat("youtube_video"));
