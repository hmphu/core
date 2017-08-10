'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    validator = require('../validator/user.local.validator'),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

/**
 * Localization Schema
 */
var UserLocalSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
        unique : true
    },
    language : {
        type : String,
        "default" : "en"
    },
    time_zone: {
        id: {
            type: String,
            default: "Asia/Ho_Chi_Minh"
        },
        value: {
            type: Number,
            default: 7
        }
    },
    time_format : {
        type : Number, // 12 or 24
        "default" : 24
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
UserLocalSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    require('../validator/user.local.validator')(this, next);
});

mongoose.model("UserLocal", UserLocalSchema, config.dbTablePrefix.concat("user_local"));
