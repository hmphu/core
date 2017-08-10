'use strict';

/**
 * Module dependencies.
 */
var path = require('path'), config = require(path.resolve('./config/config')), mongoose = require('mongoose'), moment = require('moment'), Schema = mongoose.Schema;

/**
 * External Api Schema
 */
var ExternalApiSchema = new Schema({
    ed_user_id : {
        type : Schema.Types.ObjectId,
        ref : "User"
    },
    domain : String,
    app_id : String,
    app_secret : {
        type : String
    },
    add_time : {
        type : Number
    },
    upd_time : Number
}, {
    autoIndex : config.dbAutoIndex,
    validateBeforeSave : false
});

ExternalApiSchema.index({
    app_id : 1,
    app_secret : 1,
    domain : 1
}, {
    unique : true
});

/**
 * Pre-save hook
 */
ExternalApiSchema.pre("save", function(next) {
    this.increment();
    var now = +moment.utc();
    if (this.isNew) {
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("ExternalApi", ExternalApiSchema, config.dbTablePrefix.concat("external_api"));
