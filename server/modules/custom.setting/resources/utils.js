'use strict'
//
//  utils.js
//
//  Created by khanhpq on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var cs_enums = require('../../custom.setting/resources/enums.res'),
    mongoose = require('mongoose'),
    _ = require('lodash');

/* check custom_setting_value
* @author: khanhpq
* data : {
*   field_key: {
*       //data
*    }
* }
*/
exports.validateCustomSetting = function( options, next ){

    var user_id = options.user_id,
        idOwner = options.idOwner,
        provider = options.provider,
        cs_field_data = options.cs_field_data || {},
        arr_field_keys = _.keysIn(cs_field_data),
        is_requester = options.is_requester,
        query = {
            ed_user_id: idOwner,
            provider: provider,
            is_active: true
        };

    if(!arr_field_keys || arr_field_keys.length == 0){
        next();
    }
    new Promise(function(resolve, reject) {
        if(provider == cs_enums.Provider.ticket){
            mongoose.model('GroupUser').find({
                ed_user_id: idOwner,
                user_id: user_id
            }).exec((err, group_users)=>{
                if (err) {
                    return reject(err);
                }

                if(!group_users || group_users.length == 0){
                    return reject("custom_setting.field_keys.validators.group_id_not_found");
                }

                var groups = [];

                group_users.forEach((item) => {
                    groups[groups.length] = item.group_id;
                });

                query["$or"] = [
                    {
                        provider_data: null
                    },{
                        "provider_data.group_id": {
                            $in: groups
                        }
                    },{
                        "provider_data.agent_id": user_id
                    }
                ];

                return resolve(query);
            });
        }else if(provider == cs_enums.Provider.user){
            query["provider_data.is_requester"] = is_requester ? true : false;
            return resolve(query);
        }else{
            return resolve(query);
        }

    }).then(function(query) {
        //check exist field_keys
        return new Promise(function(resolve, reject) {
            query["field_key"] = {
                $in: arr_field_keys
            };
            mongoose.model('CustomSetting').find(query, function (err, result) {
                if (err) {
                    return reject(err);
                }

                if (result.length != arr_field_keys.length) {
                    return reject("custom_setting.field_keys.invalid");
                }

                return resolve(result);
            });
        });
    }).then(function(custom_settings) {
        //check value each custom_setting
        return new Promise(function(resolve, reject) {
            var tasks = [];
            custom_settings.forEach((cs) => {
                var promise = new Promise((resolve_, reject_) => {
                    
                    var field_data = cs_field_data[cs.field_key];
                    
                    if(field_data == undefined || field_data == null){
                        return reject_("custom_setting.field_keys.not_found");
                    }

                    switch (cs.cs_type){
                        case cs_enums.CustomFieldType.dropdown:
                            if(cs.cs_type_data.is_multi_choice){

                                if(!Array.isArray(field_data)){
                                    return reject_("custom_setting.field_keys.dropdown.must_is_array");
                                }

                                if(field_data.length > cs.cs_type_data.values.length){
                                    return reject_("custom_setting.field_keys.dropdown.data_invalid_array_to_long");
                                }

                                field_data.forEach((item) => {
                                    var obj = _.find(cs.cs_type_data.values, { value: item});

                                    if(!obj){
                                        return reject_("custom_setting.field_keys.dropdown.value_not_found");
                                    }
                                });
                            }else{
    
                                var obj = _.find(cs.cs_type_data.values, { value: field_data});

                                if(!obj){
                                    return reject_("custom_setting.field_keys.dropdown.value_not_found");
                                }
                            }
                            return resolve_();

                        case cs_enums.CustomFieldType.slider:
                            if(cs.cs_type_data.min >= field_data &&  cs.cs_type_data.max <= field_data){
                                return reject_("custom_setting.field_keys.slider.value_invalid");
                            }

                            return resolve_();

                        case cs_enums.CustomFieldType.switch:
                            if(!_.isBoolean(field_data)){
                                return reject_("custom_setting.field_keys.switch.value_invalid");
                            }
                            return resolve_();

                        case cs_enums.CustomFieldType.choice:
                            if(cs.cs_type_data.is_radio){
                                if(!_.includes(cs.cs_type_data.options, field_data)){
                                    return reject_("custom_setting.field_keys.choice.radio.value_not_found");
                                }
                            }else{

                                if(!Array.isArray(field_data)){
                                    return reject_("custom_setting.field_keys.choice.must_is_array");
                                }

                                if(field_data.length > cs.cs_type_data.options.length){
                                    return reject_("custom_setting.field_keys.choice.data_invalid_array_to_long");
                                }

                                field_data.forEach((item) => {
                                    if(!_.includes(cs.cs_type_data.options, item)){
                                        return reject_("custom_setting.field_keys.choice.value_not_found");
                                    }
                                });
                            }
                            return resolve_();

                        case cs_enums.CustomFieldType.date:
                            if(!_.isNumber(field_data)){
                                return reject_("custom_setting.field_keys.date.value_not_is_date_time");
                            }                                
                            return resolve_();

                        case cs_enums.CustomFieldType.numeric:
                            if(!_.isNumber(field_data)){
                                return rejec_t("custom_setting.field_keys.numeric.value_not_is_date_time");
                            }  
                            return resolve_();

                        case cs_enums.CustomFieldType.text:
                            return resolve();

                        default:
                            return reject_("custom_setting.field_keys.cs_type_not_found");
                    };

                });
                tasks.push(promise);
            });

            Promise.all(tasks).then(function(result) {
                next();
            }, function(reason) {
                next(reason);
            });

        });

    }, function(reason) {
        next(reason);
    });
};
