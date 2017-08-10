"use strict";

/**
 * Module dependencies.
 * Macro Condition
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var MacroSchema = new Schema( {
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
    name: String,
    actions: [{
        act_type: Number,
        field_key: String,
        value: Schema.Types.Mixed,
        additional_values: {},
        field_id: Schema.Types.ObjectId
    }],
    position: {
        type: Number,
        index: true,
        default: 0
    },
    availability: {
        type: Number,
        index: true
    },
    group_id: {
        type: Schema.Types.ObjectId,
        ref: "Group"
    },
    is_active: {
        type: Boolean,
        index: true,
        default: true
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

MacroSchema.index({ ed_user_id: 1, name: 1}, { unique: true });

/**
 * Pre-save hook
 */
MacroSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    require('../validator/macro.validator')(this, next);
});

mongoose.model("Macro", MacroSchema, config.dbTablePrefix.concat("macro"));
