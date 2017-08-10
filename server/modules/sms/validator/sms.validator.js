'use strict';
//
// sms.validator.js
// check the validity of ticket functions
//
// Created by vupl on 2015-12-19.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    mongoose = require("mongoose"),
    path = require('path'),
    utils = require('../../core/resources/utils'),
    enums_sms = require('../resources/enums.sms'),
    _ = require('lodash'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========
validate.validators.check_rule_sms = (value, options, key, attributes) =>{
    if(utils.isEmpty(value)){
        return null;
    }
    return validate.Promise((resolve, reject) =>{
        var short_code = /^[A-Za-z0-9]{3,20}$/;
        if (value.search(short_code) == -1) {
            return resolve(options.message);
        }
        return resolve();
    });
};

validate.validators.sms_rp_validToDate = (value, options, key, attributes) =>{
    return validate.Promise( (resolve, reject) => {
        if (!value){
            return resolve("sms.query_data.to_date.required");
        }
        if (attributes.from_date > value){
            return resolve("sms.query_data.greater_than_from_date");
        }
        return resolve();
    });
};
// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

exports.update_setting_sms = (data, next) => {
    var constraints = {
        'brand_name.name': {
            length: {
                maximum: 12,
                tooLong: "^validator.sms.brand_max_len",
                minimum : 3,
                tooShort : "^validator.sms.brand_min_len"
            },
            check_rule_sms: {
                message: "^validator.sms.brand_format"
            }
        },
        'short_code.value': {
            length: {
                maximum: 12,
                tooLong: "^validator.sms.shortcode_max_len",
                minimum : 3,
                tooShort : "^validator.sms.shortcode_min_len"
            },
            check_rule_sms: {
                message: "^validator.sms.shortcode_format"
            }
        },
        provider: {
            presence: {
                message: "^validator.sms.provider_required",
            },
            inclusion: {
                within: _.values(enums_sms.Provider),
                message: "^validator.sms.provider_inclusion"
            }
        }
    };
    var success = () => {
        next();
    }, error = (errors) => {
        next(errorHandler.validationError(errors));
    };
    validate.async(data, constraints).then(success, error);
};

exports.validate_sms_report_query_data = (data, next) => {
    var constraints = {
        from_date: {
            numericality: {
                onlyInteger: true,
                greaterThan: 0,
                lessThanOrEqualTo: 9999999999999,
                notInteger: "^voip.query_data.from_date_invalid",
                notGreaterThan: "^voip.query_data.from_date_value"
            }
        },
        to_date: {
            numericality: {
                onlyInteger: true,
                greaterThan: 0,
                lessThanOrEqualTo: 9999999999999,
                notInteger: "^voip.query_data.to_date_invalid",
                notGreaterThan: "^voip.query_data.to_date_value"
            },
            sms_rp_validToDate: {
                message: "voip.query_data.to_date_outrange"
            }
        }
    };
    var success = () => {
        next();
    }, error = (errors) => {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints).then(success, error);
};
