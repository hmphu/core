'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    validator = require('../validator/user.fb.page.validator'),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

/**
 * Facebook page Schema
 */
var UserZaloOASchema = new Schema({
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
    page_id: { //oa id
        type: String,
        index: true
    },
    page_info: {
        name: String,
        description: String,
        avatar: String,
        cover: String,
        admin_id: String
    },
    permission: {
        access_token: String,
        add_time: Number
    },
    page_settings: {
//        is_auto_wall_post: {
//            type: Boolean,
//            "default": false
//        },
//        is_auto_create_ticket: {
//            type: Boolean,
//            "default": true
//        },
        is_auto_private_message: {
            type: Boolean,
            "default": false
        }
    },
    is_active: {
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

UserZaloOASchema.index({ ed_user_id: 1, page_id: 1}, { unique: true });
UserZaloOASchema.index({ 'name': 'text'});

/**
 * Pre-save hook
 */
UserZaloOASchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
//    validator.edit(this, next);
});

mongoose.model("UserZaloOA", UserZaloOASchema, config.dbTablePrefix.concat("user_zalo_oa"));
