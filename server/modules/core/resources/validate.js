'use strict'
//
//  validate.js
//  define validate js
//
//  Created by vupl on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require("validate.js"),
    moment = require("moment"),
    _ = require('lodash'),
    mongoose = require('mongoose');

validate.Promise = require('q').Promise;
validate.moment = moment;

// Before using it we must add the parse and format functions
validate.extend(validate.validators.datetime, {
    // The value is guaranteed not to be null or undefined but otherwise it
    // could be anything.
    parse: function (value, options) {
        return +moment.utc(value);
    },
    // Input is a unix timestamp
    format: function (value, options) {
        var format = options.dateOnly ? "YYYY-MM-DD" : "YYYY-MM-DD HH:mm:ss";
        return moment.utc(value).format(format);
    }
});

/*
*  check is objectId
*  @author: dientn
*/
validate.validators.isObjectId = (value, options, key, attributes) =>{
    if( !value ){
        return null;
    }
    return validate.Promise(function( resolve, reject ){
        // check the value is array
        if ( !mongoose.Types.ObjectId.isValid( value ) ) {
            return resolve( options.message );
        }
        return resolve();
    } );
};

/*
*  check is array
*  @author: dientn
*/
validate.validators.is_array = (value, options, key, attributes) =>{
    if(!value){
        return null;
    }
    return validate.Promise(function( resolve, reject ){
        // check the value is array
        if (!Array.isArray(value)) {
            return resolve( options.message );
        }
        return resolve();
    } );
};

/*
*  check whether array of values contains another array of values
*  @author: dientn
*/
validate.validators.isBoolean = (value, options, key, attributes) =>{
    return validate.Promise(function( resolve, reject ){
        if( _.keys(attributes).indexOf(key) == -1){
            return resolve();
        }
        // check the value is array
        if (!_.isBoolean(value)) {
            return resolve( options.message );
        }
        return resolve();
    } );
};

/*
*  check whether array of values contains another array of values
*  @author: dientn
*/
validate.validators.inclusionArray = (values, options, key, attributes) =>{
    return validate.Promise(function( resolve, reject ){
        if (!Array.isArray(values)) {
            return resolve( options.message );
        }
        var found = _.find(values, function(value){ return options.within.indexOf(value) !== -1 });
        if(found == undefined){
            return resolve(options.message);
        }
        return resolve();
    } );
};

/*
*  check valid domain
*  @author: dientn
*/
validate.validators.is_valid_domain = function( value, options, key, attributes ){
    if ( !value ) {
        return null;
    }
    return validate.Promise(function( resolve, reject ){
        if ( !validateDomain( value ) ) {
            return resolve( options.message );
        }else{
            return resolve();
        }
    } );
};

/*
*  check valid subdomain
*  @author: dientn
*/
validate.validators.check_valid_subdomain = function( value, options, key, attributes ){
    if(!value){
        return null;
    }
    return validate.Promise(function( resolve, reject ){
        var reg = /[^a-zA-Z0-9\-]/;
        if ( !value || reg.test( value ) ) {
            return resolve( options.message );
        }

        return resolve();
    } );
};


/* check domain
* @author: dientn
*/
function validateDomain ( domain ) {
    var emailReg = new RegExp( /^([A-Za-z0-9]+\.)?[A-Za-z0-9][A-Za-z0-9-]*\.[A-za-z]{2,6}$/i );
    var valid = emailReg.test( domain );

    if ( !valid ) {
        return false;
    } else {
        return true;
    }
}

module.exports = validate;
