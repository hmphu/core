'use strict';

/**
 * Module dependencies.
 */
var path = require('path');
var moment = require('moment');
var mongoose = require('mongoose');
var config = require(path.resolve('./config/config'));
var enumsTicket = require('../resources/enums');
var Schema = mongoose.Schema;

/**
 * Ticket Statistics Schema
 */
var TicketStatsSchema = new Schema({
    ed_user_id : {
        type : Schema.Types.ObjectId,
        ref : "User",
        index : true
    },
    ticket_id : {
        type : Schema.Types.ObjectId,
        ref : "Ticket",
        index : true
    },
    provider : {
        type : String,
        'default' : enumsTicket.Provider.web
    },
    rating : {
        value : Number,
        comment : String,
        upd_time : Number,
        agent_id : { // agent is assigned
            type : Schema.Types.ObjectId,
            ref : "User"
        },
        group_id : {
            type: Schema.Types.ObjectId,
            ref : "Group"
        }
    },
    counter : {
        reopen : {
            value : {
                type : Number,
                'default' : 0
            },
            agent_ids : [Schema.Types.ObjectId]
        },
        agent_cmt : {
            value : {
                type : Number,
                'default' : 0
            },
            ids : [Schema.Types.ObjectId]
        },
        requester_cmt : {
            value : {
                type : Number,
                'default' : 0
            },
            ids : [Schema.Types.ObjectId]
        },
        assigned : {
            value : {
                type : Number,
                'default' : 0
            },
            agent_ids : [Schema.Types.ObjectId]
        },
        grouped : {
            value : {
                type : Number,
                'default' : 0
            },
            ids : [Schema.Types.ObjectId]
        },
        status : { // total time in secs that a ticket is in this status
            New : {
                type : Number,
                'default' : 0
            },
            Open : {
                type : Number,
                'default' : 0
            },
            Pending : {
                type : Number,
                'default' : 0
            },
            Solved : {
                type : Number,
                'default' : 0
            },
            Suspended: {
                type: Number,
                'default' : 0
            }
        }
    },
    date : {
        status : {
            New : Number,
            Open : Number,
            Pending : Number,
            Solved : Number,
            Closed : Number
        },
        assigned : Number,
        deadline : Number,
        agent_updated : Number, // agent updated when agent change ticked
        requester_updated : Number // requester updated when requester comment
    },
    agent_first_replied: {
        agent_id: {
            type : Schema.Types.ObjectId,
            ref : "User"
        },
        group_id : {
            type : Schema.Types.ObjectId,
            ref : "Group"
        },
        upd_time: Number
    },
    is_delete : {
        type : Boolean,
        'default' : false
    },
    is_agent_unanswered: {
        type: Boolean,
        'default' : true
    },
    current_status : {
        agent_id : { // agent is assigned
            type : Schema.Types.ObjectId,
            ref : "User"
        },
        group_id : {
            type : Schema.Types.ObjectId,
            ref : "Group"
        },
        status : Number,
        upd_time : Number
    },
    last_comment_channel: {
        type: String
    },
    add_time : {
        type : Number
    },
    upd_time : Number
}, {
    autoIndex : config.dbAutoIndex,
    validateBeforeSave : false
});

/**
 * Pre-save hook
 */
TicketStatsSchema.pre("save", function(next) {
    var now = +moment.utc();
    if (this.isNew) {
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("TicketStats", TicketStatsSchema, config.dbTablePrefix.concat("ticket_stats"));
