'use strict';
//
// dc.validator.js
// check the validity of dc functions
//
// Created by khanhpq on 2016-03-01.
// Copyright 2016 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    dc_util = require('../resources/utils'),
    path = require('path'),
    _ = require('lodash'),
    mongoose = require('mongoose'),
    config = require(path.resolve('./config/config')),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

validate.validators.check_name = function ( value, options, key, attributes, globalOptions ) {
    if(value == null || value == ""){
        return null;
    }
    
    return validate.Promise(function(resolve, reject) {
        
        if(dc_util.checkNameDc(value)){
            return resolve(options.invalid);
        }
        return resolve();
    });
};

validate.validators.check_placeholder = function ( value, options, key, attributes, globalOptions ) {
    if(value == null || value == ""){
        return null;
    }
    return validate.Promise(function(resolve, reject) {
        var regex = /^[a-z0-9A-Z_]+$/;
        
        if(!regex.test(value)){
            return resolve(options.invalid);
        }
        
        if(/_$/.test(value) || /^_/i.test(value)){
            return resolve(options.invalid);
        }
        
        return resolve();
    });
};

//
// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * Vaidators dc's body @author: khanhpq
 */
module.exports = (data, next) => {
    var constraints = {
        name: {
            presence: {
                message: "^validator.dynamic_content.name_required"
            },
            length: {
                maximum: 256,
                tooLong: "^validator.dynamic_content.max_len"
            },
            check_name: {
                invalid: "^validator.dynamic_content.invalid_name"
            }
        },
        placeholder: {
            presence: {
                message: "^validator.dynamic_content.placeholder_required"
            },
            length: {
                maximum: 256,
                tooLong: "^validator.dynamic_content.placeholder_len"
            },
            check_placeholder: {
                invalid: "^validator.dynamic_content.placeholder_invalid"
            }
        },
        language: {
            presence: {
                message: "^validator.dynamic_content.lang_required"
            },
            inclusion: {
                within: _.values(config.language),
                message: "^validator.dynamic_content.lang_inclusion"
            }
        },
        content: {
            presence: {
                message: "^validator.dynamic_content.content_required"
            },
            length: {
                maximum: 1024,
                tooLong: "^validator.dynamic_content.content_len"
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
