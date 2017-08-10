'use strict';
//
// group.user.validator.js
// check the validity of group.user functions
//
// Created by khanhpq on 2016-01-06.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate        = require('../../core/resources/validate'),
    mongoose        = require('mongoose'),
    path            = require('path'),
    peolpe_enums    = require('../resources/enums.res'),
    enums           = require('../../core/resources/enums.res'),
    _               = require('lodash'),
    errorHandler    = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========
validate.validators.check_exist_group = function(value, options, key, attributes, globalOptions) {
    return validate.Promise( (resolve, reject, req) => {

        if (!mongoose.Types.ObjectId.isValid(value.toString())) {
            return resolve(options.objectId);
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

validate.validators.check_exist_user = function(value, options, key, attributes, globalOptions) {
    return validate.Promise( (resolve, reject, req) => {
        
        if (!mongoose.Types.ObjectId.isValid(value.toString())) {
            return resolve(options.objectId);
        }
        
        mongoose.model('User').findById(value, (err, user) => {
            if(err){
                return resolve(err);
            }
            if(!user || !_.isEqual(user.ed_parent_id || user._id, globalOptions.ed_user_id)) {
               return resolve(options.message);
            }

            if(user.is_requester){
                return resolve(options.role);
            }
            return resolve();
        });
        
    });
};

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * Vaidators group.user's body @author: khanhpq
 */
module.exports = (data, next) => {
    var constraints = {
        group_id: {
            presence: {
                message: "^validator.people.group_user.group_id"
            },
            check_exist_group: {
                message: "^validator.people.group_user.exist_group",
                objectId: "^validator.people.group_user.user_id"
            }
        },
        user_id: {
            presence: {
                message: "^validator.people.group_user.user_id"
            },
            check_exist_user: {
                message: "^validator.people.group_user.user_id_not_exist",
                role: "^validator.people.group_user.role_invalid",
                objectId: "^validator.people.group_user.user_id"
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
