'use strict';
//
// sla.validator.js
// check the validity of sla functions
//
// Created by khanhpq on 2015-07-19.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var _            = require('lodash'),
    validate = require('../../core/resources/validate'),
    moment = require("moment"),
    path = require('path'),
    biz_enums = require('../resources/enums'),
    enums = require('../../core/resources/enums.res'),
    biz_util = require('../resources/utils'),
    config       = require(path.resolve('./config/config')),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));


// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

validate.validators.check_name_sla = function ( value, options, key, attributes, globalOptions ) {
    
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

validate.validators.check_name = function ( value, options, key, attributes, globalOptions ) {

    return validate.Promise(function(resolve, reject) {
        
        if(biz_util.checkNameDc(value)){
            return resolve(options.invalid);
        }
        return resolve();
    });
};

/*
 * Validator targets @author: khanhpq
 */
validate.validators.check_targets = (value, options, keys, attributes) => {
    return validate.Promise( (resolve, reject, req) => {
        if (!Array.isArray(value)) {
            return resolve(options.is_array);
        }
        
        if(value.length == 0){
            return resolve(options.is_empty);
        }
            
        for(var i = 0; i < value.length; i++){
            var target = value[i];
            if(target.priority == null){
                return resolve(options.priority_required);
            }

            if(_.indexOf(_.values(enums.TicketPriority), target.priority) == -1){
                return resolve(options.priority_invalid);
            }

            if(target.type_hour == null || target.type_hour == undefined){
                return resolve(options.type_hour_required);
            }

            if(_.indexOf(_.values(enums.CalendarType), target.type_hour) == -1){
                return resolve(options.type_hour_invalid);
            }
            if(!target.target_details){
                return resolve(options.targets_required);
            }
            if(!Array.isArray(target.target_details)){
                return resolve(options.targets_is_array);
            }
            for(var j = 0; j < target.target_details.length; j++){
                var detail = target.target_details[j];

                if(detail.target_type == null || detail.target_type == undefined){
                    return resolve(options.target_type_required);
                }
                
                if(_.indexOf(_.values(biz_enums.SlaTargets), detail.target_type) == -1){
                    return resolve(options.target_type_invalid);
                }

                if(detail.hours == null || detail.hours == undefined){
                    return resolve(options.hours_required);
                }

                if(!Number.isInteger(detail.hours) || detail.hours < 0){
                    return resolve(options.hours_invalid);
                }

                if(detail.minutes == null || detail.minutes == undefined){
                    return resolve(options.minutes_required);
                }

                if(!Number.isInteger(detail.minutes) || detail.minutes < 0){
                    return resolve(options.minutes_invalid);
                }
                
                if(detail.seconds == null || detail.seconds == undefined){
                    return resolve(options.seconds_required);
                }

                if(!Number.isInteger(detail.seconds) || detail.seconds < 0){
                    return resolve(options.seconds_invalid);
                }
                
                if(detail.hours == 0 && detail.minutes == 0 && detail.seconds == 0){
                    return resolve(options.time_invalid);
                }
            }
        }
        return resolve();
    });
};

/*
 * Validators Conditions @author: khanhpq
 */
validate.validators.check_conditions = function(value, options, key, attributes, globalOptions ) {
    return validate.Promise( (resolve, reject, req) => {
        
        if(!Array.isArray(value)){
            return resolve(options.condition_array);
        }

        if(value.length == 0){
            return resolve();
        }
        
        if(globalOptions.all_conditions.length + globalOptions.any_conditions.length > config.bizRule.maxCondition){
            return resolve(options.max_condition);
        }
        
        if(value.length > 0){
            for(var i = 0; i < value.length; i++){
                var item = value[i];
                if(item.field_key == null || item.field_key == ""){
                    return resolve(options.condition_invalid);
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
 * Vaidators sla's body @author: khanhpq
 */
module.exports = (data, next) => {
    var constraints = {
        name: {
            presence: {
                message: "^validator.biz_rule.sla.name_required"
            },
            length: {
                maximum: 256,
                tooLong: "^validator.biz_rule.sla.name_max_len"
            },
            check_name_sla: {
                message: "^validator.biz_rule.sla.invalid_name"
            }
        },
        position: {
            presence: {
                message: "^validator.biz_rule.sla.position_required"
            },
            numericality: {
                onlyInteger: true,
                greaterThan: -1,
                notInteger: "^validator.biz_rule.sla.position_int",
                notGreaterThan: "^validator.biz_rule.sla.position_max"
            }
        },
        all_conditions: {
            check_conditions: {
                condition_array: "^validator.biz_rule.sla.must_be_array",
                condition_required: "^validator.biz_rule.sla.condition_required",
                max_condition: "^validator.biz_rule.sla.max_condition",
                condition_invalid: "^validator.biz_rule.sla.conditions_invalid"
            }
        },
        any_conditions: {
            check_conditions: {
                condition_array: "^validator.biz_rule.sla.must_be_array",
                condition_required: "^validator.biz_rule.sla.condition_required",
                max_condition: "^validator.biz_rule.sla.max_condition",
                condition_invalid: "^validator.biz_rule.sla.conditions_invalid"
            }
        },
        targets:{
            check_targets :{
                "is_array": "^validator.biz_rule.sla.is_array",
                "is_empty": "^validator.biz_rule.sla.is_empty",
                "priority_required": "^validator.biz_rule.sla.priority_required",
                "priority_invalid": "^validator.biz_rule.sla.priority_invalid",
                "type_hour_required": "^validator.biz_rule.sla.type_hour_required",
                "type_hour_invalid": "^validator.biz_rule.sla.type_hour_invalid",
                "targets_required": "^validator.biz_rule.sla.targets_required",
                "targets_is_array": "^validator.biz_rule.sla.targets_is_array",
                "target_type_required": "^validator.biz_rule.sla.target_type_required",
                "target_type_invalid": "^validator.biz_rule.sla.target_type_invalid",
                "hours_required": "^validator.biz_rule.sla.hours_required",
                "hours_invalid": "^validator.biz_rule.sla.hours_invalid",
                "minutes_required": "^validator.biz_rule.sla.minutes_required",
                "minutes_invalid": "^validator.biz_rule.sla.minutes_invalid",
                "seconds_required": "^validator.biz_rule.sla.seconds_required",
                "seconds_invalid": "^validator.biz_rule.sla.seconds_invalid",
                "time_invalid": "^validator.biz_rule.sla.time_invalid"
            }
        },
    };
    
    var success = () => {
        next();
    }, error = (errors) => {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints, data).then(success, error);
};