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

var YoutubeChannelSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    name: {
        type: String,
        index: true
    },
    is_active: {
        type: Boolean,
        default: true
    },
    channel_id: {
        type: String,
        index: true,
        unique : true
    },
    thumbnails: {},
    description: String,
    avatar: String,
    email: {
        type: String,
        index: true
    },
    user_id: {
        type: String,
        index: true
    },
    token: String,
    refesh_token: String,
    expires_in: Number,
    /*youtube_id: {
        type: Schema.Types.ObjectId,
        ref: "Youtube",
        index: true
    },*/
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
YoutubeChannelSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("YoutubeChannel", YoutubeChannelSchema, config.dbTablePrefix.concat("youtube_channel"));
