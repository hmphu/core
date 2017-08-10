'use strict';
//
// user.validator.js
// check the validity of user functions
//
// Created by thanhdh on 2015-07-19.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    moment = require("moment"),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    Country = mongoose.model('Country'),
    User = mongoose.model('User'),
    TimeZone = mongoose.model('TimeZone'),
    ggMap = require('../../core/resources/gg.map'),
    _ = require('lodash'),
    utils = require('../resources/utils'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

/*
 * get timezone from ggMap based on lat long
 */
var getTimeZone = (data, next) => {
    var myTimezone = (timeZoneId) => {
        TimeZone.findOne( {_id: timeZoneId}, function( err, timezone ){
            if ( err ) {
                console.error( err );
            }
            data.time_zone = {
                id: timeZoneId,
                value: timezone? timezone.value: config.timezone.value
            };
            next();
        } );
    };
    if(data.time_zone && data.time_zone.id){
        myTimezone(data.time_zone.id);
    } else {
        ggMap.getTimeZoneFromLatLong(data.lat_long, timeZoneId => {
            myTimezone(timeZoneId);
        });
    }
};

/*
 * check the existing of country code
 */
validate.validators.checkCountry = ( value, options, key, attributes ) =>{
    if ( !value ) {
        return null;
    }
    return validate.Promise( function( resolve, reject ){
        Country.findById( value, function( err, country ){
            if ( err ) {
                console.error( err );
            }
            if ( err || !country ) {
                return resolve( options.message );
            }
            return resolve();
        } );
    } );
};

/*
 * check the existing of country code
 */
validate.validators.checkCode = ( value, options, key, attributes ) =>{
    if ( !value ) {
        return null;
    }
    return validate.Promise( function( resolve, reject ){
        var contran= {
            numericality: {
                onlyInteger: true,
                greaterThan: 0
            },
        }
        var err = validate.single(value, contran);
        if(!_.isEmpty(err)){
            return resolve( options.message );
        }
        
        Country.count({code: value}, (err, count) =>{
            if (err) {
                console.error( err );
            }
            if (!count) {
                return resolve( options.message );
            }

            return resolve();
        });
    } );
};

/*
 * check the existing of subdomain
 */
validate.validators.check_subdomain = ( value, options, key, attributes ) =>{
    if ( !value ) {
        return null;
    }
    return validate.Promise( function( resolve, reject ){
        User.count( { sub_domain: value }, function( err, count ){
            if ( err ) {
                console.error( err );
            }
            if ( err || count > 0 ) {
                return resolve( options.message );
            }
            return resolve();
        } );
    } );
};

/*
 * check domain blacklist
 */
validate.validators.check_backlist = ( value, options, key, attributes ) =>{
    if ( !value ) {
        return null;
    }
    return validate.Promise( function( resolve, reject ){
        if(utils.checkDomainBlackList(value) == true){
            return resolve( options.message );
        }
        return resolve();
    } );
};


function check_black_domain(callback) {
    var black_list = require(ROOT_DIR + "/config/black_list.json").domain_black_list;
    for (var i in black_list) {
        var regex = new RegExp(black_list[i], "i");
        if (domain.search(regex) != -1){
            return callback(req.i18n.t("validator.user.subdomain_blacklist"));
        }
    }
    return callback(null);
}

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

module.exports = (data, is_add, next) => {
    var constraints = {
        name: {
            presence: {
                message: '^validator.user.name_required'
            },
            length: {
                maximum: 30,
                tooLong: '^validator.user.name_len'
            }
        },
        email: {
            presence: {
                message: "^validator.user.email_required"
            },
            length: {
                maximum: 50,
                tooLong: '^validator.user.email_len'
            },
            email: {
                message: "^validator.user.invalid_email"
            }
        },
        language: {
            presence: {
                message: "^validator.user.lang_required"
            },
            inclusion: {
                within: _.values(config.language),
                message: "^validator.user.lang_inclusion"
            }
        }
    };
    if(is_add){
        var constraints_add = {
            sub_domain: {
                presence: {
                    message: "^validator.user.subdomain_required"
                },
                length: {
                    minimum: 3,
                    tooShort: "^validator.user.subdomain_min",
                    maximum: 20,
                    tooLong: "^validator.user.subdomain_max"
                },
                format: {
                    pattern: "[a-z0-9]+",
                    flags: "i",
                    message: "^validator.user.subdomain_format"
                },
                check_subdomain: {
                    message: "^validator.user.subdomain_exist"
                },
                check_backlist: {
                    message: '^validator.user.subdomain_blacklist'
                }
            },
            password: {
                presence: {
                    message: '^validator.user.password_required'
                },
                format: {
                    pattern: "^(?=.*[A-Z])(?=.*[0-9])(?=.*[a-z]).{6,50}$",
                    message: "^validator.user.password_format"
                }
            },
            confirmed_password: {
                presence: {
                    message: '^validator.user.confirm_password_required'
                },
                equality: {
                    attribute: "password",
                    message: "^validator.user.confirm_password_match"
                }
            },
            company_name: {
                presence: {
                    message: '^validator.user.company_required'
                },
                length: {
                    maximum: 250,
                    tooLong: "^validator.user.company_name_max"
                }
            },
            country: {
                presence: {
                    message: "^validator.user.country_required"
                },
                checkCountry: {
                    message: "^validator.user.country_exist"
                }
            },
            phone: {
                presence: {
                    message: "^validator.user.phone_required"
                },
                length: {
                    maximum: 50,
                    tooLong: "^validator.user.phone_max"
                }
            },
            code: {
                presence: {
                    message: "^validator.user.user_code_required"
                },
// numericality: {
// onlyInteger: true,
// greaterThan: 0,
// notInteger: "^user.code.int",
// notGreaterThan: "^user.code.greaterThan"
// },
                checkCode: {
                    message: "^validator.user.invalid_code"
                }
            }
        };
        constraints = _.merge(constraints, constraints_add);
    }
    var success = () => {
        getTimeZone(data, next);
    }, error = (errors) => {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints).then(success, error);
};
