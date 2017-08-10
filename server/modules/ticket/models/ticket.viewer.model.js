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
var TicketViewerSchema = new Schema({
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
    viewer_ids: {
        type: [Schema.Types.ObjectId],
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
TicketViewerSchema.pre("save", function (next) {
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("TicketViewer", TicketViewerSchema, config.dbTablePrefix.concat("ticket_viewer"));
