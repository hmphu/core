'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

/**
 * Ticket Comment Schema
 */
var TicketCommentArchiveSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    ticket_archive_id:{
        type: Schema.Types.ObjectId,
        ref: "TicketArchive",
        index:true
    },
    ticket_id:{
        type: Schema.Types.ObjectId,
        index:true
    },
    user_id: { // User_id is requester comment or agent comment
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    group_id: {
        type: Schema.Types.ObjectId,
        ref: "Group",
        index: true
    },
    content: String,
    attachments: [String],
    provider: {
        type: String,
        index: true,
        default: "web"
    },
    provider_data: {},
    is_requester: {
        type: Boolean,
        default: false
    },
    is_first: {
        type: Boolean,
        default: false,
        index: true
    },
    is_internal: {
        type: Boolean,
        default: true
    },
    is_delete: {
        type: Boolean,
        default: false
    },
    is_child: {
        type: Boolean,
        default: false
    },
    is_closed: {
        type: Boolean,
        default: false
    },
    add_time: {
        type: Number,
        index: true
    },
    created_time: Number,
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
});

/**
 * Pre-save hook
 */
TicketCommentArchiveSchema.pre("save", function (next) {
    var now = +moment.utc();
    if(this.isNew && !this.add_time){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("TicketCommentArchive", TicketCommentArchiveSchema, config.dbTablePrefix.concat("ticket_comment_archive"));
