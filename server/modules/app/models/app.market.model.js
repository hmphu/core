"use strict";

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    path = require("path"),
    moment = require( "moment" ),
    config = require(path.resolve('./config/config'));

var AppMarketSchema = new Schema( {
    market_cate_id: {
        type: Schema.Types.ObjectId,
        ref: "AppMarketCate",
        index: true
    },
    info: [{
        lang: String,
        title: String,
        desc: String,
        price: Number
    }],
    name: String,
    version: String,
    is_feature: {
        type: Boolean,
        default: false
    },
    is_recommend: {
        type: Boolean,
        default: false
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

/**
 * Pre-save hook
 */
AppMarketSchema.pre( "save", function ( next ) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
} );

mongoose.model( "AppMarket", AppMarketSchema, config.dbTablePrefix.concat( "app_market" ) );
