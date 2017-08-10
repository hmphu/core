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
 * User Mail Schema
 */
var UserMailSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
        unique : true
    },
    is_custom_email_reply : {
        type : Boolean,
        "default" : false
    },
    is_email_photo : {
        type : Boolean,
        "default" : false
    },
    is_dkim : {
        type : Boolean,
        "default" : false
    },
    mail: {
        html: String,
        text: String,
        is_using_html: {
            type: Boolean,
            default: true
        },
        delimiter: String
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
UserMailSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("UserMail", UserMailSchema, config.dbTablePrefix.concat("user_mail"));
