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
 * User mail accounts Schema
 */
var UserMailAccountSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    provider: {
        type : String,
        default : 'local'
    },
    provider_data: {},
    mail: {
        type : String,
        index : true
    },
    name : String,
    account_name: String,
    is_auth: { // is changed gmail's pwd
        type: Boolean,
        default: true
    },
    count_noti_auth: { // count send email fail jwt
        type: Number
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    is_default: {
        type: Boolean,
        default: false
    },
    verified_date: Date,
    is_valid_spf: {
        type : Boolean,
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
});

UserMailAccountSchema.index({ ed_user_id: 1, mail: 1}, { unique: true });

/**
 * Pre-save hook
 */
UserMailAccountSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("UserMailAccount", UserMailAccountSchema, config.dbTablePrefix.concat("user_mail_account"));
