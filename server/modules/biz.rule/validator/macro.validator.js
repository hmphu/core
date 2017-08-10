'use strict';
//
// macro.validator.js
// check the validity of macro functions
//
// Created by khanhpq on 2016-01-15.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var _            = require('lodash'),
    validate     = require('../../core/resources/validate'),
    path         = require('path'),
    enums        = require('../../core/resources/enums.res'),
    mongoose     = require('mongoose'),
    biz_util     = require('../resources/utils'),
    config       = require(path.resolve('./config/config')),
    Group        = mongoose.model('Group'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

validate.validators.check_name_macro = function ( value, options, key, attributes, globalOptions ) {
    
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


validate.validators.check_availability = function(value, options, key, attributes, globalOptions) {
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

validate.validators.check_actions = function(value, options, key, attributes, globalOptions ) {
    return validate.Promise( (resolve, reject, req) => {

        if(!Array.isArray(value)){
            return resolve(options.action_array);
        }

        if(value.length == 0){
            return resolve(options.action_required);
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
 * Vaidators macro's body @author: khanhpq
 */
module.exports = (data, next) => {
    var constraints = {
        name: {
            presence: {
                message: "^validator.biz_rule.macro.name_required"
            },
            length: {
                maximum: 256,
                tooLong: "^validator.biz_rule.macro.name_max_len"
            },
            check_name_macro: {
                message: "^validator.biz_rule.macro.invalid_name"
            }
        },
        availability: {
            presence: {
                message: "^validator.biz_rule.macro.availability_required",
            },
            inclusion: {
                within: _.values(enums.Availability),
                message: "^validator.biz_rule.macro.invalid_availability"
            },
            check_availability: {
                group: "^validator.biz_rule.macro.group_required",
                not_contain_group: "^validator.biz_rule.macro.no_group",
                not_exist: "^validator.biz_rule.macro.no_group"
            }
        },
        actions: {
            presence: {
                message: "^validator.biz_rule.macro.action_required"
            },
            check_actions: {
                action_array: "^validator.biz_rule.macro.must_be_array",
                max_action: "^validator.biz_rule.macro.max_action",
                action_required: "^validator.biz_rule.macro.action_required",
                action_invalid: "^validator.biz_rule.macro.actions_invalid"
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
