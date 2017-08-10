"use strict";

/**
 * Module dependencies.
 *
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    validator = require('../validator/organization.validator'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var OrganizationSchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    name: {
        type: String,
        index: true
    },
    domains: {
        type: [
            String
        ],
        index: true
    },
    details: String,
    notes: String,
    support_group: {
        type: Schema.Types.ObjectId,
        ref: "Group"
    },
    tags: [
        String
    ],
    fields: {},
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
} );

OrganizationSchema.index({ ed_user_id: 1, name: 1}, { unique: true });
OrganizationSchema.index({ 'name': 'text'});

/**
 * Pre-save hook
 */
OrganizationSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    //validator(this, next);
    next();
});

mongoose.model("Organization", OrganizationSchema, config.dbTablePrefix.concat("organization"));
