'use strict';
//
//  errors.controller.js
//  handle system errors
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var mongoose = require('mongoose');

/**
 * Get unique error field name
 */
exports.getUniqueErrorMessage = (err) =>{
    // if not unique
    if(err.code != 11000 && err.code != 11001){
        return '';
    }
    try {
        var fieldName = err.errmsg.substring(err.errmsg.lastIndexOf('index') + 7, err.errmsg.lastIndexOf('_1'));
        return new Error(fieldName);
    } catch (ex) {
        return '';
    }
};

/**
 * build single error message
 */
exports.getSingleMessage = (err, placeHolder) =>{
    return {
        "single": err,
        "options": placeHolder || null
    };
}

/**
 * build mongoose the error message from error object
 */
exports.validationError = (errors) => {
    var ValidationError = mongoose.Error.ValidationError;
    var error = new ValidationError(this);
    error.code = 10000;
    error.message = errors;
    return error;
};
