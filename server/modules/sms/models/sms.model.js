"use strict";

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    validator = require('../validator/sms.validator'),
    utils = require('../../core/resources/utils'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var SmsSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
        unique : true
    },
    short_code: {
        value: {
            type: String,
            trim: true,
            unique: true,
            sparse: true,
            index: true
        },
        is_active: {
            type: Boolean,
            default: false
        },
        add_time: Number
    },
    brand: {
        name: {
            type: String,
            trim: true,
            sparse: true,
            index: true
        },
        is_active: {
            type: Boolean,
            index: true,
            default: false
        },
        time_active: [{
            start_time: Number,
            end_time: Number,
            is_active: {
                type: Boolean,
                default: false
            }
        }],
        add_time: Number,
        end_time: Number
    },
    is_active: {
        type: Boolean,
        index: true
    },
    customer_type: Number,
    provider: {
        type: String,
        index: true
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
SmsSchema.pre("save", function (next) {
    this.increment();
    if(utils.isEmpty(this.short_code.value)){
        this.short_code.value = undefined;
    }
    if(utils.isEmpty(this.brand.name)){
        this.brand.name = undefined;
    }
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
        this.short_code.add_time = now;
        this.brand.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("Sms", SmsSchema, config.dbTablePrefix.concat("sms"));
