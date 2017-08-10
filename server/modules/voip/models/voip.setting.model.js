/**
 * voip Schema
 * @author: vupl Created date: 25-12- 2015
 */
var path = require('path');
var config = require(path.resolve('./config/config'));
var utils = require(path.resolve('./modules/core/resources/utils'));
var mongoose = require('mongoose');
var moment = require('moment');
var Schema = mongoose.Schema;

var VoipSettingSchema = new Schema({
    ed_user_id : {
        type : Schema.Types.ObjectId,
        ref : "User",
        unique : true,
        index : true
    },
    enable_voip : {
        type : Boolean,
        "default" : false
    },
    provider : {
        type : String,
        index : true
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
VoipSettingSchema.pre("save", function(next) {
    this.increment();
    var now = +moment.utc();
    if (this.isNew) {
        this.add_time = now;
    }
    this.upd_time = now;

    encrypt(this, true);  // encrypt
    
    next();
});

/**
 * Post-save hook
 */
VoipSettingSchema.post("save", function(doc) {
    encrypt(doc, false); // decrypt
});

/**
 * Find one.
 */
VoipSettingSchema.post('findOne', (doc) => {
    encrypt(doc, false);  // decrypt
});

/**
 * Encrpyt or decrypt
 */
function encrypt(doc, encrypt) {
    if (!doc || !doc.provider_data) {
        return doc;
    }
    
    var providerData = doc.provider_data;
    
    // encrypt api_secret
    if (providerData.api_secret) {
        providerData.api_secret = encrypt ? utils.encrypt(providerData.api_secret, config.sessionSecret) : utils.decrypt(providerData.api_secret, config.sessionSecret);
    }
    
    // encrypt password
    if (providerData.password) {
        providerData.password = encrypt ? utils.encrypt(providerData.password, config.sessionSecret) : utils.decrypt(providerData.password, config.sessionSecret);
    }
    
    // encrypt sp_token
    if (providerData.sp_token) {
        providerData.sp_token = encrypt ? utils.encrypt(providerData.sp_token, config.sessionSecret) : utils.decrypt(providerData.sp_token, config.sessionSecret);
    }
    
    return doc;
}

mongoose.model("VoipSetting", VoipSettingSchema, config.dbTablePrefix.concat("voip_setting"));
