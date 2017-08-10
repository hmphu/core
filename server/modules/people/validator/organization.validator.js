'use strict';
//
// organization.validator.js
// check the validity of organization functions
//
// Created by khanhpq on 2016-01-06.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate        = require('../../core/resources/validate'),
    path            = require('path'),
    cs_enums        = require('../../custom.setting/resources/enums.res'),
    cs_utils        = require('../../custom.setting/resources/utils'),
    errorHandler    = require(path.resolve('./modules/core/controllers/errors.controller')),
    mongoose        = require('mongoose'),
    people_util     = require('../resources/utils'),
    _               = require('lodash');

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========
validate.validators.check_domain_format = function(value, options, key, attributes, globalOptions) {
    return validate.Promise( (resolve, reject, req) => {
        if (!Array.isArray(value)) {
            return resolve(options.is_array);
        }
        
        if (value.some(function(item) {
            return !/^[a-z0-9]+([a-z0-9]*\.){1,2}[a-z]+$/i.test(item);
        })) {
            return resolve(options.message);
        }
        
        value.forEach((org)=>{
            var count = _.countBy(value, function(o) { return o == org; });

            if(count.true > 1){
                return reject(options.must_different);
            }
        });
       
        return resolve();
    });
};

validate.validators.check_group_existed = function(value, options, key, attributes, globalOptions) {
    return validate.Promise( (resolve, reject, req) => {
        if (!value) {
            return resolve();
        }
        
        mongoose.model('Group').findById(value, (err, group) => {
            if(err){
                return resolve(err);
            }
            
            if(!group || !_.isEqual(group.ed_user_id, globalOptions.ed_user_id)) {
               return resolve(options.message);
            }
            return resolve();
        });

    });
};

validate.validators.validate_custom_setting_org = function(value, options, key, attributes, globalOptions) {
    return validate.Promise( (resolve, reject, req) => {
        cs_utils.validateCustomSetting( {
            user_id: globalOptions.user_id, 
            idOwner: globalOptions.ed_user_id, 
            provider: cs_enums.Provider.org, 
            cs_field_data: value
        }, function(err){
            if(err){
                return resolve(err);
            }
            return resolve();
        });
    }); 
};

validate.validators.check_tags = function(value, options, key, attributes, globalOptions) {
    return validate.Promise( (resolve, reject, req) => {
        if (!value) {
            return resolve();
        }        
        
        if (!Array.isArray(value)) {
            return resolve(options.is_array);
        }
        
        value.forEach((tag)=>{
            if(tag.indexOf(' ') != -1){
                return resolve(options.message);
            }
            
            var count = _.countBy(value, function(o) { return o == tag; });
                    
            if(count.true > 1){
                return resolve(options.must_different);
            }
            
        });
        return resolve();
    }); 
};

validate.validators.check_org_name = function(value, options, key, attributes, globalOptions) {
    //if (value.search(/\w+(\w?\d? ?)*/) == -1) {
    //    return options.message;
    //}
    if(value == null || value == ""){
        return null;
    }
    //var re = /[\x00-\x7F]/;    
    return validate.Promise(function(resolve, reject) {
        
        if(people_util.checkName(value)){
            return resolve(options.message);
        }
        return resolve();
    });
};


// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * Vaidators organization's body @author: khanhpq
 */
exports.validate_org = (data, next) =>{
    var constraints = {
        name: {
            length: {
                maximum: 256,
                tooLong: "^validator.people.org.max_len"
            },
            presence: {
                message: "^validator.people.org.required"
            },
            check_org_name : {
                message: "^validator.people.org.invalid" ,
            }
        },
        domains: {
            presence: {
                message: "^validator.people.org.domain_required"
            },
            check_domain_format: {
                message: "^validator.people.org.domain_invalid",
                is_array: "^validator.people.org.domain_is_array",
                must_different: "^validator.people.org.domain_diff",
                existed: "validator.people.org.domain_exist"
            }
        },
        support_group: {
            check_group_existed: {
                message: "^validator.people.org.group_not_exist"
            }
        },
// fields: {
// validate_custom_setting_org: {
// message: ""
// }
// },
        tags: {
            check_tags: {
                message: "^people.organization.tags.invalid",
                is_array: "^people.organization.tags.is_array",
                must_different: "^people.organization.tags.must_different"
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
