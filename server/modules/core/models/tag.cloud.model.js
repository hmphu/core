"use strict";

/**
 * Module dependencies.
 */

var mongoose = require( "mongoose" ),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    moment = require('moment'),
    Schema = mongoose.Schema;

var TagCloudSchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: "User"
    },
    name: {
        type: String,
        index: true
    },
    tag_cloud_type: Number,
    add_time: Number,
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
} );


TagCloudSchema.index({ 'name': 'text'});

/**
 * Pre-save hook
 */
TagCloudSchema.pre( "save", function ( next ) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
} );

mongoose.model( "TagCloud", TagCloudSchema, config.dbTablePrefix.concat( "tag_cloud" ) );
