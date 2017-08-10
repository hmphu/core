'use strict';
//
// coupon.validator.js
// check the validity of user functions
//
// Created by dientn on 2015-02-01.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    mongoose = require('mongoose'),
    path = require("path"),
    Coupon = mongoose.model('Coupon'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

// TODO:

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

exports.validateCoupon = (data, next) => {
    var constraints = {
        promocode: {
            presence: {
                message: '^validator.subscription.coupon.coupon_required'
            },
        },
        terms: {
            presence: {
                message: '^validator.subscription.coupon.term_required'
            },
            numericality: {
              onlyInteger: true,
              greaterThan: 0,
              notInteger: "^validator.subscription.coupon.term_not_int",
              notGreaterThan: "^validator.subscription.coupon.term_min"
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
