"use strict";

/**
 * Module dependencies.
 */
var mongoose = require( "mongoose" ),
    Schema = mongoose.Schema,
    moment = require( "moment" ),
    path = require("path"),
    config = require(path.resolve('./config/config'));

var AppUserSchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    submitter_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    market_id: {
        type: Schema.Types.ObjectId,
        ref: "AppMarket",
        index: true
    },
    app_name: String,
    version: String,
    locations: [Number],
    is_maximize: {
        type: Boolean,
        default: false
    },
    permissions: [String],
    is_enabled: {
        type: Boolean,
        default: true
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

AppUserSchema.index({ ed_user_id: 1, app_name: 1}, { unique: true });

/**
 * Pre-save hook
 */
AppUserSchema.pre( "save", function ( next ) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
} );

mongoose.model( "AppUser", AppUserSchema, config.dbTablePrefix.concat( "app_user" ) );
