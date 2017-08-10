"use strict";

/**
 * Module dependencies.
 */
/**
 * Module dependencies.
 */
var mongoose = require( "mongoose" ),
    Schema = mongoose.Schema,
    moment = require( "moment" ),
    path = require("path"),
    config = require(path.resolve('./config/config'));

var WikiCategorySchema = new Schema( {
    ed_user_id : {
        type : Schema.Types.ObjectId,
        required : true,
        ref : "User"
    },
    user_created : {
        type : Schema.Types.ObjectId,
        required : true,
        ref : "User"
    },
    user_updated : {
        type : Schema.Types.ObjectId,
        required : true,
        ref : "User"
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
    add_time : Date,
    upd_time : Date
}, {
    autoIndex : config.dbAutoIndex,
    validateBeforeSave: false
} );

/**
 * Pre-save hook
 */
WikiCategorySchema.pre( "save", function ( next ) {
    this.increment();

    if ( !this.add_time ) {
        this.add_time = new Date();
    }

    this.upd_time = new Date();

    next();
} );

mongoose.model( "WikiCategory", WikiCategorySchema, config.dbTablePrefix.concat( "wiki_category" ) );
