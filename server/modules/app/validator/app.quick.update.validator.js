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
    errorHandler    = require(path.resolve('./modules/core/controllers/errors.controller')),
    mongoose        = require('mongoose'),
    _               = require('lodash'),
    fs              = require('fs'),
    AppUser         = mongoose.model("AppUser");

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========


// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * Vaidators install app from marketplace @author: dientn
 */
exports.query_ticket = ( data, next ) => {
    var constraints = {
        type : {
            presence : {
                message : "^quick_update.type.required"
            }
        }
    };
    
    if (data.type == "view") {
            constraints.date_type = {
            inclusion: {
                within: ["add_time", "upd_time", "solved_date"],
                message: "^quick_update.type.invalid"
            }
        };
    }

//    if (data.from_date) {
////        constraints.date_format = {
////            presence : {
////                message : "^date_format_is_required"
////            }
////        };
//        constraints.from_date = {
//            datetime:true
//        };
//    }
//
//    if (data.to_date) {
////        constraints.date_format = {
////            presence : {
////                message : "^date_format_is_required"
////            }
////        };
//        constraints.to_date = {
//            datetime:true
////            {
////                message:'quick_update.from_date.invalid'
////            }
//        };
//    }
    var success = ( result )=>{
        return next();
    };
    var error = ( errors )=>{
        return next(errorHandler.validationError(errors));
    };
    
    validate.async(data, constraints).then(success, error);
};
