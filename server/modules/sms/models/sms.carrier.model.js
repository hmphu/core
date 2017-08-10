"use strict";

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var SmsCarrierSchema = new Schema( {
    sms_number: {
        type: Number,
        index: true
    },
    sms_carrier: String,
    customer_types: [{
        description: String,
        cost_send: Number,
        monthly_fee: Number,
        customer_type: Number
    }],
    sms_head_number: [{
        type: String,
        index: true
    }],
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
SmsCarrierSchema.pre( "save", function ( next ) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;

    next();
} );

mongoose.model( "SmsCarrier", SmsCarrierSchema, config.dbTablePrefix.concat( "sms_carrier" ) );
