'use strict';
//
// ^user.mail.validator.js
// check the validity of user email functions
//
// Created by dientn on 2015-12-23.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    path = require('path'),
    _ = require('lodash'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

validate.validators.checkHtmlTemplate = ( value, options, key, attributes ) =>{
    if(!value){
        return null;
    }
    return validate.Promise(( resolve, reject ) =>{
        if(!value){
            return resolve();
        }
        
        if(value.search("{{delimiter}}") == -1
           || value.search("{{content}}") == -1){
            return resolve(options.message);
        }
        
        return resolve();
    });
};

validate.validators.checkTextTemplate = ( value, options, key, attributes ) =>{
    if(!value){
        return null;
    }
    return validate.Promise(( resolve, reject ) =>{
        if(!value){
            return resolve();
        }
        
        if( value.search("{{content}}") == -1){
            return resolve(options.message);
        }
        
        return resolve();
    });
};
// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

module.exports = (data, next) =>{
    if(data.mail){
        if(!_.isUndefined(data.mail.html)) data.html = data.mail.html;
        if(!_.isUndefined(data.mail.text)) data.text = data.mail.text;
        if(!_.isUndefined(data.mail.is_using_html)) data.is_using_html =  data.mail.is_using_html;
        if(!_.isUndefined(data.mail.delimiter)) data.delimiter = data.mail.delimiter;
    }
    var constraints = {
        text : {
            length:{
                maximum : 5000,
                minimum : 11,
                tooShort : "^validator.user_settings.email.text_mail_min",
                tooLong : "^validator.user_settings.email.text_mail_max"
            },
            checkTextTemplate:{
                message: "^validator.user_settings.email.text_mail_invalid"
            }
        },
        html : {
            checkHtmlTemplate: {
                message: "^validator.user_settings.email.html_mail_invalid"
            }
        },
        delimiter: {
            length: {
                minimum: 20,
                tooShort : "^validator.user_settings.email.delimiter_min",
                maximum : 65,
                tooLong : "^validator.user_settings.email.delimiter_max"
            }
        },
        is_custom_email_reply : {
            isBoolean: {
                message: "^user.mail.is_custom_email_reply.invalid"
            }
        },
        is_email_photo : {
            isBoolean: {
                message: "^user.mail.is_email_photo.invalid"
            }
        },
        is_using_html : {
            isBoolean: {
                message: "^user.mail.is_using_html.invalid"
            }
        },
        is_dkim : {
            isBoolean: {
                message: "^user.mail.is_dkim.invalid"
            }
        }
    };
    
    if(!_.isUndefined(data.html)){
        constraints.html.presence = {
            message: "^validator.user_settings.email.html_mail_required"
        };
    }
    if(!_.isUndefined(data.text)){
        constraints.text.presence = {
            message: "^validator.user_settings.email.text_mail_required"
        };
    }
    if(!_.isUndefined(data.delimiter)){
        constraints.delimiter.presence = {
            message: "^validator.user_settings.email.delimiter_required"
        };
    }
    var success = () =>{
        next();
    }, error = (errors) =>{
        next(errorHandler.validationError(errors));
    };

    validate.async(data.mail, constraints).then(success, error);
};
