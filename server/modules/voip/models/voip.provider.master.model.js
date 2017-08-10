/**
 * voip Schema
 * @author: vupl Created date: 25-12- 2015
 */
var path = require('path');
var config = require(path.resolve('./config/config'));
var mongoose = require('mongoose');
var moment = require('moment');
var Schema = mongoose.Schema;

var VoipProviderMasterSchema = new Schema({
    provider : {
        type : String,
        unique : true
    },
    provider_data : {},
    add_time : {
        type : Number,
        index : true
    },
    upd_time : Number
}, {
    autoIndex : config.dbAutoIndex,
    validateBeforeSave : false
});

/**
 * Pre-save hook
 */
VoipProviderMasterSchema.pre("save", function(next) {
    this.increment();
    var now = +moment.utc();
    if (this.isNew) {
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});

mongoose.model("VoipProviderMaster", VoipProviderMasterSchema, config.dbTablePrefix.concat("voip_provider_master"));
