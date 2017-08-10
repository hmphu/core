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
 * User Api Schema
 */
var UserApiSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
        unique: true
    },
    is_enable : {
        type : Boolean,
        "default" : false
    },
    access_token : [{
        value: String,
        is_used: {
            type: Boolean,
            default: false
        }
    }],
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
UserApiSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("UserApi", UserApiSchema, config.dbTablePrefix.concat("user_api"));
