'use strict';

var validate = require('../../core/resources/validate'),
    path = require('path'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));
// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

/*
 * validate
 */
exports.validate = (data, next) => {
    var constraints = {
        token : {
            presence : {
                message : "^validator.user_settings.sso.token_required"
            }
        },
        login_url : {
            presence : {
                message : "^validator.user_settings.sso.login_url_required"
            },
            url : true
        },
        logout_url : {
            presence : {
                message : "^validator.user_settings.sso.logout_url_required"
            },
            url : true
        }
    };
    
    var success = () => {
        next();
    }, error = (errors) => {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints, data).then(success, error);
};
