'use strict';
//
// people.validator.js
// check the validity of people functions
//
// Created by khanhpq on 2016-01-06.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate        = require('../../core/resources/validate'),
    path            = require('path'),
    enums           = require('../../core/resources/enums.res'),
    cs_enums        = require('../../custom.setting/resources/enums.res'),
    cs_utils        = require('../../custom.setting/resources/utils'),
    _               = require('lodash'),
    mongoose        = require('mongoose'),
    User            = mongoose.model('User'),
    config          = require(path.resolve('./config/config')),
    userLocal       = require('../../user.setting/controllers/user.local.controller'),
    people_util     = require('../resources/utils'),
    TimeZone = mongoose.model('TimeZone'),
    ggMap = require('../../core/resources/gg.map'),
    errorHandler    = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

var getTimeZone = (data, next) => {
    var myTimezone = (timeZoneId) => {
        TimeZone.findOne( {_id: timeZoneId}, function( err, timezone ){
            if ( err ) {
                console.error( err );
            }
            data.time_zone = {
                id: timeZoneId,
                value: timezone? timezone.value: config.timezone.value
            };
            next();
        } );
    };
    if(data.time_zone && data.time_zone.id){
        myTimezone(data.time_zone.id);
    } else {
        ggMap.getTimeZoneFromLatLong(data.lat_long, timeZoneId => {
            myTimezone(timeZoneId);
        });
    }
};

validate.validators.checkLength = function(value, options, key, attributes, globalOptions) {
    return validate.Promise( (resolve, reject, req) => {  
        if (!Array.isArray(value)) {
            return resolve( options.isArray );
        }
        
        if(value.length > 1){
            return resolve(options.message);
        }
        return resolve();
    });
}

validate.validators.checkName = function ( value, options, key, attributes, globalOptions ) {
    if(value == null || value == ""){
        return null;
    }
    
    if(globalOptions.roles == enums.UserRoles.requester){
        return null;
    }
    
    //var re = /[\x00-\x7F]/;    
    return validate.Promise(function(resolve, reject) {
        if(value.length > 255){
            return resolve(options.toolong);
        }
        if(people_util.checkName(value)){
            return resolve(options.message);
        }
        return resolve();
    });
};


validate.validators.check_email = function(value, options, key, attributes, globalOptions) {  
    if(globalOptions.usePhone && globalOptions.usePhone === true){
        return null;
    }
    
    if(globalOptions.facebook){
        return null;
    }

    return validate.Promise( (resolve, reject, req) => {
        // check have both email and phone
        if(globalOptions.email && globalOptions.phone){
            return resolve(options.only_one_contact);
        }
        
        if(!globalOptions.email && !globalOptions.phone){
            return resolve(options.contact_required);
        }
        
        if(value){
            var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

            if(!re.test(value)){
                return resolve(options.format);
            }    
        }
        
        return resolve();
    });
};
                                          
validate.validators.check_phone = function(value, options, key, attributes, globalOptions) {  
    if(globalOptions.facebook){
        return null;
    }
    
    return validate.Promise((resolve, reject, req) => {
        if(value){
            if(globalOptions.roles[0] !== enums.UserRoles.requester){
                return resolve(options.is_requester);
            }

//            if (value.search(/^[0-9]{10,11}$/) != 0){
//                return resolve(options.format);
//            }

            // if body has phone number, check phone_number exist
            mongoose.model('UserContact').findOne({ed_user_id: globalOptions.ed_parent_id, value: value}, (err, contact) => {
                if (err) {
                    return resolve(err);
                }

                if(contact){
                    return resolve(options.existed);
                }

                return resolve();
            });
            
        }else{
            if(globalOptions.usePhone === true){
                return resolve(options.required);
            }else{
                return resolve();
            }
        }
    });
};

validate.validators.check_org_id = function(value, options, key, attributes, globalOptions) {  
    
    return validate.Promise((resolve, reject, req) => {
        if(value){
     
            if (!mongoose.Types.ObjectId.isValid(globalOptions.org_id.toString())) {
                return resolve(options.objectId);
            }
            
            if(!globalOptions.is_requester){
                return resolve(options.org_only_requester);
            }

            mongoose.model('Organization').findById(globalOptions.org_id, (err, org) => {
                if (err) {
                    return resolve(err);
                }

                if(!org){
                    return resolve(options.not_existed);
                }

                return resolve();
            });
            
        }else{
            return resolve();
        }
    });
};

validate.validators.check_group_id = function(value, options, key, attributes, globalOptions) {
    
    return validate.Promise((resolve, reject, req) => {
        if(value){
     
            if (!mongoose.Types.ObjectId.isValid(globalOptions.group_id)) {
                return resolve(options.objectId);
            }

            mongoose.model('Group').findById(globalOptions.group_id, (err, group) => {
                if (err) {
                    return resolve(err);
                }

                if(!group){
                    return resolve(options.not_existed);
                }

                return resolve();
            });
            
        }else{
            return resolve();
        }
    });
};

validate.validators.validate_custom_setting_user = function(value, options, key, attributes, globalOptions) {

    return validate.Promise( (resolve, reject, req) => {
        
        cs_utils.validateCustomSetting( {
            user_id: globalOptions.user_id, 
            idOwner: globalOptions.ed_user_id, 
            provider: cs_enums.Provider.user, 
            is_requester: globalOptions.roles[0] === enums.UserRoles.requester,
            cs_field_data: value
        }, function(err){
            if(err){
                return resolve(err);
            }
            return resolve();
        });
    }); 
};

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * Vaidators people's body @author: khanhpq
 */
module.exports = (data, next) => {
    var constraints = {
        name: {
            presence: {
                message: "^validator.people.user.name_required"
            },
            checkName: {
                message: "^validator.people.user.name_invalid",
                toolong: "^validator.people.user.name_len"
            }
        },
        email: {
            check_email: {
                required: "^validator.people.user.mail_required",
                contact_required: "^validator.people.user.contact_required",
                format: "^validator.people.user.mail_format",
                only_one_contact: "^validator.people.user.only_one_contact"
            }
        },
        phone:{
            check_phone: {
                required: "^validator.people.user.phone_required",
                format: "^validator.people.user.phone_format",
                existed: "^validator.people.user.phone_existed",
                is_requester: "^validator.people.user.phone_is_requester"
            }
        },
        org_id: {
            check_org_id: {
                not_existed: "^validator.people.user.org_not_existed",
                objectId: "^validator.people.user.org_id",
                org_only_requester: "^validator.people.user.org_only_requester"
            }
        },
        group_id: {
            check_group_id: {
                not_existed: "^validator.people.user.group_not_existed",
                objectId: "^validator.people.user.group_id"
            }
        },
        roles: {
            presence: {
                message: "^validator.people.user.role_required"
            },
            inclusionArray: {
                within: [enums.UserRoles.admin, enums.UserRoles.agent, enums.UserRoles.requester],
                message: "^validator.people.user.role_inclusion"
            },            
            checkLength: {
                message: "^validator.people.user.role_len",
                isArray: "^validator.people.user.role_len"
            }
        }
// fields: {
// validate_custom_setting_user: {
// }
// }
    };
    
    var success = () => {
        // get user settings from redis
        userLocal.readInternal(data.ed_parent_id, (err, result) => {
            if(err){
                console.error(err, 'user.validator.redis.error');
            }
            if(!result) {
                data.language = data.language || config.language.en;
                data.time_zone = data.time_zone || config.timezone;
                data.time_format = data.time_format || config.timeFormat.h24;
            } else {
                data.language = data.language || result.language;
                data.time_zone = data.time_zone || result.time_zone;
                data.time_format = data.time_format || result.time_format;
            }
            getTimeZone(data, next);
        });
    }, error = (errors) => {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints, data).then(success, error);
};
