'use strict';
//
//  user.fb.account.validator.js
//  check the validity of user Facebook page functions
//
//  Created by khanhpq on 2015-12-23.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    path = require('path'),
    fb_res = require('../../core/resources/fb'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========
validate.validators.check_page_id = function(value, options, key, attributes, globalOptions) {
    return validate.Promise( (resolve, reject, req) => {
    });
};
            

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

exports.edit = function(data, next) {

    var constraints = {
        page_id: {
            presence: {
                message: "^user.fb.page.page_id.required"
            }
        },
        name: {
            presence: {
                message: "^user.fb.page.name.required"
            }
        },
        type: {
            presence: {
                message: "^user.fb.page.type.required"
            }
        },
        access_token:  {
            presence: {
                message: "^user.fb.page.auth_token.required"
            }
        }
    };

    var success = function() {
        next();
    }, error = function(errors) {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints,data).then(success, error);
};

exports.settings = function(data, next) {

    var constraints = {
        is_auto_wall_post: {
            isBoolean: {
                message: "^user.fb.page.is_auto_wall_post.invalid"
            }
        },
        is_auto_create_ticket: {
            isBoolean: {
                message: "^user.fb.page.is_auto_create_ticket.invalid"
            }
        },
        is_auto_private_message: {
            isBoolean: {
                message: "^user.fb.page.is_auto_private_message.invalid"
            }
        }
    };

    var success = function() {
        next();
    }, error = function(errors) {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints,data).then(success, error);
};
