'use strict';
//
//  user.calendar.validator.js
//  check the validity of user calendar functions
//
//  Created by dientn on 2015-12-23.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    path = require('path'),
    _ = require('lodash'),
    moment = require("moment"),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));


//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

exports.validateCalendar = (data, next) =>{
    var constraints = {
        business_hours : {
            is_array: {
                message: "^user.calendar.business_hours.data_type"
            }
        },
        holidays: {
            is_array: {
                message: "^user.calendar.holidays.data_type"
            }
        },
    };
    var success = function() {
        next();
    }, error = function(errors) {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints).then(success, error);
};


exports.validateBusinessHour = (data, next) =>{
    var constraints = {
        day_of_week : {
            presence: {
                message: "^user.calendar.business_hour.day_of_week.required"
            },
            inclusion: {
              within: [1, 2, 3, 4, 5, 6, 7],
              message: "^user.calendar.business_hour.day_of_week.out_of_range"
            }
        },
        start_time: {
            presence: {
                message: "^user.calendar.business_hour.start_date.required"
            },
            format: {
                pattern: /([01]\d|2[0-3]):([0-5]\d)/,
                message: "^user.calendar.business_hour.start_time.invalid"
            }
            
        },
        end_time: {
            presence: {
                message: "^user.calendar.business_hour.end_date.required"
            },
            format: {
                pattern: /([01]\d|2[0-3]):([0-5]\d)/,
                message: "^user.calendar.business_hour.end_time.invalid"
            }
        }
    };
    var success = function() {
        next();
    }, error = function(errors) {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints).then(success, error);
};

exports.validateHoliday = (data, next) =>{
    console.log( moment.utc().toString());
    var constraints = {
        start_date: {
            datetime: {
                earliest: moment.utc().add(-1, "day"),
                message: "^user.calendar.holiday.start_date.earliest",
                notValid: "^user.calendar.holiday.start_date.invalid",
            },
            equality:{
                attribute: "end_date",
                message: "^user.calendar.holiday.start_date.lessThan",
                comparator: (start, end) =>{
                    start = moment(start);
                    end = moment(end);
                    console.log("start", start.toISOString());
                    console.log("end", end.toISOString());
                    return start.diff(end, "day") <= 0 ;
                }
            }
        },
        end_date: {
            datetime: {
                earliest: moment.utc().add(-1, "day"),
                message: "^user.calendar.holiday.end_date.earliest",
                notValid: "^user.calendar.holiday.end_date.invalid",
            },
            equality:{
                attribute: "start_date",
                message: "^user.calendar.holiday.end_date.greaterThan",
                comparator: (end, start) =>{
                    start = moment(start);
                    end = moment(end);
                    return start.diff(end, "day") <= 0 ;
                }
            }
        }
    };
    
    if(data.isNew){
        constraints.name = {
            presence: {
                message: "^user.calendar.holiday.name.required"
            }
        };
        constraints.start_date.presence= {
            message: "^user.calendar.holiday.start_date.required"
        };
       constraints.end_date.presence = {
            message: "^user.calendar.holiday.end_date.required"
        };
    }else{
        if(!_.isUndefined(data.name)){
            constraints.name = {
                presence: {
                    message: "^user.calendar.holiday.name.required"
                }
            };
        }
        if(!_.isUndefined(data.start_date)){
            constraints.start_date.presence = {
                message: "^user.calendar.holiday.start_date.required"
            };
            constraints.end_date.presence = {
                message: "^user.calendar.holiday.end_date.required"
            };
        }
    }
    var success = function() {
        next();
    }, error = function(errors) {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints).then(success, error);
};
