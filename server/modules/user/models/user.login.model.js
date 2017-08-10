"use strict";

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var UserLoginSchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: "User"
    },
    user_id: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: "User"
    },
    session_id: String,
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
} );

/**
 * Pre-save hook
 */
UserLoginSchema.pre("save", function (next) {
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("UserLogin", UserLoginSchema, config.dbTablePrefix.concat("user_login"));
