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

//
// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

module.exports = (data, next) => {
    var constraints = {
        theme: {
            presence: {
                message: "^validator.rating.question_required"
            },
//            length: {
//                maximum: 256,
//                tooLong: "^validator.rating.question_max_len"
//            }
        }
    };

    var success = () => {
        next();
    }, error = (errors) => {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints, data).then(success, error);
};
