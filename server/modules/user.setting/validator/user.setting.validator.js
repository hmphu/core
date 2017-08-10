'use strict';
//
//  ^user.setting.validator.js
//  check the validity of user setting functions
//
//  Created by dientn on 2015-12-23.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    path = require('path'),
    mongoose = require('mongoose'),
    Plan = mongoose.model('Plan'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========

validate.validators.existsPlanId = (value, options, key, attributes) =>{
    if ( !value ) {
        return null;
    }
    return validate.Promise(( resolve, reject ) =>{
        Plan.findById(value, (err, plan) =>{
            if(err){
                console.error(err);
            }
            if(err || !plan){
                return resolve( options.message );
            }
            return resolve();
        });
        
    } );
};

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

module.exports = function(data, next) {
    var constraints = {
        plan_id: {
            presence: {
                message: "^user.setting.plan_id.required"
            },
            existsPlanId: {
                message: "^user.setting.plan_id.not_exists"
            }
        },
        plan_expiration: {
            presence: {
                message: "^user.setting.plan_expiration.required"
            },
            datetime: {
                notValid: "^user.setting.plan_expiration.not_valid"
            }
        },
        current_agent_no: {
            presence: {
                message: "^user.setting.current_agent_no.required"
            },
            numericality: {
                onlyInteger: true,
                greaterThanOrEqualTo: 0,
                notInteger: "^user.setting.current_agent_no.int",
                notGreaterThanOrEqualTo: "^user.setting.current_agent_no.greater_than_equal"
            }
        },
    };
    var success = function() {
        next();
    }, error = function(errors) {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints).then(success, error);
};
