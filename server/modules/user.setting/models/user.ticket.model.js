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
 * User Ticket Schema
 */
var UserTicketSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
        unique : true
    },
    is_comment_markdown: {
        type: Boolean,
        default: false
    },
    is_comment_emoji: {
        type: Boolean,
        default: false
    },
    is_public_email_comment: {
        type: Boolean,
        default: false
    },
    enable_tags: {
        type: Boolean,
        default: true
    },
    automatic_enable_tags: {
        type: Boolean,
        default: false
    },
    auto_assign_on_solved: {
        type: Boolean,
        default: false
    },
    allow_reassign_to_group: {
        type: Boolean,
        default: false
    },
    allow_orther_agent_edit: {
        type: Boolean,
        default: true
    },
    agent_comment_in_group:[
        Schema.Types.ObjectId
    ],
    suspended_ticket_notif: { // -1: never, 1: 10 minutes, 2: 1 hour, 3: daily
        type : Number,
        "default" : -1
    },
    suspended_email_list: [
        String
    ],
    suspended_notif_email_list: [
        String
    ],
    suspended_mail_sent_date: Date,
    enable_voip_admin_listen: {
        type : Boolean,
        "default" : false
    },
    enable_requester: {
        type : Boolean,
        "default" : false
    },
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
UserTicketSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
//    validator(this, next);
    next();
});

mongoose.model("UserTicket", UserTicketSchema, config.dbTablePrefix.concat("user_ticket"));
