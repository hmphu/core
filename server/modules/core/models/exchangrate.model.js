
/**
 * Module dependencies.
 */
var mongoose = require( "mongoose" ),
    Schema = mongoose.Schema,
    path = require('path'),
    crypto = require( "crypto" ),
    moment = require("moment"),
    config = require(path.resolve('./config/config'));

var ExchangeRateSchema = new Schema( {
    currency: {//required
        type: String,
        index: true
    },
    sell: { //required
        type: Number,
        "default": 0
    },
    buy: {//required
        type: Number,
        "default": 0
    },
    add_time: Number,
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex
} );

/**
 * Pre-save hook
 */
ExchangeRateSchema.pre( "save", function ( next ) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
} );

mongoose.model( "ExchangeRate", ExchangeRateSchema, config.dbTablePrefix.concat( "exchange_rate" ) );
