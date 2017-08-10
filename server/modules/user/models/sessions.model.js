"use strict";

/**
 * Module dependencies.
 */
var path = require('path');
var config = require(path.resolve('./config/config'));
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SessionsSchema = new Schema({
    sessions : {
        type : String
    },
    expires : {
        type : Date
    }
}, {
    autoIndex : config.dbAutoIndex,
    validateBeforeSave : false,
    _id : false,
    versionKey : false
});

mongoose.model("Sessions", SessionsSchema, config.dbTablePrefix.concat(config.sessionCollection));
