"use strict";

/**
 * Module dependencies.
 *
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var GooglePlayAppSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    name: {
        type: String,
        index: true
    },
    app_id: {
        type: String,
        index: true
    },
    last_review_id: {
        type: String,
        index: true
    },
    is_active: {
        type: Boolean,
        default: true
    },
    service_account_key: {},
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
});

GooglePlayAppSchema.index({ ed_user_id: 1, name: 1}, { unique: true });
GooglePlayAppSchema.index({ ed_user_id: 1, app_id: 1}, { unique: true });

/**
 * Pre-save hook
 */
GooglePlayAppSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    require('../validator/googleplay.app.validator')(this, next);
});

mongoose.model("GooglePlayApp", GooglePlayAppSchema, config.dbTablePrefix.concat("google_play_app"));
