"use strict";

/**
 * Module dependencies.
 *
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    //validator = require('../validator/user.contact.validator'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var UserContactSchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    provider : String,
    provider_data : {},
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    type: {
        type: Number,
        index: true
    },
    value: {
        type: String,
        index: true,
        default: ""
    },
    is_requester: {
        type: Boolean,
        default: false
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    is_primary: {
        type: Boolean,
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
} );

UserContactSchema.index({ ed_user_id: 1, value: 1}, { unique: true });

/**
 * Pre-save hook
 */
UserContactSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
    //validator(this, next);
});

mongoose.model("UserContact", UserContactSchema, config.dbTablePrefix.concat("user_contact"));
