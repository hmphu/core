'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    validator = require('../validator/user.status.validator'),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

/**
 *  Status Schema
 */
var UserStatusSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    status: { // online, offline and invisible
        account: {
            type: Number,
            default: 0
        },
        voip: {
            type: Number,
            default: 0
        },
        chat: {
            type: Number,
            default: 0
        }
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

UserStatusSchema.index({ ed_user_id: 1, user_id: 1}, { unique: true });

/**
 * Pre-save hook
 */
UserStatusSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    validator(this, next);
});

mongoose.model("UserStatus", UserStatusSchema, config.dbTablePrefix.concat("user_status"));
