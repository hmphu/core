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

/**
 * Ticket Schema
 */
var TicketArchiveSchema = new Schema({
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
    ticket_id:{
        type: Schema.Types.ObjectId,
        index:true
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
    is_delete: {
        type: Boolean,
        default: false
    },
    provider_data_id: {
        type: Schema.Types.Mixed,
        unique: true,
        sparse: true
    },
    comment_time: {
        type: Number,
        index: true
    },
    solved_date: {
        type: Number,
        index: true
    },
    agent_is_delete: {
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

/**
 * Pre-save hook
 */
TicketArchiveSchema.pre("save", function (next) {
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("TicketArchive", TicketArchiveSchema, config.dbTablePrefix.concat("ticket_archive"));
