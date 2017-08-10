"use strict";

/**
 * Module dependencies.
 */

var mongoose = require( "mongoose" ),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    moment = require('moment'),
    Schema = mongoose.Schema;

var CountrySchema = new Schema( {
    _id: {
        type: String,
        index: true
    },
    text: String,
    code: {
        type:Number,
        index: true
    },
    add_time: Number,
    upd_time: Number
}, {
    _id: false,
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
} );

/**
 * Pre-save hook
 */
CountrySchema.pre( "save", function ( next ) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
} );

mongoose.model( "Country", CountrySchema, config.dbTablePrefix.concat( "country" ) );
