"use strict";

/**
 * Module dependencies.
 */
var mongoose = require( "mongoose" ),
    Schema = mongoose.Schema,
    moment = require( "moment" ),
    path = require("path"),
    config = require(path.resolve('./config/config'));

var WikiSectionSchema = new Schema( {
    ed_user_id : {
        index: true,
        type : Schema.Types.ObjectId,
        required : true,
        ref : "User"
    },
    user_created : {
        index: true,
        type : Schema.Types.ObjectId,
        required : true,
        ref : "User"
    },
    user_updated : {
        index: true,
        type : Schema.Types.ObjectId,
        required : true,
        ref : "User"
    },
    category_id : {
        index: true,
        type : Schema.Types.ObjectId,
        required : true,
        ref : "WikiCategory"
    },
    title : {
        type : String,
        required : true
    },
    description : {
        type : String
    },
    is_public : {
        type : Boolean,
        required : true,
        "default" : true
    },
    order_by : Number,
    add_time : Date,
    upd_time : Date
}, {
    autoIndex : config.dbAutoIndex,
    validateBeforeSave: false
} );

/**
 * Pre-save hook
 */
WikiSectionSchema.pre( "save", function ( next ) {
    this.increment();

    if ( !this.add_time ) {
        this.add_time = new Date();
    }

    this.upd_time = new Date();

    next();
} );

mongoose.model( "WikiSection", WikiSectionSchema, config.dbTablePrefix.concat( "wiki_section" ) );
