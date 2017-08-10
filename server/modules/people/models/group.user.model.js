"use strict";

/**
 * Module dependencies.
 *
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;


var GroupUserSchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    provider: String,
    provider_data : {},
    group_id: {
        type: Schema.Types.ObjectId,
        ref: "Group",
        index: true
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    is_default: {
        type: Boolean,
        "default": false,
        index: true
    },
    is_suspended: {
        type: Boolean,
        "default": false
    },
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
} );

GroupUserSchema.index({ group_id: 1, user_id: 1}, { unique: true });

/**
 * Pre-save hook
 */
GroupUserSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("GroupUser", GroupUserSchema, config.dbTablePrefix.concat("group_user"));
