"use strict";

/**
 * Module dependencies.
 *
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    validator = require('../validator/view.user.validator'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var ViewUserSchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: "User"
    },
    user_id: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: "User"
    },
    name: String,
    all_conditions: [{
        cond_type: Number, //enum
        field_key: String,
        operator: String,
        value: Schema.Types.Mixed,
        field_id: Schema.Types.ObjectId
    }],
    any_conditions: [{
        cond_type: Number, //enum
        field_key: String,
        operator: String,
        value: Schema.Types.Mixed,
        field_id: Schema.Types.ObjectId
    }],
    availability: {
        type: Number,
        index: true
    },
    group_id: {
        type: Schema.Types.ObjectId,
        ref: "Group",
        index: true
    },
    position: {
        type: Number,
        default: 0,
        index: true
    },
    is_active: {
        type: Boolean,
        default: true,
        index: true
    },
    order_by: {
        type: String,
        default: "add_time"
    },
    order_ascending: {
        type: Boolean,
        default: true
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

ViewUserSchema.index({ ed_user_id: 1, name: 1}, { unique: true });

/**
 * Pre-save hook
 */
ViewUserSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    validator(this, next);
});

mongoose.model("ViewUser", ViewUserSchema, config.dbTablePrefix.concat("view_user"));
