'use strict';

/**
 * Module dependencies.
 */
var path = require('path');
var config = require(path.resolve('./config/config'));
var mongoose = require('mongoose');
var moment = require('moment');
var Schema = mongoose.Schema;

/**
 * User Single Sign On Schema
 */
var UserSsoSchema = new Schema({
    ed_user_id : {
        type : Schema.Types.ObjectId,
        ref : "User",
        index : true,
        unique : true
    },
    is_enable : {
        type : Boolean,
        "default" : false
    },
    provider : {
        type : String
    },
    provider_data : {},
    add_time : {
        type : Number,
        index : true
    },
    upd_time : Number
}, {
    autoIndex : config.dbAutoIndex,
    validateBeforeSave : false
});

/**
 * Pre-save hook
 */
UserSsoSchema.pre("save", function(next) {
    this.increment();
    var now = +moment.utc();
    if (this.isNew) {
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("UserSso", UserSsoSchema, config.dbTablePrefix.concat("user_sso"));
