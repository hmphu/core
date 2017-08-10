'use strict';
//
// user.agent.validator.js
// check the validity of user agent functions
//
// Created by dientn on 2015-12-23.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'), path = require('path'), errorHandler = require(path
        .resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

module.exports = function(data, next) {
    var constraints = {
        signature : {
            length : {
                maximum : 255,
                message : "^validator.user_settings.agent.signature_len"
            }
        },
        is_delete_ticket : {
            isBoolean : {
                message : "^validator.user_settings.agent.can_delete_ticket"
            }
        },
        email_forwarding : {
            isBoolean : {
                message : "^validator.user_settings.agent.forward_email"
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
