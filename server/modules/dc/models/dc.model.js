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

var DCSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    name: {
        type: String,
        index: true
    },
    placeholder: {
        type: String,
        index: true
    },
    language: {
        type: String,
        default: "en"
    },
    content: String,
    is_active: {
        type: Boolean,
        default: true
    },
    is_system: {
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
});

DCSchema.index({ ed_user_id: 1, name: 1}, { unique: true });
DCSchema.index({ ed_user_id: 1, placeholder: 1}, { unique: true });

/**
 * Pre-save hook
 */
DCSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("DynamicContent", DCSchema, config.dbTablePrefix.concat("dynamic_content"));
