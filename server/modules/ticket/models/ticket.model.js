'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    enumsTicket = require('../resources/enums'),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;
    mongoose.Promise = global.Promise;

/**
 * Ticket Schema
 */
var TicketSchema = new Schema({
    ticket_id: {
        type: String,
        index: true
    },
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    agent_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    requester_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    submitter_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    group_id: {
        type: Schema.Types.ObjectId,
        ref: "Group",
        index: true
    },
    organization: {
        type: Schema.Types.ObjectId,
        ref: "Organization",
        index: true
    },
    provider: {
        type: String,
        index: true,
        default: enumsTicket.Provider.web
    },
    provider_data: {},
    subject: String,
    description: String,
    status: {
        type: Number,
        index: true
    },
    type: Number,
    priority: Number,
    deadline: Number,
    sla: {
        sla_id: Schema.Types.ObjectId,
        deadline: {
            is_overdue: Boolean,
            first_reply_time: Number,
            next_reply_time: Number,
            agent_working_time: {
                type: Number,
                index: true
            }
        }
    },
    cc_agents: [Schema.Types.ObjectId],
    tags: [String],
    fields: {},
    stats: {},
    rating:{},
    is_delete: {
        type: Boolean,
        default: false
    },
    deleted_agent: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
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

TicketSchema.index({ 'provider_data.thread_id': 1});
TicketSchema.index({ 'provider_data.comment_id': 1});

/**
 * Pre-save hook
 */
TicketSchema.pre("save", function (next) {
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
        this.sla_date = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("Ticket", TicketSchema, config.dbTablePrefix.concat("ticket"));
