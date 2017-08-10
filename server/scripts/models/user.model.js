'use strict';

/**
 * Module dependencies.
 */
var path = require('path');
var moment = require('moment');
var mongoose = require('mongoose');
var config = require('../config');
var Schema = mongoose.Schema;

/**
 * User Schema
 */
var UserSchema = new Schema({}, {
    strict : false
});

mongoose.model("User", UserSchema, config.dbTablePrefix.concat("user"));
