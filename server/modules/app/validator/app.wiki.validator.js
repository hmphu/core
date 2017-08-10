'use strict';
//
// wiki.validator.js
// check the validity of organization functions
//
// Created by dientn on 2016-10-11.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate        = require('../../core/resources/validate'),
    path            = require('path'),
    errorHandler    = require(path.resolve('./modules/core/controllers/errors.controller'));


exports.addSection = ( data, next ) => {
    var constraints = {
        category_id : {
            presence : {
                message : "^wiki.cate.required"
            }
        },
        title: {
            presence : {
                message : "^wiki.title.required"
            }
        },
    };
    
    var success = ( result )=>{
        return next();
    };
    var error = ( errors )=>{
        return next(errorHandler.validationError(errors));
    };
    
    validate.async(data, constraints).then(success, error);
};

exports.addArticle = ( data, next ) => {
    var constraints = {
        section_id : {
            presence : {
                message : "^wiki.sect.required"
            }
        },
        title: {
            presence : {
                message : "^wiki.title.required"
            }
        },
        content:{
            presence : {
                message : "^wiki.content.required"
            }
        }
    };
    
    var success = ( result )=>{
        return next();
    };
    var error = ( errors )=>{
        return next(errorHandler.validationError(errors));
    };
    
    validate.async(data, constraints).then(success, error);
};