'use strict';
//
// requester.validator.js
// check the validity of requester functions
//
// Created by khanhpq on 2015-07-19.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    path = require('path'),
    utils = require('../../core/resources/utils'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========
validate.validators.check_filter_conditions = function(value, options, key, attributes) {
    return validate.Promise( (resolve, reject, req) => {
        if(value.length <= 0){
            return resolve("validator.requester.filter_condition_required") ;
        }
        for(var i = 0; i < value.length; i++){

            if( !value[i].field_key){
                return resolve(options.field_key_required);
            }
            if( !value[i].conditions){
                return resolve(options.conditions_required);
            }
            if( !value[i].operators){
                return resolve(options.operators_required);
            }
            if( !value[i].values){
                return resolve(options.values_required);
            }            

        }
        return resolve();
    });
};

validate.validators.check_columns = function(value, options, key, attributes) {
    return validate.Promise( (resolve, reject, req) => {
        
        if(value.length <= 0){
            return resolve(options.min) ;
        }
        
        if(value.length > 10){
            return resolve(options.max) ;
        }
        
        for(var i = 0; i < value.length; i++){
            if( typeof(value[i]) == String){
                return resolve(options.type);
            }
        }
        return resolve();
    });
};
                
validate.validators.check_group_id = function(value, options, key, attributes, globalOptions) {
    return validate.Promise( (resolve, reject, req) => {
        
        return resolve();
    });
};

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * Vaidators requester's body @author: khanhpq
 */
module.exports = (data, next) => {
    var constraints = {
        name: {
            presence: {
                message: "validator.requester.name_required"
            },
            length: {
                maximum: 256,
                tooLong: "validator.requester.name_len"
            }
        },
        position: {
            presence: {
                message: "validator.requester.position_required"
            },
            numericality: {
                onlyInteger: true,
                greaterThan: 0,
                notInteger: "validator.requester.position_int",
                notGreaterThan: "validator.requester.position_greater_than"
            }
        },
        filter_conditions: {
            presence: {
                message: "validator.requester.filter_condition_required"
            },
            check_filter_conditions: {
                message: "validator.requester.filter_condition",
                field_key_required : "validator.requester.field_key_required",
                conditions_required : "validator.requester.condition_required",
                operators_required : "validator.requester.operator_required",
                values_required : "validator.requester.value_required"
            }
        },
        group_id: {
            check_group_id: {
                message: "validator.requester.group_id"
            }
        },
        columns: {
            presence: {
                message: "validator.requester.column_required"
            },
            check_columns: {
                type: "validator.requester.column_type",
                max: "validator.requester.column_max_len",
                min: "validator.requester.column_min_len"
            }
        } 
    };
    var success = () => {
        next();
    }, error = (errors) => {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints, {group_id: data.group_id, ed_user_id: data.ed_user_id}).then(success, error);
};
