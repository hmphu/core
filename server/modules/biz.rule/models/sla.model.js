"use strict";

/**
 * Module dependencies.
 *
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    validator = require('../validator/sla.validator'),
    enums = require('../../core/resources/enums.res'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var TargetsTypes = new Schema( {
    priority: Number, // urgent , high, normal , low
    type_hour: {
        type: Number,
        default: enums.CalendarType.calendar_hours
    }, // hours of operation // enum: CalendarType
    target_details: [{
        target_type: Number, // first reply , requester wait , agent work , next reply
        hours: {
            type: Number,
            default: 0
        },
        minutes: {
            type: Number,
            default: 0
        },
        seconds: {
            type: Number,
            default: 0
        }
    }]
});

var SlaSchema = new Schema( {
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
    name: String,
    all_conditions: [{
        cond_type: Number,
        field_key: String,
        operator: String,
        value: Schema.Types.Mixed
    }],
    any_conditions: [{
        cond_type: Number,
        field_key: String,
        operator: String,
        value: Schema.Types.Mixed
    }],
    targets: [
        TargetsTypes
    ],
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
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
} );

SlaSchema.index({ ed_user_id: 1, name: 1}, { unique: true });

/**
 * Pre-save hook
 */
SlaSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    validator(this, next);
});

mongoose.model("Sla", SlaSchema, config.dbTablePrefix.concat("sla"));
