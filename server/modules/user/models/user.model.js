'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    crypto = require('crypto'),
    enums = require('../../core/resources/enums.res'),
    generatePassword = require('generate-password'),
    moment = require('moment'),
    owasp = require('owasp-password-strength-test'),
    _ = require('lodash');

/**
 * User Schema
 */
var UserSchema = new Schema({
    ed_parent_id: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: "User"
    },
    org_id: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: "Organization"
    },
    sub_domain: {
        type: String,
        lowercase: true,
        trim: true,
        index: true
    },
    name: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        index: true
    },
    password: {
        type: String,
        default: ''
    },
    salt: String,
    roles: {
        type: [{
            type: String,
            enum: _.values(enums.UserRoles)
        }],
        default: enums.UserRoles.guest // Guest
    },
    is_requester: {
        type: Boolean,
        default: false,
        index: true
    },
    profile_image: {
        type: String,
        default: 'default.png'
    },
    provider: {
        type : String,
        index : true
    },
    provider_data: {},
    additional_provider_data: {},
    language: String,
    time_zone: {
        id: {
            type: String,
            default: config.timezone.id
        },
        value: {
            type: Number,
            default: config.timezone.value
        }
    },
    time_format: {
        type: Number, // 12 or 24
        default: config.timeFormat.h24
    },
    tags: [String],
    fields: {},
    is_verified: {
        type: Boolean,
        default: false
    },
    is_suspended: {
        type: Boolean,
        default: false
    },
    is_full_index: {
        type: Boolean,
        default: false
    },
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number,
    /* For reset password */
    reset_password_token: String,
    reset_password_expires: Date
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
});

UserSchema.index({ sub_domain: 1, email: 1}, { unique: true });
UserSchema.index({ 'name': 'text'}, {language_override: 'name_lang'});

/**
 * Hook a pre save method to hash the password
 */
UserSchema.pre('save', function(next) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    if (this.password && this.isModified('password')) {
        this.salt = crypto.randomBytes(16).toString('base64');
        this.password = this.hashPassword(this.password);
    }
    next();
});

/**
 * Create instance method for hashing a password
 */
UserSchema.methods.hashPassword = function(password) {
    if (this.salt && password) {
        return crypto.pbkdf2Sync(password, new Buffer(this.salt, 'base64'), 10000, 64, 'sha1').toString('base64');
    } else {
        return password;
    }
};

/**
 * Create instance method for authenticating user
 */
UserSchema.methods.authenticate = function(password) {
    return this.password === this.hashPassword(password);
};

/**
 * Generates a random passphrase that passes the owasp test.
 * Returns a promise that resolves with the generated passphrase, or rejects with an error if something goes wrong.
 * NOTE: Passphrases are only tested against the required owasp strength tests, and not the optional tests.
 */
UserSchema.statics.generateRandomPassphrase = function() {
    return new Promise((resolve, reject) => {
        var password = '';
        var repeatingCharacters = new RegExp('(.)\\1{2,}', 'g');

        // iterate until the we have a valid passphrase.
        // NOTE: Should rarely iterate more than once, but we need this to ensure no repeating characters are present.
        while (password.length < 20 || repeatingCharacters.test(password)) {
            // build the random password
            password = generatePassword.generate({
                length: Math.floor(Math.random() * (20)) + 20, // randomize length between 20 and 40 characters
                numbers: true,
                symbols: false,
                uppercase: true,
                excludeSimilarCharacters: true,
            });

            // check if we need to remove any repeating characters.
            password = password.replace(repeatingCharacters, '');
        }

        // Send the rejection back if the passphrase fails to pass the strength test
        if (owasp.test(password).errors.length) {
            reject(new Error('An unexpected problem occured while generating the random passphrase'));
        } else {
            // resolve with the validated passphrase
            resolve(password);
        }
    });
};

mongoose.model("User", UserSchema, config.dbTablePrefix.concat("user"));
