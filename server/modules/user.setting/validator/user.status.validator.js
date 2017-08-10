'use strict';
//
//  user.status.validator.js
//  check the validity of user status functions
//
//  Created by vupl on 2015-12-28.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    path = require('path'),
    _ = require('lodash'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller')),
    enums = require('../../core/resources/enums.res');

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

module.exports = (data, next) => {
    var userStatus = _.values(enums.UserStatus);
    var constraints = {
        'status.account': {
            inclusion: {
                within : userStatus,
                message: "^user.account_status.inclusion"
            }
        },
        'status.voip': {
            inclusion: {
                within : userStatus,
                message: "^user.voip_status.inclusion"
            }
        },
        'status.chat': {
            inclusion: {
                within : userStatus,
                message: "^user.chat_status.inclusion"
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
