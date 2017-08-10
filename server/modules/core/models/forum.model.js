"use strict";

/**
 * Module dependencies.
 */

var mongoose = require( "mongoose" ),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    moment = require('moment'),
    Schema = mongoose.Schema;

var ForumSchema = new Schema( {
    domain: {
        type:String,
        index: {
            unique: true
        }
    },
    name: {
        type:String, index: true
    },
    url: String,
    is_auto: {
        type:Boolean,
        default: true,
    },
    icon_link: String,
    is_allow_frame: {
        type:Boolean,
        default: false,
    },
    add_time: Number,
    upd_time: Number,
    provider: String,
    provider_data : {}
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
} );

/**
 * Pre-save hook
 */
ForumSchema.pre( "save", function ( next ) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
} );

mongoose.model( "Forum", ForumSchema, config.dbTablePrefix.concat( "forum" ) );
