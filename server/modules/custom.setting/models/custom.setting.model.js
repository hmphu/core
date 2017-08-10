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

var CustomSettingSchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    name: {
        type: String,
        index: true
    },
    description: String,
    field_key: {
        type: String,
        index: true
    },
    provider: {
        type: String,
        index: true
    },
    provider_data: {},
    cs_type: {
        type: String,
        index: true
    },
    cs_type_data: {},
    is_active: {
        type: Boolean,
        default: true,
        index: true
    },
    position: Number,
    is_required: {
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

CustomSettingSchema.index({ ed_user_id: 1, field_key: 1}, { unique: true });

/**
 * Pre-save hook
 */
CustomSettingSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    require('../validator/custom.setting.validator')(this, next);
});

mongoose.model("CustomSetting", CustomSettingSchema, config.dbTablePrefix.concat("custom_setting"));
