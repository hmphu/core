"use strict";

/**
 * Module dependencies.
 */

var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var CouponSchema = new Schema( {
    name : {
        type : String,
        index: true
    },
    description : {
        type : String
    },
    code : {
        type : String,
        index: true
    },
    valid_from : {
        type : Date
    },
    valid_to : {
        type : Date
    },
    quantity : {
        type : Number,
        "default" : -1
    },
    // in months
    terms : {
        type : Number,
        "default" : 1
    },
    discount_percent : {
        type : Number,
        "default" : 0,
        max : 100,
        min : 0
    },
    add_time: {
        type: Number,
        index: true
    },
    upd_time : Number
}, {
    autoIndex : config.dbAutoIndex
} );

/**
 * Pre-save hook
 */
CouponSchema.pre( "save", function ( next ) {
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
} );

mongoose.model( "Coupon", CouponSchema, config.dbTablePrefix.concat( "coupon" ) );
