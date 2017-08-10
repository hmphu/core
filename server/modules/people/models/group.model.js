"use strict";

/**
 * Module dependencies.
 *
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    validator = require('../validator/group.validator'),
    moment = require('moment'),
    Schema = mongoose.Schema;


var GroupSchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    name: {
        type: String,
        index: true
    },
    provider: String,
    provider_data : {},
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
} );

GroupSchema.index({ ed_user_id: 1, name: 1}, { unique: true });
GroupSchema.index({ 'name': 'text'});

/**
 * Pre-save hook
 */
GroupSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    validator(this, next);
});

mongoose.model("Group", GroupSchema, config.dbTablePrefix.concat("group"));
