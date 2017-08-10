'use strict';
//
//  user.fb.account.validator.js
//  check the validity of user Facebook personal accounts functions
//
//  Created by khanhpq on 2015-12-23.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    path = require('path'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========


//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

module.exports = function(data, next) {
    var constraints = {
        fb_id: {
            presence: {
                message: "^user.fb.account.fb_id.required"
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
