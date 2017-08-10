"use strict";

/**
 * Module dependencies.
 *
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    validator = require('../validator/rating.validator'),
    enums = require('../../core/resources/enums.res'),
    moment = require('moment'),
    Schema = mongoose.Schema;


var RatingSchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    theme: {
        type: String
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

/**
 * Pre-save hook
 */
RatingSchema.pre("save", function (next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    validator(this, next);
});

mongoose.model("Rating", RatingSchema, config.dbTablePrefix.concat("rating"));
