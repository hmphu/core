"use strict";

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var SmsHistSchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    is_io: { // 0: receive, 1: send
        type: Boolean,
        default: true
    },
    short_code: String,
    brand_name: String,
    phone_number: String,
    country_code: {
        type: String,
        default: '84'
    },
    sms_carrier: {
        type: Schema.Types.ObjectId,
        ref: 'SmsCarrier',
        index: true
    },
    sms_count: Number,
    sms_number: Number,
    customer_type: Number,
    cost: Number,
    content: String,
    status_delivered: Number, // status when sent to client: DELIVERED or NOT_DELIVERED
    status_sended: Number, // status: fail or success
    uid: String, // use only for sent sms
    ticket_id: Schema.Types.ObjectId, // use only for receive sms
    comment_id: Schema.Types.ObjectId,
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
SmsHistSchema.pre( "save", function ( next ) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
} );

mongoose.model( "SmsHist", SmsHistSchema, config.dbTablePrefix.concat( "sms_hist" ) );
