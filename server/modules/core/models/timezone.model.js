"use strict";

/**
 * Module dependencies.
 */

var mongoose = require( "mongoose" ),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    moment = require('moment'),
    Schema = mongoose.Schema;

var TimeZoneSchema = new Schema( {
    _id: {
        type: String,
        index: true
    },
    text: String,
    display_text: String,
    value: {
        type: Number,
        min: -11,
        max: 14,
        index: true
    },
    add_time: Number,
    upd_time: Number
}, {
    _id: false,
    autoIndex: config.dbAutoIndex
} );

/**
 * Pre-save hook
 */
TimeZoneSchema.pre( "save", function ( next ) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
} );

mongoose.model( "TimeZone", TimeZoneSchema, config.dbTablePrefix.concat( "time_zone" ) );
