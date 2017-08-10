'use strict';
//
// app.manage.validator.js
// check the validity of manage
//
// Created by dientn on 2016-03-08.
// Copyright 2016 Fireflyinnov. All rights reserved.
//

var validate        = require('../../core/resources/validate'),
    path            = require('path'),
    errorHandler    = require(path.resolve('./modules/core/controllers/errors.controller')),
    mongoose        = require('mongoose'),
    _               = require('lodash'),
    AppUser         = mongoose.model("AppUser"),
    fs_extra        = require('fs-extra'),
    fs              = require("fs"),
    mime            = require('mime'),
    marked          = require('marked'),
    check_syntax    = require('syntax-error'),
    enums           = require('../resources/enums.res'),
    utils           = require('../resources/utils');
    

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

var getTextValidate = ( parameter )=>{
    var validateParam = {};
    if(!parameter.type || parameter.type.toLowerCase() != "text"){
        return validateParam;
    }
    
    if(parameter.length){
        var length = {};
        // TODO: Check logic WRONG LEN
        if(_.isNumber(parameter.length)){
            length = {
                is: 3,
                wrongLength: "^app.manage.parameter.wrongLength"
            };
        }else if(_.isObject(parameter.length)){
            if( _.isNumber(parameter.length.minimum) ){
                length.minimum = parameter.length.minimum;
                length.tooShort = "^app.manage.parameter.tooShort";
            }

            if( _.isNumber(parameter.length.maximum) ){
                length.maximum = parameter.length.maximum;
                length.tooLong = "^app.manage.parameter.tooLong";
            }
        }
        if(!_isEmpty(_.keys(length))){
            validateParam["length"] = length;
        }
    }
    return validateParam;
};
    
var getNumberValidate = ( parameter )=>{
    var validateParam = {};
    if(!parameter.type || parameter.type.toLowerCase() != "number"){
        return validateParam;
    }
    
    var numberic = {
        noStrings: true,
        notValid: "^validator.not_numeric"
    };
    if(_.isObject(parameter.numberic)){
        if( _.isBoolean(parameter.numberic.onlyInteger) ){
            numberic.onlyInteger = true;
            numberic.notInteger = "^validator.not_integer";
        }

        if( _.isNumber(parameter.numberic.greaterThan) ){
            numberic.maximum = parameter.numberic.greaterThan;
            numberic.tooLong = "^app.manage.parameter.notGreaterThan";
        }

        if( _.isNumber(parameter.numberic.greaterThanOrEqualTo) ){
            numberic.maximum = parameter.numberic.notGreaterThanOrEqualTo;
            numberic.tooLong = "^app.manage.parameter.notGreaterThanOrEqualTo";
        }

        if( _.isNumber(parameter.numberic.lessThanOrEqualTo) ){
            numberic.maximum = parameter.numberic.lessThanOrEqualTo;
            numberic.tooLong = "^app.manage.parameter.notLessThanOrEqualTo";
        }

        if( _.isNumber(parameter.length.lessThan) ){
            numberic.maximum = parameter.numberic.lessThan;
            numberic.tooLong = "^app.manage.parameter.notLessThan";
        }
    }
    
    validateParam["numericality"] = numberic;
    
    return validateParam;
};
    
var getCheckboxValidate = ( parameter )=>{
    var validateParam = {};
    if(!parameter.type || parameter.type.toLowerCase() != "checkbox"){
        return validateParam;
    }
    
    validateParam["isBoolean"] =
    { 
        message: "^validator.not_boolean"
    };
    
    return validateParam;
};

var getUrlValidate = ( parameter )=>{
    var validateParam = {};
    if(!parameter.type || parameter.type.toLowerCase() != "url"){
        return validateParam;
    }
    
    validateParam["url"] = {
        message: "^validator.not_url",
        schemes:["http", "https"]
    };
    
    return validateParam;
};

var getParameterValidate = ( parameter )=>{
    var paramValidate = {};
    
    switch(parameter.type){
        case "text":
            paramValidate = getTextValidate(parameter) || {};
            break;
        case "number":
            paramValidate = getNumberValidate(parameter) || {};
            break;
        case "checkbox":
            paramValidate = getCheckboxValidate(parameter) || {};
            break;
        case "url":
            paramValidate = getUrlValidate(parameter) || {};
            break;
    }
    
    if(parameter.required){
        paramValidate.presence = {
            message: "^validator.required_field"
        }
    }
    
    return paramValidate;
};

/*
 * check is exists plan @author: dientn
 */
validate.validators.checkAppPermission = (value, options, key, attributes) =>{
    if(_.isUndefined(value)){
        return null;
    }
    return validate.Promise( function( resolve, reject ){
        if(!_.isArray(value)){
            return resolve(options.message);
        }
        var permission = ['owner','admin','agent'];
        var is_valid = true;
        for(var i= 0; i< value.length; i++){
            if(permission.indexOf(value[i]) == -1){
                is_valid = false;
                break;
            }
        }
        if(!is_valid){
            return resolve(options.message);
        }
        resolve();
    } );
};

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * Vaidators ... @author: dientn
 */
exports.uploadIsValid = (data, next) => {
    if (!data.upload_file) {
        return next(new TypeError("validator.manage_app.upload_file"));
    }
    
    if (!data.app_name) {
        return next(new TypeError("validator.manage_app.app_name"));
    }

    var app_name = data.app_name;
    
    AppUser.findOne({
        app_name : data.app_name,
        ed_user_id : data.parrent_id
    }, (err, result) => {
        if (err) {
            return next(err);
        }

        if (result) {
            return next(new TypeError("validator.manage_app.app_name_exist"));
        }
        
        next();
    });
};

// check valid zip app content
exports.zipFileIsValid = ( data ) =>{
    return new Promise( (resolve, reject)=>{
        var entries = data.entries,
            app_name = data.app_name,
            require_entries = data.require_entries;
        
        if(!data.entries){
            console.error(new TypeError("apps.manage.zip_app_not_valid"));
            return reject("validator.manage_app.zip_invalid");
        }
        var entryKeys = _.keys(entries);
        if(_.isEmpty(entryKeys) || !_.startsWith(entryKeys[0], `${app_name}/`)){
            return reject("validator.manage_app.zip_invalid");
        }
        
        // check files or directory require
        var intersec = _.intersection(entryKeys, require_entries);
        if(_.isEmpty(intersec)){
           return reject("validator.manage_app.zip_invalid");
        }
        
        console.log("Upload app: complete zip content file");
        resolve( data );
    });
};

// check type & syntax of files
exports.isValidFiles = (data) => {
    return new Promise((resolve, reject) => {
        var errors = {};
        var entries = data.entries;
        var app_name = data.app_name;
        var unzipPath = data.unzip_path;
        
        var files_check = {};
        
        files_check[`${app_name}/manifest.json`] = 'application/json';
        files_check[`${app_name}/app.css`] = "text/css";
        files_check[`${app_name}/app.js`] = 'application/json';
        files_check[`${app_name}/language.json`] = 'application/json';
        files_check[`${app_name}/templates/layout.html`] = 'text/html';
        files_check[`${app_name}/templates/js_layout.html`] = 'text/html';
        
        _.forEach(files_check, (value, key) => {
            if (entries[key]) {
                var path_file = key.replace(new RegExp(`^${app_name}`), unzipPath);
                var file_type = mime.lookup(path_file);
                
                if (file_type === value) {
                    if (value === 'application/javascript') {
                        var app_js = fs_extra.readFileSync(path_file, 'utf8');
                        
                        if (check_syntax(app_js)) {
                            errors[value] = [
                                "validator.manage_app.invalid_js"
                            ];
                        }
                    }
                    
                    if (value === "application/json") {
                        var obj = fs_extra.readJsonSync(path_file, {throws: false});
                        
                        if (!obj) {
                            errors[value] = ["validator.manage_app.invalid_json"];
                        }
                    }
                }  
            }
        });
        
        if (!_.isEmpty(_.toArray(errors))) {
            return reject(JSON.stringify(errors));
        }
        
        console.log("Upload app: complete check valid file");
        resolve( data );
    });
};

// check assets folder
exports.isValidAssets = ( data ) =>{
    return new Promise((resolve, reject)=>{
        var errors = {},
            entries = data.entries,
            app_name = data.app_name,
            unzipPath = data.unzip_path;
        
        var types_image = ["image/jpeg", "image/gif", "image/png"];
        _.forEach(entries, ( value, key)=>{
            if( !value.isDirectory && _.startsWith(key,`${app_name}/assets/`)){

                var path_file = key.replace(new RegExp(`^${app_name}`), unzipPath);
                var file_type = mime.lookup(path_file);

                if(types_image.indexOf(file_type) == -1){
                   errors[key] = "validator.manage_app.invalid_pic";
                }
            }
        });

        if(!_.isEmpty(_.toArray(errors))){
            return reject(JSON.stringify(errors));
        }
        console.log("Upload app: complete check assets folder");
        resolve( data );
    });
};

// check manifest
exports.isValidManifest = ( data ) =>{
    return new Promise((resolve, reject)=>{
        var errors = {},
            unzipPath = data.unzip_path,
            app_name = data.app_name;
        errors[`${app_name}/manifest.json`] = "validator.manage_app.invalid_json";
        var path_file = `${unzipPath}/manifest.json`;
        var manifest =fs_extra.readJsonSync( path_file, {throws: false});
        
        if(!manifest){
            return reject(errors);
        }
        // check name
        if (typeof manifest.name == "undefined" || manifest.name.trim() == "") {
            return reject(errors);
        }

        // check author name
        if (typeof manifest.author == "undefined" || typeof manifest.author.name == "undefined"){
            return reject(errors);
        }
        
        // check private
        if ( _.isEmpty(manifest.version) ) {
            return reject(errors);
        }
        // check private
        if (typeof manifest.private != "boolean") {
            return reject(errors);
        }
        
        // check types parameters if exist
        if (typeof manifest.parameters != "undefined") {
            if ( _.isArray(manifest.parameters) ) {
                var valid_manifest = true;
                for (var i in manifest.parameters) {
                    var parameter = manifest.parameters[i];
                    if ( !_.isObject(parameter) ) {
                        valid_manifest = false;
                        break;
                    }

                    var keys_parameter = _.keys(parameter),
                        keys_valid = ["name", "type", "required", "default", "value", "encode", "is_only_server", "length", "numberic"];
                    
                    if(! _.isEmpty( _.difference(keys_parameter, keys_valid) ) ){
                        valid_manifest = false;
                        break;
                    }
                }
                if(!valid_manifest){
                    return reject( JSON.stringify(errors));
                }
             } else {
                return reject(errors);
            }
        }

        // check location
        if (!_.isString(manifest.location) && !_.isArray(manifest.location) ) {
            return reject(errors);
        }

        var enum_locations = enums.locations;

        if ( _.isString(manifest.location) ) {
            if (!enum_locations[manifest.location]) {
                return reject();
            }
        } 
        if(_.isArray(manifest.location)){
            var valid_manifest = true;
            for (var i in manifest.location) {
                if (!enum_locations[manifest.location[i]]) {
                    valid_manifest = false;
                    break;
                }
            }
            if(!valid_manifest){
                return reject(errors);
            }
        }
        
        console.log("Upload app: complete check manifest file");
        data.manifest = manifest;
        resolve( data );
    });
};

exports.validateEdit = ( data, next )=>{
    var path_manifest = data.path_manifest,
        parameters = data.parameters || {};
    
    var manifest = utils.readManifest( path_manifest );
    if( !manifest ){
        return next(new TypeError("app.manage.edit.manifest_not_found"));
    }

    if(_.isEmpty(manifest.parameters)){
        return next();
    }
    
    var constraints= {};
    
    if(!_.isEmpty(_.keys(parameters)) ){
        _.forEach(manifest.parameters, (parameter)=>{
            var keys = _.keys(parameter);
            var index = _.findIndex(manifest.parameters, [ keys[0], parameter[keys[0]] ])
            if( !_.isUndefined(parameters[parameter.name]) && index != -1 && parameter.type != "hidden" && parameter.type != "readonly"){
                var paramValidate = getParameterValidate(parameter);
                if(!_.isEmpty(_.keys(paramValidate))){
                    constraints[parameter.name] = paramValidate;
                }
            }
        });
    }
    
    if(!_.isUndefined(data.role_check) && data.role_check){
        parameters["role_restrictions"] = data.role_restrictions;
        constraints["role_restrictions"] = {
            presence : {
                message: "^validator.manage_app.role_required"
            },
            checkAppPermission:{
                message: "^validator.manage_app.role_invalid"
            }
        };
    }
    
    if(!_.isUndefined(data.title)){
        parameters["title"] = data.title;
       
        constraints["title"] = {
            presence : {
                message: "^validator.manage_app.app_title"
            }
        };
    }
    var success = () => {
        next();
    }, error = (errors) => {
        next(errorHandler.validationError(errors));
    };
    if(_.isEmpty(_.keys(constraints))){
         return next();
    }
    validate.async(parameters, constraints, data).then(success, error);
    
}
