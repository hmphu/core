'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    validator = require('../validator/user.calendar.validator'),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

/**
 * Calendar Schema
 */
var UserCalendarSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
        unique : true
    },
    time_zone: Number,
    business_hours : [{
        day_of_week : Number,
        start_time : String,
        end_time : String,
        start_h : Number,
        start_m : Number,
        start_second: Number, //second
        end_h : Number,
        end_m : Number,
        end_second: Number //second
    }],
    holidays: [{
        name : String,
        start_date : Number,
        end_date : Number
    }],
    is_enable: {
        type: Boolean,
        default: false
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
UserCalendarSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    validator.validateCalendar(this, next);
});

mongoose.model("UserCalendar", UserCalendarSchema, config.dbTablePrefix.concat("user_calendar"));
