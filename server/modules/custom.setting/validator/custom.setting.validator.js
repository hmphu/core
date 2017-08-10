'use strict';
//
// custom_setting.validator.js
// check the validity of custom_setting functions
//
// Created by khanhpq on 2015-07-19.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var _ = require('lodash'),
    validate = require('../../core/resources/validate'),
    path = require('path'),
    cs_enums = require('../resources/enums.res'),
    enums = require('../../core/resources/enums.res'),
    mongoose = require('mongoose'),
    provider_index = require('../providers/index.provider'),
    provider_type = require('../providers/type.provider'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

validate.validators.checkName = function ( value, options, key, attributes, globalOptions ) {
    if(!value){
        return null;
    }
    return validate.Promise(function(resolve, reject) {
        var regex = /^[a-z0-9A-Z_\- ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂưăạảấầẩẫậắằẳẵặẹẻẽếềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹý]+$/;

        if(!regex.test(value)){
            return resolve(options.message);
        }
        resolve();
    });
};

validate.validators.checkFieldKey = function ( value, options, key, attributes, globalOptions ) {
    if(!value){
        return null;
    }
    return validate.Promise(function(resolve, reject) {
        var regex = /^[a-z0-9A-Z_]+$/;
        if(!regex.test(value)){
            return resolve(options.message);
        }
        return resolve();
    });
};

validate.validators.checkProviderData = function ( value, options, key, attributes, globalOptions ) {
    return validate.Promise(function(resolve, reject) {

        if(globalOptions.provider == cs_enums.Provider.ticket){

            if(!value){
                return resolve();
            }
         
            if(value.group_id && value.agent_id){
                return resolve(options.group_or_agent_only);
            }

            if(value.group_id){
                if (!mongoose.Types.ObjectId.isValid(value.group_id)) {
                    return resolve(options.not_is_object);
                }

                mongoose.model('Group').findById(value.group_id).exec((err, group) => {
                    if (err){
                        console.error(err, `checkProviderData: failed to find group by id ${value.group_id}`);
                        return resolve(options.group_not_found);
                    }
                    if (!group || !_.isEqual(group.ed_user_id.toString(), globalOptions.ed_user_id.toString())) {
                        return resolve(options.group_not_found);
                    }
                    return resolve();
                });
            }else if(value.agent_id){
                if (!mongoose.Types.ObjectId.isValid(value.agent_id)) {
                    return resolve(options.not_is_object);
                }
                mongoose.model('User').findById(value.agent_id).exec((err, user) => {
                    if (err){
                        console.error(err, `checkProviderData: failed to find user by id ${value.agent_id}`);
                        return resolve(err);
                    }
                    if(!user || user.is_requester == true || !_.isEqual(user.ed_parent_id || user._id, globalOptions.ed_user_id)){
                        return resolve(options.agent_not_found);
                    }
                    return resolve();
                });
            }else{
                return resolve();
            }
            
        }else if(globalOptions.provider == cs_enums.Provider.org){
            return resolve();
        }else{
            return resolve();
        }
    });
};

validate.validators.checkTypeData = function ( value, options, key, attributes, globalOptions ) {

    return validate.Promise(function(resolve, reject) {
        var data = value;
        
        switch (globalOptions.cs_type){
            case cs_enums.CustomFieldType.dropdown:
                
                if(!_.isBoolean(data.is_multi_choice)){
                    return resolve(options.dropdown.value_invalid);
                }
                
                if(!data.values){
                    return resolve(options.dropdown.values_required);
                }
                
                if(!Array.isArray(data.values)){
                    return resolve(options.dropdown.values_is_array);
                }
    
                for(var i = 0; i < data.values.length; i++){
                    var item = data.values[i];
                    if(_(item.text).trim() == '' || _(item.value).trim() == '' ||  item.value == null || item.text == null || item.value == undefined || item.text == undefined){
                        return resolve(options.dropdown.value_invalid);
                    }
                    
                    var count = _.countBy(data.values, function(o) { return o.value == item.value || o.text == item.text; });

                    if(count.true > 1){
                        return resolve(options.dropdown.value_must_different);
                    }
                }

                return resolve();
                
            case cs_enums.CustomFieldType.slider:
                if(!_.isNumber(data.min) || !_.isNumber(data.max)){
                    return resolve(options.slider.value_invalid);
                }
                
                if(data.min >= data.max){
                    return resolve(options.slider.max_min_invalid);
                }

                return resolve();

            case cs_enums.CustomFieldType.switch:
                /*
                if(data.value == undefined){
                    return resolve(options.switch.value_required);
                }
                
                if(!_.isBoolean(data.value)){
                    return resolve(options.switch.value_invalid);
                }
                */
                return resolve();
/*                
            case cs_enums.CustomFieldType.choice:

                if(!data.options){
                    return resolve(options.choice.values_required);
                }
                
                if(!Array.isArray(data.options)){
                    return resolve(options.choice.options_is_array);
                }
                
                if(data.options.length == 0){
                    return resolve(options.choice.values_required);
                }

                // check same value
                data.options.forEach((item) => {
                    if(_(item.text).trim() == '' || _(item.value).trim() == '' || item.value == null || item.text == null || item.value == undefined || item.text == undefined){
                        return resolve(options.choice.value_invalid);
                    }

                    var count = _.countBy(data.options, function(o) { return o.value == item.value || o.text == item.text; });
                    if(count.true > 1){
                        return resolve(options.choice.value_must_different);
                    }

                });
                
                if(!_.isBoolean(data.is_radio)){
                    return resolve(options.choice.value_invalid);
                }
                return resolve();
*/                
            case cs_enums.CustomFieldType.date:
                if(!_.isBoolean(data.is_datetime)){
                    return resolve(options.date.value_invalid);
                }
                return resolve();
                
            case cs_enums.CustomFieldType.text:
                if(!_.isBoolean(data.is_multiline) || !_.isBoolean(data.is_link) || !_.isBoolean(data.is_edittable)){
                    return resolve(options.text.value_invalid);
                }
                return resolve();
                
            case cs_enums.CustomFieldType.numeric:
                if(!_.isBoolean(data.is_decimal)){
                    return resolve(options.numeric.value_invalid);
                }
                return resolve();
            default:
                return resolve();
        };
    });
};

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * Vaidators custom_setting's body @author: khanhpq
 */

module.exports = (data, next) => {
    var constraints = {
        name: {
            presence: {
                message: "^validator.custom_setting.name_required"
            },
            length: {
                maximum: 30,
                tooLong: "^validator.custom_setting.name_max_len"
            },
            checkName: {
                message: "^validator.custom_setting.invalid_name",
            }
        },
        field_key: {
            presence: {
                message: "^validator.custom_setting.field_key_required"
            },
            length: {
                maximum: 30,
                tooLong: "^validator.custom_setting.field_key_len"
            },
            checkFieldKey: {
                message: "^validator.custom_setting.field_key_invalid",
                existed: "^validator.custom_setting.field_key_existed"
            }
        },
        description: {
            length: {
                maximum: 1000,
                tooLong: "^validator.custom_setting.desc_len"
            }
        },
        position: {
            numericality: {
                onlyInteger: true,
                greaterThan: -1,
                lessThanOrEqualTo: 9999999999999,
                notInteger: "^validator.custom_setting.position_int",
                notGreaterThan: "^validator.custom_setting.position_max",
                notLessThanOrEqualTo: "^validator.custom_setting.position_max"
            }
        },
        provider: {
            presence: {
                message: "^validator.custom_setting.provider_required"
            },
            inclusion: {
                within: _.values(cs_enums.Provider),
                message: "^validator.custom_setting.provider_inclusion"
            }
        },
        provider_data: {
            checkProviderData: {
                group_or_agent_only: "^validator.custom_setting.provider_group_or_agent_only",
                not_is_object: "^validator.custom_setting.provider_not_is_object",
                group_not_found: "^validator.custom_setting.provider_group_not_found",
                agent_not_found: "^validator.custom_setting.provider_agent_not_found"
            }
        },
        cs_type: {
            presence: {
                message: "^validator.custom_setting.type_required"
            },
            inclusion: {
                within: _.values(cs_enums.CustomFieldType),
                message: "^validator.custom_setting.type_inclusion"
            }
        },
        cs_type_data: {
            presence: {
                message: "^validator.custom_setting.type_data"
            },
            checkTypeData: {
                dropdown:{
                    values_is_array: "^validator.custom_setting.type_dd_array",
                    values_required: "^validator.custom_setting.type_dd_required",
                    value_invalid: "^validator.custom_setting.type_dd_invalid",
                    value_must_different: "^validator.custom_setting.type_dd_diff",
                    value_empty_option: "^validator.custom_setting.type_dd_empty"
                },
//                choice:{
//                    options_is_array: "^validator.custom_setting.type_choice_array",
//                    value_invalid: "^validator.custom_setting.type_choice_invalid",
//                    values_required: "^validator.custom_setting.type_choice_required",
//                    value_must_different: "^validator.custom_setting.type_choice_diff"
//                },
                slider: {
                    value_invalid: "^validator.custom_setting.type_slide_invalid",
                    max_min_invalid: "^validator.custom_setting.type_slide_maxmin"
                },
                switch: {
                    value_required: "^validator.custom_setting.type_switch_required",
                    value_invalid: "^validator.custom_setting.type_switch_invalid"
                },
                date: {
                    value_invalid: "^validator.custom_setting.type_date_invalid"
                },
                text: {
                    value_invalid: "^validator.custom_setting.type_text_invalid"
                },
                numeric: {
                    value_invalid: "^validator.custom_setting.type_numeric_invalid"
                }
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
