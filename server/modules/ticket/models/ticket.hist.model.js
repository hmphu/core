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
var TicketHistSchema = new Schema({
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
    // TODO: START == will be removed in version 2
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
    // =====END
    submitter_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    comments: [{
        user_id: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        _id: {
            type: Schema.Types.ObjectId,
            ref: "TicketComment"
        },
        comment_id: String,
        geo: {
            browser: String,
            ip: String,
            location: String
        }
    }],
    changed: [{
        key: String,
        value: {
            from: Schema.Types.Mixed,
            to: Schema.Types.Mixed
        }
    }],
    business: {
        triggers: [{
            id: {
                type: Schema.Types.ObjectId,
                ref: "Trigger",
                index: true
            },
            title: String,
            changed: [{
                key: String,
                value: {
                    from: Schema.Types.Mixed,
                    to: Schema.Types.Mixed
                }
            }]
        }],
        automations: [{
            id: {
                type: Schema.Types.ObjectId,
                ref: "Automation",
                index: true
            },
            title: String,
            changed: [{
                key: String,
                value: {
                    from: Schema.Types.Mixed,
                    to: Schema.Types.Mixed
                }
            }]
        }],
        macro_id: {
            type: Schema.Types.ObjectId,
            ref: "Macro",
            index: true
        },
        sla_id: {
            type: Schema.Types.ObjectId,
            ref: "Sla",
            index: true
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
TicketHistSchema.pre("save", function (next) {
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("TicketHist", TicketHistSchema, config.dbTablePrefix.concat("ticket_hist"));
