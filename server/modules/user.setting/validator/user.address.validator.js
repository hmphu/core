'use strict';
//
// user.address.validator.js
// check the validity of user agent functions
//
// Created by dientn on 2015-12-23.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    path = require('path'),
    _ = require('lodash'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

validate.validators.checkAddressCode = ( value, options, key, attributes ) =>{
    return validate.Promise( function( resolve, reject ){
        if(attributes.phone && !value){
            return resolve( options.message );
        }
        return resolve();
    } );
};
// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

module.exports = (data, next) =>{
    var constraints = {
        phone: {
            length: {
                    maximum: 50,
                tooLong: "^validator.user_settings.address.phone_len"
            }
        },
        code: {
            checkAddressCode: {
                message: "^validator.user_settings.address.invalid_code"
            },
            numericality: {
                onlyInteger: true,
                greaterThan: 0,
                notInteger: "^validator.user_settings.address.code_int",
                notGreaterThan: "^validator.user_settings.address.code_value"
            },
            checkCode: {
                message: "^validator.user_settings.address.code_required"
            }
        },
        country: {
            checkCountry:{
                message: "^validator.user_settings.address.country_not_found"
            }
        }
    };
    
    if(!_.isUndefined(data.company_name)){
        constraints.company_name = {
            presence: { message: "^validator.user_settings.address.company_name_required" } 
        };
    }
    if(!_.isUndefined(data.country)){
        constraints.country = {
            presence: { message: "^validator.user_settings.address.country_required" } 
        };
    }
    var success = () =>{
        next();
    }, error = (errors) =>{
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints).then(success, error);
};
