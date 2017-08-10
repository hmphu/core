"use strict";

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    path = require("path"),
    moment = require( "moment" ),
    config = require(path.resolve('./config/config'));

var AppMarketCateSchema = new Schema( {
    info: [{
        lang: String,
        name: String,
        desc: String,
    }],
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
AppMarketCateSchema.pre( "save", function ( next ) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
} );

mongoose.model( "AppMarketCate", AppMarketCateSchema, config.dbTablePrefix.concat( "app_market_cate" ) );
