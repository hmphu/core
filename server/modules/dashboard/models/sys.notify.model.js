"use strict";

/**
 * Module dependencies.
 */
var mongoose = require( "mongoose" ),
    Schema = mongoose.Schema,
    moment = require( "moment" ),
    path = require("path"),
    config = require(path.resolve('./config/config'));

var SystemNotifySchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    title: String,
    content:String,
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
SystemNotifySchema.pre( "save", function ( next ) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
} );

mongoose.model( "SystemNotify", SystemNotifySchema, config.dbTablePrefix.concat( "system_notify" ) );
