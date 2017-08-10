'use strict';
//
// group.validator.js
// check the validity of group functions
//
// Created by khanhpq on 2016-01-06.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate        = require('../../core/resources/validate'),
    path            = require('path'),
    _               = require('lodash'),
    people_util      = require('../resources/utils'),
    errorHandler    = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========
validate.validators.check_group_name = function ( value, options, key, attributes ) {
    
    //if (value.search(/\w+(\w?\d? ?)*/) == -1) {
    //    return options.message;
    //}
    if(value == null || value == ""){
        return null;
    }
   
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
 * Vaidators group's body @author: khanhpq
 */
module.exports = (data, next) => {
    var constraints = {
        name: {
            length: {
                maximum: 256,
                tooLong: "^validator.people.group.max_len"
            },
            presence: {
                message: "^validator.people.group.required"
            },
            check_group_name : {
                message: "^validator.people.group.invalid" ,
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
