//"use strict";
//
///**
// * Module dependencies.
// *
// */
//var path = require('path'),
//    config = require(path.resolve('./config/config')),
//    mongoose = require('mongoose'),
//    validator = require('../validator/report.validator'),
//    enums = require('../../core/resources/enums.res'),
//    moment = require('moment'),
//    Schema = mongoose.Schema;
//
//var DataSeries = new Schema( {
//    legend: String,
//    state: String,
//    all_conditions: [
//        {
//            table_name: String,
//            condition: String,
//            field_key: String,
//            operator: String,
//            values: Schema.Types.Mixed
//        }
//    ]
//});
//
//var ReportSchema = new Schema( {
//    ed_user_id: {
//        type: Schema.Types.ObjectId,
//        ref: "User",
//        index: true
//    },
//    name: {
//        type: String,
//        index: true
//    },
//    is_fixed_date: {
//        type: Boolean,
//        index: true
//    },
//    relative_day: Number,
//    from_date: Date,
//    to_date: Date,
//    data_series: [
//        DataSeries
//    ],
//    is_active: {
//        type: Boolean,
//        "default": true,
//        index: true
//    },
//    add_time: {
//        type: Number,
//        index: true
//    },
//    upd_time: Number
//}, {
//    autoIndex: config.dbAutoIndex,
//    validateBeforeSave: false
//} );
//
//ReportSchema.index({ ed_user_id: 1, name: 1}, { unique: true });
///**
// * Pre-save hook
// */
//ReportSchema.pre("save", function (next) {
//    this.increment();
//    var now = +moment.utc();
//    if(this.isNew){
//        this.add_time = now;
//    }
//    this.upd_time = now;
//    validator(this, next);
//});
//
//mongoose.model("Report", ReportSchema, config.dbTablePrefix.concat("report"));
