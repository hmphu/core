'use strict';
//
// view.user.validator.js
// check the validity of view.user functions
//
// Created by khanhpq on 2016-01-15.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate     = require('../../core/resources/validate'),
    path         = require('path'),
    enums        = require('../../core/resources/enums.res'),
    mongoose     = require('mongoose'),
    _            = require('lodash'),
    biz_util     = require('../resources/utils'),
    biz_enums    = require('../resources/enums'),
    config       = require(path.resolve('./config/config')),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

validate.validators.check_name_view_user = function ( value, options, key, attributes, globalOptions ) {
    
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

validate.validators.check_conditions_view_user = function(value, options, key, attributes, globalOptions ) {
    return validate.Promise( (resolve, reject, req) => {
        if(!Array.isArray(value)){
            return resolve(options.condition_array);
        }

        if(Array.isArray(globalOptions.all_conditions) && Array.isArray(globalOptions.any_conditions) && globalOptions.all_conditions.length == 0 && globalOptions.any_conditions.length == 0){
            return resolve(options.condition_required);
        }

        if(globalOptions.all_conditions.length + globalOptions.any_conditions.length > config.bizRule.maxCondition){
            return resolve(options.max_condition);
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

validate.validators.check_availability_user = function(value, options, key, attributes, globalOptions) {
    return validate.Promise( (resolve, reject, req) => {
        if(globalOptions.availability == enums.Availability.Group){
            
            if(!globalOptions.group_id){
                return resolve(options.group);
            }else{
                mongoose.model('Group').findById(globalOptions.group_id, (err, group) => {
                    if (err || !group || !_.isEqual(group.ed_user_id.toString(), globalOptions.ed_user_id.toString())){
                        return resolve(options.not_exist);
                    }
                    return resolve();
                });
            } 
        }else{
            if(globalOptions.group_id){
                return resolve(options.not_contain_group);
            }
            return resolve();
        }
        
    });    
};
 
// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * Vaidators view.user's body @author: khanhpq
 */
module.exports = (data, next) => {
    var constraints = {
        name: {
            presence: {
                message: "^validator.biz_rule.user_view.name_required"
            },
            length: {
                maximum: 256,
                tooLong: "^validator.biz_rule.user_view.name_max_len"
            },
            check_name_view_user: {
                message: "^validator.biz_rule.user_view.invalid_name"
            }
        },
        position: {
            presence: {
                message: "^validator.biz_rule.user_view.position_required"
            },
            numericality: {
                onlyInteger: true,
                greaterThan: -1,
                notInteger: "^validator.biz_rule.user_view.position_int",
                notGreaterThan: "^validator.biz_rule.user_view.position_max"
            }
        },
        all_conditions: {
            check_conditions_view_user: {
                condition_array: "^validator.biz_rule.user_view.must_be_array",
                condition_required: "^validator.biz_rule.user_view.condition_required",
                max_condition: "^validator.biz_rule.user_view.position_max"
            }
        },
        any_conditions: {
            check_conditions_view_user: {
                condition_array: "^validator.biz_rule.user_view.must_be_array",
                condition_required: "^validator.biz_rule.user_view.condition_required",
                max_condition: "^validator.biz_rule.user_view.position_max"
            }
        },
        availability: {
            presence: {
                message: "^validator.biz_rule.user_view.availability_required",
            },
            inclusion: {
                within: _.values(enums.Availability),
                message: "^validator.biz_rule.user_view.invalid_availability"
            },
            check_availability_user: {
                group: "^validator.biz_rule.user_view.group_required",
                not_contain_group: "^validator.biz_rule.user_view.no_group",
                not_exist: "^validator.biz_rule.user_view.no_group"
            }
        },
        order_by: {
             presence: {
                message: "^validator.biz_rule.user_view.order_required",
            },
            inclusion: {
                within: _.values(biz_enums.ViewOrderBy),
                message: "^validator.biz_rule.user_view.order_inclusion"
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
