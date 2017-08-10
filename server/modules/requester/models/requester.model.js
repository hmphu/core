"use strict";

/**
 * Module dependencies.
 *
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    validator = require('../validator/requester.validator'),
    enums = require('../../core/resources/enums.res'),
    moment = require('moment'),
    Schema = mongoose.Schema;


var RequesterFiltersSchema = new Schema( {
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
    filter_conditions: [
        {
            condition: String,
            table_name: {
                type: String,
                index: true
            },
            field_key: String,
            operator: {
                type: String,
                index: true
            },
            values: {
                type: Schema.Types.Mixed,
                index: true
            }
        }
    ],
    name: {
        type: String,
        index: true
    },
    is_active: {
        type: Boolean,
        index: true,
        "default": true
    },
    availability: { //    All: 0, Group: 1, Only_me: 2,
        type: Number,
        "default": 0,
        index: true
    },
    columns: {
        type: [
            String
        ],
        index: true
    },
    position: {
        type: Number,
        "default": 0
    },
    group_id: {
        type: Schema.Types.ObjectId,
        ref: "Group"
    },
    group_by: String,
    group_ascending: Boolean,
    order_by: String,
    order_ascending: Boolean,
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
} );

RequesterFiltersSchema.index({ ed_user_id: 1, name: 1}, { unique: true });

/**
 * Pre-save hook
 */
RequesterFiltersSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    validator(this, next);
});

mongoose.model("RequesterFilters", RequesterFiltersSchema, config.dbTablePrefix.concat("requester_filters"));
