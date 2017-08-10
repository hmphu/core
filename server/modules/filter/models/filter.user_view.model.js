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
 * User Viewer Schema
 */
var FilterUserViewSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    view_id: {
        type: Schema.Types.ObjectId,
        ref: "ViewTicket",
        index: true
    },
    org_id: {
        type: Schema.Types.ObjectId,
        ref: "Organization",
        index: true
    },
    is_requester: {
        type: Boolean,
        index: true
    },
    is_suspended: {
        type: Boolean,
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

FilterUserViewSchema.index({ view_id: 1});


/**
 * Pre-save hook
 */
FilterUserViewSchema.pre("save", function (next) {
    next();
});

mongoose.model("FilterUserView", FilterUserViewSchema, config.dbTablePrefix.concat("filter_user_view"));
