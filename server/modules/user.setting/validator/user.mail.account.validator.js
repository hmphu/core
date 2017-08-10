'use strict';
//
// user.mail.account.validator.js
// check the validity of user email account functions
//
// Created by dientn on 2015-12-23.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    path = require('path'),
    _ = require("lodash"),
    mongoose = require('mongoose'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

validate.validators.checkProviderMail = ( value, options, key, attributes, globalOptions ) =>{
    return validate.Promise(( resolve, reject ) =>{
        if(!globalOptions.provider){
            return resolve();
        }

        if(globalOptions.provider == "gmail" && globalOptions.mail.indexOf('@gmail.com') === -1){
            return resolve(options.message);
        }
        return resolve();
    });
};


// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

module.exports = (data, next) =>{
    var constraints = {
        mail: {
            presence: {
                message: "^validator.user_settings.email.email_required"
            },
            email:{
                message: "^validator.user_settings.email.invalid_email"
            },
            checkProviderMail: {
                message: "^validator.user_settings.gmail.invalid_gmail"
            }
        },
        is_verified: {
            isBoolean: {
                message: "^validator.user_settings.email.is_verified_bool"
            }
        },
        is_default: {
            isBoolean: {
                message: "^validator.user_settings.email.is_default_bool"
            }
        },
        verified_date: {
            datetime:{
                message: "^validator.user_settings.email.invalid_verified_date"
            }
        },
        is_valid_spf: {
            isBoolean: {
                message: "^validator.user_settings.email.is_valid_spf"
            }
        }
    };
    var success = () =>{
        next();
    }, error = (errors) =>{
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints, data).then(success, error);
};
