"use strict";

/**
 * Module dependencies.
 *
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    validator = require('../validator/trigger.validator'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var TriggerSchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    name: String,
    all_conditions: [{
        cond_type: Number, //enum: biz.rule
        field_key: String,
        operator: String,
        value: Schema.Types.Mixed,
        field_id: Schema.Types.ObjectId,
        ticket_field_type: String //only for Ticket field
    }],
    any_conditions: [{
        cond_type: Number, //enum: biz.rule
        field_key: String,
        operator: String,
        value: Schema.Types.Mixed,
        field_id: Schema.Types.ObjectId,
        ticket_field_type: String //only for Ticket field
    }],
    actions: [{
        act_type: Number, //enum: biz.rule
        field_key: String,
        value: Schema.Types.Mixed,
        additional_values: {},
        field_id: Schema.Types.ObjectId
    }],
    position: {
        type: Number,
        index: true,
        default: 0
    },
    is_active: {
        type: Boolean,
        index: true,
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

TriggerSchema.index({ ed_user_id: 1, name: 1}, { unique: true });

/**
 * Pre-save hook
 */
TriggerSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    validator(this, next);
});

mongoose.model("Trigger", TriggerSchema, config.dbTablePrefix.concat("trigger"));
