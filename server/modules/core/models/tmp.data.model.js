"use strict";

/**
 * Module dependencies.
 */

var mongoose = require( "mongoose" ),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    moment = require('moment'),
    Schema = mongoose.Schema;

var TmpDataSchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: "User"
    },
    key: {
        type: String,
        index: true
    },
    data: {},
    add_time: {
        type: Date,
        expires: '30d' // 30 days
    },
    upd_time: Date
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
} );

/**
 * Pre-save hook
 */
TmpDataSchema.pre( "save", function ( next ) {
    this.increment();
    var now = moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
} );

/**
 * Expire Record after one month
 */
mongoose.model( "TmpData", TmpDataSchema, config.dbTablePrefix.concat( "tmp_data" ) );
