"use strict";

/**
 * Module dependencies.
 */
var path = require('path');
var config = require(path.resolve('./config/config'));
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var NonceSchema = new Schema({
    nonce : {
        type : String,
        unique : true
    },
    expires : {
        type : Date,
        expires : 180
    }
}, {
    autoIndex : config.dbAutoIndex,
    validateBeforeSave : false
});

mongoose.model("Nonce", NonceSchema, config.dbTablePrefix.concat('nonce'));
