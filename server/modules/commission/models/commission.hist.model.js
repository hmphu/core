"use strict";

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var CommissionHistSchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    ref_code: {
        type: String,
        index: true
    },
    discount: { // by percent
        type: Number,
        default: 5
    },
    buyer: {
        id: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        total_order: Number,
        payment_hist_id: {
            type: Schema.Types.ObjectId,
            ref: "PaymentHist"
        }
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
CommissionHistSchema.pre( "save", function ( next ) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
} );

mongoose.model( "CommissionHist", CommissionHistSchema, config.dbTablePrefix.concat( "commission_hist" ) );
