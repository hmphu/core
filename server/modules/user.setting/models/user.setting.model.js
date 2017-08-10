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
 * User setting Schema
 */
var UserSettingSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
        unique: true
    },
    plan_id: {
        type: Schema.Types.ObjectId,
        ref: "Plan",
        index: true
    },
    is_trial: {
        type: Boolean,
        default: true
    },
    is_sms_active: {
        type: Boolean,
        default: false
    },
    plan_expiration: Date,
    plan_price:{},
    features:{
        
    },
    //agent
    max_agent_no: {
        type: Number,
        default: 0
    },
    current_agent_no: {
        type: Number,
        default: 0
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
UserSettingSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    require('../validator/user.setting.validator')(this, next);
});

mongoose.model("UserSetting", UserSettingSchema, config.dbTablePrefix.concat("user_setting"));
