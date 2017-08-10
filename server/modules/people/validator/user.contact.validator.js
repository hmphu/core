'use strict';
//
// requester.contact.validator.js
// check the validity of requester.contact functions
//
// Created by khanhpq on 2016-01-06.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate        = require('../../core/resources/validate'),
    mongoose        = require('mongoose'),  
    path            = require('path'),
    peolpe_enums    = require('../resources/enums.res'),
    _               = require('lodash'),
    errorHandler    = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========
validate.validators.check_value_contact = function(value, options, key, attributes, globalOptions) {
    if(!value){
        return null;
    }
    return validate.Promise( (resolve, reject, req) => {
        
        if(globalOptions.type === peolpe_enums.UserContactType.email){
            var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

            if(!re.test(value)){
                return resolve(options.email_invalid);
            }
            
            return resolve();
        } else if(globalOptions.type === peolpe_enums.UserContactType.extension){
            
            if(value.length > 10){
                return resolve(options.extension_to_long);
            }

            if (value.search(/^[0-9]{1,10}$/) != 0){
                return resolve(options.extension_invalid);
            }
            
            if(globalOptions.is_requester){
                return resolve(options.extension_not_requester);
            }

            // check exist type: extension
            mongoose.model('UserContact').find({
                type: peolpe_enums.UserContactType.extension,
                ed_user_id: globalOptions.ed_user_id,
                value: globalOptions.value
            }).exec((err, result) => {
                if (err) {
                    return resolve(err);
                }

                if(!result || result.length == 0){
                    return resolve();
                }else{
                    if(result[0].user_id == globalOptions.user_id && result[0].add_time){
                        return resolve();
                    }else{
                        return resolve(options.extension_exist);
                    }
                }
            });
        } else if(globalOptions.type === peolpe_enums.UserContactType.phone){
            if(value.length > 50){
                return resolve(options.phone_to_long);
            }
            if(value.indexOf(')') + 1 >= value.length){
                return resolve(options.phone_required);
            }
            return resolve();
            
        }else{
            return resolve();
        }
    });
};

validate.validators.check_user_id = function(value, options, key, attributes, globalOptions) {
    return validate.Promise( (resolve, reject, req) => {
        
        if (!mongoose.Types.ObjectId.isValid(value.toString())) {
            return resolve(options.objectId);
        }

        mongoose.model('User').findById(value, (err, user) => {
            if(err){
                return resolve(err);
            }
            if(!user || !_.isEqual(user.ed_parent_id || user._id, globalOptions.ed_user_id)) {
               return resolve(options.not_exist);
            }
            
            if(user.is_suspended){
                return resolve(options.suspended);
                
            }
            return resolve();
        });
        
    });
};

validate.validators.check_value_contact_update = function(value, options, key, attributes, globalOptions) {
    if(globalOptions.type === peolpe_enums.UserContactType.extension){
        return options.message;
    }
    return null;
};

validate.validators.check_type_contact_update = function(value, options, key, attributes, globalOptions) {
    if(!value){
        return null;
    }
    return validate.Promise( (resolve, reject, req) => {
        
        if(globalOptions.type === peolpe_enums.UserContactType.email){
            var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

            if(!re.test(value)){
                return resolve(options.email_invalid);
            }
            
            return resolve();
        } else if(globalOptions.type === peolpe_enums.UserContactType.phone){
            if(value.length > 50){
                return resolve(options.phone_to_long);
            }
            return resolve();
            
        }else{
            return resolve();
        }
    });
};

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * Vaidators requester.contact's body @author: khanhpq
 */
exports.validate_add = (data, next) => {
    var constraints = {
        user_id: {
            presence: {
                message: "^validator.people.contact.user_id_required"
            },
            check_user_id: {
                not_exist: "^validator.people.contact.user_id_not_exist",
                suspended: "^validator.people.contact.user_suspended"
            }
        },
        type: {
            presence: {
                message: "^validator.people.contact.type_invalid"
            },
            inclusion: {
                within: _.values(peolpe_enums.UserContactType),
                message: "^validator.people.contact.type_inclusion"
            },
            exclusion:{
                within: _.values([peolpe_enums.UserContactType.chat]),
                message: "^validator.people.contact.type_exclusion"
            }
        },
        value: {
            presence: {
                message: "^validator.people.contact.value_required"
            },
            check_value_contact: {
                message: "^validator.people.contact.value_invalid",
                email_invalid: "^validator.people.contact.email_invalid",
                phone_to_long: "^validator.people.contact.phone_len",
                phone_required: "^validator.people.contact.phone_required",
                extension_invalid: "^validator.people.contact.ext_invalid",
                extension_exist: "^validator.people.contact.ext_exist",
                extension_to_long: "^validator.people.contact.ext_len",
                extension_not_requester: "^validator.people.contact.ext_not_requester"
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


exports.validate_update = (data, next) => {
    var constraints = {
        type: {
            check_type_contact_update: {
                message: "^validator.people.contact.ext_invalid"
            }
        },
        value: {
            presence: {
                message: "^validator.people.contact.value_required"
            },
//            check_value_contact_update: {
//                message: "^validator.people.contact.value_invalid",
//                email_invalid: "^validator.people.contact.email_invalid",
//                phone_to_long: "^validator.people.contact.phone_len",
//                extension_invalid: "^validator.people.contact.ext_invalid",
//                extension_exist: "^validator.people.contact.ext_exist",
//                extension_to_long: "^validator.people.contact.ext_len",
//                extension_not_requester: "^validator.people.contact.ext_not_requester"
//            }
            check_value_contact: {
                message: "^validator.people.contact.value_invalid",
                email_invalid: "^validator.people.contact.email_invalid",
                phone_to_long: "^validator.people.contact.phone_len",
                phone_required: "^validator.people.contact.phone_required",
                extension_invalid: "^validator.people.contact.ext_invalid",
                extension_exist: "^validator.people.contact.ext_exist",
                extension_to_long: "^validator.people.contact.ext_len",
                extension_not_requester: "^validator.people.contact.ext_not_requester"
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
