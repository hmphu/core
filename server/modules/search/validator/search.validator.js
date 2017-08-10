//'use strict';
////
////  report.validator.js
////  check the validity of report functions
////
////  Created by khanhpq on 2015-07-19.
////  Copyright 2015 Fireflyinnov. All rights reserved.
////
//
//var validate = require('../../core/resources/validate'),
//    path = require('path'),
//    utils = require('../../core/resources/utils'),
//    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));
//
////  ==========
////  = PRIVATE FUNCTIONS AREA =
////  ==========
//
//validate.validators.check_relative_day = function(value, options, key, attributes) {
//    return validate.Promise( (resolve, reject, req) => {
//        if (!value){
//            return resolve("report.to_date.required");
//        }
//        return options.message;
//    });
//};
//
//validate.validators.check_data_series = (value, options, keys, attributes) => {
//    return validate.Promise( (resolve, reject, req) => {
//        if (!Array.isArray(value)) {
//            return resolve("report.data_series.is_array");
//        }
//        
//        if(value.length == 0){
//            return resolve("report.data_series.is_empty");
//        }
//            
//        for(var i = 0; i < value.length; i++){
//             if (value[i].legend && value[i].state) {
//                 
//                var reg = /[`~,.<>;':"/[\]|{}()=_+-/!@#/$%/^/&/*?]/;
//                if (reg.test( value[i].legend ) ) {
//                    return resolve("report.data_series.data_series_name_invalid") ;
//                }
//
//                //If are there any other coniditions, need to check value
//                if (value[i].all && value[i].all.length > 0) {
//                    for (var j in value[i].all) {
//                        var con = value[i].all[j];
//                        if ((con.field_key || con.conditions)
//                            && con.operators && con.values != undefined && con.values != "") {
//                            //It's okay, so do nothing, continue to check others;
//                        } else {
//                            return resolve(options.message);
//                        }
//                    }
//                }
//             }else{
//                 return resolve(options.message);
//             }
//        }
//        return resolve();
//    });
//};
//
////  ==========
////  = PUBLIC FUNCTIONS AREA =
////  ==========
//
///*
//    Vaidators report's body
//    @author: khanhpq
//*/
//module.exports = (data, next) => {
//    var constraints = {
//        name: {
//            presence: {
//                message: "report.name.required"
//            },
//            length: {
//                maximum: 100,
//                tooLong: "report.name.max"
//            }
//        },
//        order_by: {
//            presence: {
//                message: "search.check_order_by"
//            }
//        }
//    };
//    var success = () => {
//        next();
//    }, error = (errors) => {
//        next(errorHandler.validationError(errors));
//    };
//
//    validate.async(data, constraints).then(success, error);
//};
