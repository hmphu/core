'use strict';
//
//  ^user.local.validator.js
//  check the validity of user localization functions
//
//  Created by dientn on 2015-12-23.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    path = require('path'),
    mongoose = require('mongoose'),
    config = require(path.resolve('./config/config')),
    _ = require('lodash'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

module.exports = function(data, next) {
    var constraints = {
        language : {
            inclusion: {
                within: _.values(config.language),
                message: "^user.local.language.inclusion"
            }
        },
        time_format : {
            inclusion: {
                within: _.values(config.timeFormat),
                message: "^user.local.time_format.inclusion"
            }
        }
    };
    var success = function() {
        next();
    }, error = function(errors) {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints).then(success, error);
};
