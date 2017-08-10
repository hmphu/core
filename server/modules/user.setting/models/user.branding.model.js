'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

/**
 * Branding Schema
 */
var UserBrandingSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
        unique: true
    },
    account_name: String,
    color: String,
    logo: String,
    favicon: String,
    host_mapping: {
        type: String,
        unique: true,
        sparse: true
    },
    sub_domain: {
        type: String,
        unique: true
    },
    keyword_black_list: [
        String
    ],
    is_auto_org: {
        type: Boolean,
        "default": false
    },
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
});

/**
 * Pre-save hook
 */
UserBrandingSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("UserBranding", UserBrandingSchema, config.dbTablePrefix.concat("user_branding"));
