'use strict';
//
// user.branding.validator.js
// check the validity of user branding functions
//
// Created by dientn on 2015-12-23.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    path = require('path'),
    userUtils = require('../../user/resources/utils'),
    mongoose = require('mongoose'),
    UserBranding = mongoose.model('UserBranding'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========
/*
 * check domain blacklist
 */
validate.validators.check_backlist = ( value, options, key, attributes ) =>{
    if ( !value ) {
        return null;
    }
    return validate.Promise( function( resolve, reject ){
        if(userUtils.checkDomainBlackList(value) == true){
            return resolve( options.message );
        }
        return resolve();
    } );
};

validate.validators.checkExistsDomain = ( value, options, key, attributes, glogbalOpts) =>{
    if ( !value ) {
        return null;
    }
    return validate.Promise( function( resolve, reject ){
        if(userUtils.checkDomainBlackList(value) == true){
            return resolve( options.message );
        }
        
        var query = {
            sub_domain: value,
            ed_user_id: { $ne: glogbalOpts.parrent_id }
        };
        UserBranding.findOne(query, (err, result)=>{
            if(err || result){
                return resolve( options.message );
            }
            
            return resolve();
        });
        
    } );
};

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

exports.validateUpdate = function(data, next) {
    var constraints = {
        color: {
            format: {
                pattern: '^#(([0-9a-fA-F]{2}){3}|([0-9a-fA-F]){3})$',
                message: "^validator.user_settings.branding.invalid_color"
            }
        },
        host_mapping: {
            is_valid_domain: {
                message: "^validator.user_settings.branding.invalid_host_mapping"
            }
        },
        keyword_black_list: {
            is_array: {
                message: "^validator.user_settings.branding.keyword_blacklist"
            }
        },
        is_auto_org: {
            isBoolean: {
                message: "^validator.user_settings.branding.invalid_auto_org"
            }
        }
    };
    var success = function() {
        next();
    }, error = function(errors) {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints).then(success, error);
};

exports.validateSubdomain = (data, next)=>{
    var constraints = {
        sub_domain: {
            presence: {
                message: "^validator.user_settings.branding.sub_domain_required"
            },
            check_valid_subdomain:{
                message: "^validator.user_settings.branding.sub_domain_invalid"
            },
            check_backlist: {
                message: '^validator.user_settings.branding.sub_domain_blacklist'
            },
            checkExistsDomain: {
                message: '^validator.user_settings.branding.sub_domain_exists'
            }
        }
    };
    var success = function() {
        next();
    }, error = function(errors) {
        next(errorHandler.validationError(errors));
    };
    validate.async(data, constraints, data).then(success, error);
}
