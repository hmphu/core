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
 * Ticket History Schema
 */
var TicketHistArchiveSchema = new Schema({
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
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    comment_id: {
        type: Schema.Types.ObjectId,
        ref: "TicketComment",
        index: true
    },
    changed: [{
        key: String,
        name: String,
        value: {
            from: Schema.Types.Mixed,
            to: Schema.Types.Mixed
        }
    }],
    business: {
        triggers: [{
            trigger_id: {
                type: Schema.Types.ObjectId,
                ref: "Trigger",
                index: true
            },
            title: String
        }],
        automations: [{
            automation_id: {
                type: Schema.Types.ObjectId,
                ref: "Automation",
                index: true
            },
            title: String
        }],
        macro_id: {
            type: Schema.Types.ObjectId,
            ref: "Macro",
            index: true
        },
        sla: {
            sla_id: {
                type: Schema.Types.ObjectId,
                ref: "Sla",
                index: true
            },
            title: String,
            deadline: {}
        }
    },
    geo: {
        browser: String,
        ip: String,
        location: String
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
TicketHistArchiveSchema.pre("save", function (next) {
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("TicketHistArchive", TicketHistArchiveSchema, config.dbTablePrefix.concat("ticket_hist_archive"));
