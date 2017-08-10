'use strict';
//
// trigger.validator.js
// check the validity of trigger functions
//
// Created by khanhpq on 2016-01-15.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var _ = require('lodash'),
    validate     = require('../../core/resources/validate'),
    path         = require('path'),
    config       = require(path.resolve('./config/config')),
    biz_util     = require('../resources/utils'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========


validate.validators.check_name_trigger = function ( value, options, key, attributes, globalOptions ) {   
    return validate.Promise(function(resolve, reject) {
        if(!value || value == ""){
            return resolve();
        }
        if(biz_util.checkNameBiz(value)){
            return resolve(options.message);
        }
        return resolve();
    });
};

validate.validators.check_conditions_trigger = function(value, options, key, attributes, globalOptions ) {
    return validate.Promise( (resolve, reject, req) => {

        if(!Array.isArray(value)){
            return resolve(options.condition_array);
        }
        
        if(Array.isArray(globalOptions.all_conditions) && Array.isArray(globalOptions.any_conditions) && globalOptions.all_conditions.length == 0 && globalOptions.any_conditions.length == 0){
            return resolve(options.condition_required);
        }

        if((globalOptions.all_conditions.length + globalOptions.any_conditions.length) > config.bizRule.maxCondition){
            return resolve(options.max_condition);
        }
        
        if(value.length > 0){
            for(var i = 0; i < value.length; i++){
                var item = value[i];
                if(item.field_key == null || item.field_key == ""){
                    return resolve(options.condition_invalid);
                }
                
                if(item.operator === null || item.operator === ""){
                    return resolve(options.condition_operator_invalid);
                }
                
            }
        }
        
        return resolve();
    });
};

validate.validators.check_actions_trigger = function(value, options, key, attributes, globalOptions ) {
    return validate.Promise( (resolve, reject, req) => {

        if(!Array.isArray(value)){
            return resolve(options.action_array);
        }

        if(value.length == 0){
            return resolve();
        }

        if(value.length > config.bizRule.maxAction){
            return resolve(options.max_action);
        }
        
        if(value.length > 0){
            for(var i = 0; i < value.length; i++){
                var item = value[i];
                if(item.field_key == null || item.field_key == ""){
                    return resolve(options.action_invalid);
                }
            }
        }
        return resolve();
    });
};

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * Vaidators trigger's body @author: khanhpq
 */
module.exports = (data, next) => {
    var constraints = {
        name: {
            presence: {
                message: "^validator.biz_rule.trigger.name_required"
            },
            length: {
                maximum: 256,
                tooLong: "^validator.biz_rule.trigger.name_max_len"
            },
            check_name_trigger: {
                message: "^validator.biz_rule.trigger.invalid_name"
            }
        },
        position: {
            presence: {
                message: "^validator.biz_rule.trigger.position_required"
            },
            numericality: {
                onlyInteger: true,
                greaterThan: -1,
                notInteger: "^validator.biz_rule.trigger.position_int",
                notGreaterThan: "^validator.biz_rule.trigger.position_max"
            }
        },
        all_conditions: {
            check_conditions_trigger: {
                condition_array: "^validator.biz_rule.trigger.must_be_array",
                condition_required: "^validator.biz_rule.trigger.condition_required",
                max_condition: "^validator.biz_rule.trigger.max_condition",
                condition_invalid: "^validator.biz_rule.trigger.conditions_invalid",
                condition_operator_invalid: "^validator.biz_rule.trigger.conditions_operator_invalid"
            }
        },
        any_conditions: {
            check_conditions_trigger: {
                condition_array: "^validator.biz_rule.trigger.must_be_array",
                condition_required: "^validator.biz_rule.trigger.condition_requires",
                max_condition: "^validator.biz_rule.trigger.max_condition",
                condition_invalid: "^validator.biz_rule.trigger.conditions_invalid",
                condition_operator_invalid: "^validator.biz_rule.trigger.conditions_operator_invalid"
            }
        },
        actions: {
            presence: {
                message: "^validator.biz_rule.trigger.action_required"
            },
            check_actions_trigger: {
                action_array: "^validator.biz_rule.trigger.must_be_array",
                max_action: "^validator.biz_rule.trigger.max_action",
                action_required: "^validator.biz_rule.trigger.action_required",
                action_invalid: "^validator.biz_rule.trigger.action_invalid"
            }
        }
    };
    
    var success = () => {
        next();
    }, error = (errors) => {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints, data).then(success, error);
};
