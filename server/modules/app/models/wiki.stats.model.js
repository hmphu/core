"use strict";

/**
 * Module dependencies.
 */
var mongoose = require( "mongoose" ),
    Schema = mongoose.Schema,
    moment = require( "moment" ),
    path = require("path"),
    config = require(path.resolve('./config/config'));

var WikiStatsSchema = new Schema( {
    ed_user_id : {
        index: true,
        type : Schema.Types.ObjectId,
        ref : "User"
    },
    search: {
        type: String,
        index: true
    },
    count:{
        type:Number,
        default: 0
    },
    counter:[
        {
            agent:{
                type : Schema.Types.ObjectId,
                ref : "User"
            },
            count: {
                type:Number,
                default: 0
            }
        }
    ],
//    agents: [
//        
//    ],
    add_time : Date,
    upd_time : Date
}, {
    autoIndex : config.dbAutoIndex,
    validateBeforeSave: false
} );

/**
 * Pre-save hook
 */
WikiStatsSchema.pre( "save", function ( next ) {
    this.increment();

    if ( !this.add_time ) {
        this.add_time = new Date();
    }

    this.upd_time = new Date();

    next();
} );

mongoose.model( "WikiStats", WikiStatsSchema, config.dbTablePrefix.concat( "wiki_stats" ) );
