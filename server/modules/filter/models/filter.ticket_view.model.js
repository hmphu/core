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
 * Ticket Viewer Schema
 */
var FilterTicketViewSchema = new Schema({
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
    view_id: {
        type: Schema.Types.ObjectId,
        ref: "ViewTicket",
        index: true
    },
    subject: String,
    status: {
        type: Number,
        index: true
    },
    requester_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    agent_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    group_id: {
        type: Schema.Types.ObjectId,
        ref: "Group",
        index: true
    },
    sla: {
        sla_id: Schema.Types.ObjectId,
        deadline: {
            first_reply_time: Number,
            next_reply_time: Number,
            agent_working_time: {
                type: Number,
                index: true
            }
        }
    },
    date : {
        assigned : {
            type: Number,
            index: true
        },
        deadline : {
            type: Number,
            index: true
        },
        agent_updated : {
            type: Number,
            index: true
        }, // agent updated when agent change ticked
        requester_updated : {
            type: Number,
            index: true
        }, // requester updated when requester comment
        status: {
            type: Number,
            index: true
        }
    },
    add_time: {
        type: Number,
        index: true
    },
    comment_time: {
        type: Number,
        index: true
    },
    solved_date: {
        type: Number,
        index: true
    },
    is_delete: {
        type: Boolean,
        default: false,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
});

FilterTicketViewSchema.index({ view_id: 1});


/**
 * Pre-save hook
 */
FilterTicketViewSchema.pre("save", function (next) {
    next();
});

mongoose.model("FilterTicketView", FilterTicketViewSchema, config.dbTablePrefix.concat("filter_ticket_view"));
