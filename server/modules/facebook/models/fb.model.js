"use strict";

/**
 * Module dependencies.
 *
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    enums = require('../resources/enums'),
    Schema = mongoose.Schema;

var FbSchema = new Schema( {
    fb_id: {
        type: String,
        index: true
    },
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    ticket_id: {
        type: Schema.Types.ObjectId,
        ref: "Ticket",
        index: true
    },
    ticket_comment_id: {
        type: Schema.Types.ObjectId,
        ref: "TicketComment",
        index: true
    },
    page_id: {
        type: String,
        index: true
    },
    sender: {
        id: String,
        name: String,
        user:{}
    },
    is_requester: {
        type: Boolean,
        default: false,
        index: true
    },
    message: String,
    provider: { //conversation/wallpost/comment
        type: String,
        index: true,
        default: enums.Provider.wallpost
    },
    provider_data: {},
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
} );

FbSchema.index({ 'provider_data.post_id': 1});
FbSchema.index({ 'provider_data.parent_id': 1});
FbSchema.index({ 'provider_data.is_reply': 1});
FbSchema.index({ 'provider_data.thread_id': 1});

/**
 * Pre-save hook
 */
FbSchema.pre("save", function (next) {
    this.increment();
    var now = moment.utc().unix();
    if(!this.add_time){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("Fb", FbSchema, config.dbTablePrefix.concat("fb"));
