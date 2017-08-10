"use strict";

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    validator = require('../validator/sms.validator'),
    utils = require('../../core/resources/utils'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var SmsStatsSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    is_io: {
        type: Boolean, // 0: receive, 1: send
        default: true
    },
    sms_carrier: {
        type : Schema.Types.ObjectId,
        required : true,
        ref : 'SmsCarrier',
        index: true
    },
    total: {
        type: Number,
        default: 0
    },
    total_cost: {
        type: Number,
        default: 0
    },
    provider: {
        type: String,
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

/**
 * Pre-save hook
 */
SmsStatsSchema.pre( "save", function ( next ) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;

    next();
} );

mongoose.model( "SmsStats", SmsStatsSchema, config.dbTablePrefix.concat( "sms_stats" ) );
