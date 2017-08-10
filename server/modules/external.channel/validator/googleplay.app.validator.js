'use strict';
//
// Created by khanhpq on 2016-03-01.
// Copyright 2016 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    path = require('path'),
    _ = require('lodash'),
    mongoose = require('mongoose'),
    config = require(path.resolve('./config/config')),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

validate.validators.check_service_account_key = function ( value, options, key, attributes, globalOptions ) {
    if(!value){
        return null;
    }

    return validate.Promise(function(resolve, reject) {
//        try {
//            var key = JSON.parse(value);
//
//
//        } catch (e) {
//            return resolve(options.type);
//        }
        if(!value.type || !value.project_id || !value.private_key_id || !value.private_key || !value.client_email || !value.client_id || !value.auth_uri || !value.token_uri || !value.auth_provider_x509_cert_url || !value.client_x509_cert_url){
            return resolve(options.format);
        }
        return resolve();
    });
};


//
// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * Vaidators body @author: khanhpq
 */
module.exports = (data, next) => {
    var constraints = {
        name: {
            presence: {
                message: "^validator.googleplay.app.name_required"
            },
            length: {
                maximum: 256,
                tooLong: "^validator.googleplay.app.name_max_len"
            }
        },
        app_id: {
            presence: {
                message: "^validator.googleplay.app.app_id_required"
            },
            length: {
                maximum: 256,
                tooLong: "^validator.googleplay.app.app_id_max_len"
            }
        },
        service_account_key: {
            presence: {
                message: "^validator.googleplay.app.service_account_key_required"
            },
            check_service_account_key: {
                format: "^validator.googleplay.app.service_account_key.format",
                type: "^validator.googleplay.app.service_account_key.type"
            }
        }
    };

    var success = () => {
        next();
    }, error = (errors) => {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints, data).then(success, error);
};
