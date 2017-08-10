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


var FbStatsSchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    group_id: {
        type: String,
        index: true
    },
    first_id: {
        type:Schema.Types.ObjectId,
        ref: "Fb",
        index: true
    },
    sender: {
        id: String,
        name: String
    },
    is_requester: {
        type: Boolean,
        default: false,
        index: true
    },
    is_replied: {
        type: Boolean,
        default: true,
        index: true
    },
    is_converted: {
        type: Boolean,
        default: false,
        index: true
    },
    page_id: { 
        type: String,
        index: true
    },
    message: String,
    no_reply_count: Number,
    last_id: {
        type:Schema.Types.ObjectId,
        ref: "Fb",
        index: true
    },
    last_fb_id: String,
    ticket_id: {
        type: Schema.Types.ObjectId,
        ref: "Ticket",
        index: true
    },
    last_ticket_id: {
        type: Schema.Types.ObjectId,
        ref: "Ticket",
        index: true
    },
    provider_data : {},
    type: {//conversation/wallpost/userpost
        type: String,
        index : true
    },
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
} );

/**
 * Pre-save hook
 */
FbStatsSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("FbStats", FbStatsSchema, config.dbTablePrefix.concat("fb_stats"));
