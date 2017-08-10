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
    mongoose.Promise = global.Promise;

var DataSeries = new Schema({
    legend: String,
    state: String,
//    all_conditions: [{
//        cond_type: Number,
//        field_key: String,
//        operator: String,
//        value: Schema.Types.Mixed
//    }]
});

var ReportSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    name: {
        type: String,
        index: true
    },
    is_fixed_date: {
        type: Boolean,
        index: true
    },
    group_by: {
        type: String,
        default: "date" // agent
    },
    group_by_time: Number, //minute
    report_time_from: Number, //seconds
    report_time_to: Number, //seconds
    relative_day: Number,
    from_date: Number,
    to_date: Number,    
    data_series: [{
        legend: String,
        state: Number,
        all_conditions: [{
            cond_type: Number,
            field_key: String,
            operator: String,
            value: Schema.Types.Mixed,
            field_id: Schema.Types.ObjectId,
            ticket_field_type: String //only for Ticket field
        }]
    }],
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
});

ReportSchema.index({ ed_user_id: 1, name: 1}, { unique: true });
/**
 * Pre-save hook
 */
ReportSchema.pre("save", function(next) {
    this.increment();
    var now = +moment.utc();
    if (this.isNew) {
        this.add_time = now;
    }
    this.upd_time = now;
    require('../validator/report.validator')(this, next);
});

mongoose.model("Report", ReportSchema, config.dbTablePrefix.concat("report"));
