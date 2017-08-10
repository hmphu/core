'use strict';
//
// report.validator.js
// check the validity of report functions
//
// Created by khanhpq on 2015-07-19.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    path = require('path'),
    utils = require('../../core/resources/utils'),
    moment = require('moment'),
    enums_report = require('../resources/enums'),
    _ = require('lodash'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========
var checkName = function(str){
    var regex = /^[a-z0-9A-Z_\- ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂưăạảấầẩẫậắằẳẵặẹẻẽếềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹý]+$/;
    return !regex.test(str);
}

validate.validators.check_from_date = function(value, options, key, attributes, globalOptions) {
    if(!globalOptions.is_fixed_date){
        return null;
    }
   return validate.Promise( (resolve, reject, req) => {
        if(!globalOptions.from_date){
            return resolve("^validator.report.from_date.required");
        }
       
        if(globalOptions.to_date > 0 && globalOptions.from_date > globalOptions.to_date ){
            return resolve("^validator.report.from_date.must_lessthan");
        }
        return resolve();
    });
}

validate.validators.check_to_date = function(value, options, key, attributes, globalOptions) {
    if(!globalOptions.is_fixed_date){
        return null;
    }
    return validate.Promise( (resolve, reject, req) => {
        if(!globalOptions.to_date){
            return resolve("^validator.report.to_date.required");
        }
        
        if (globalOptions.from_date > 0 && globalOptions.to_date - globalOptions.from_date > 90 * 24 * 60 * 60 * 1000) {
            return resolve("^validator.report.to_date.range_over");
        }
        return resolve();
    });
}

validate.validators.check_fixed_date = function(value, options, key, attributes, globalOptions) {
    if(!globalOptions.is_fixed_date){
        return null;
    }
    return validate.Promise( (resolve, reject, req) => {
        return resolve();
    });
};

validate.validators.check_relative_day = function(value, options, key, attributes, globalOptions) {
    if(globalOptions.is_fixed_date){
        return null;
    }

    return validate.Promise( (resolve, reject, req) => {

        if (!value){
            return resolve("^validator.report.relative_day.required");
        }

        if(!_.isInteger(value)){
            return resolve("^validator.report.relative_day.is_integer");
        }
        return resolve();
    });
};

validate.validators.check_name_report = function(value, options, key, attributes, globalOptions) {
    if(!value){
        return null;
    }
    return validate.Promise( (resolve, reject, req) => {
        if(checkName(value)){
            return resolve(options.message);
        }
        return resolve();
    });
};

validate.validators.check_data_series = (value, options, keys, attributes, globalOptions) => {
    return validate.Promise( (resolve, reject, req) => {
        if (!Array.isArray(value)) {
            return resolve("^validator.report.is_array");
        }

        if(value.length == 0){
            return resolve("^validator.report.is_empty");
        }
            
        for(var i = 0; i < value.length; i++){
             if (value[i].legend && value[i].state) {
                if(_.values(enums_report.ReportState)[value[i].state] == -1){
                    return resolve("^validator.report.data_series.state.invalid");
                }
                    
                if (checkName( value[i].legend ) ) {
                    return resolve("^validator.report.data_series.legend.invalid");
                }

                if(!Array.isArray(value[i].all_conditions) || value[i].all_conditions.length == 0){
                    return resolve("^validator.report.data_series.conditions.invalid");
                }
                 
                var count = _.countBy(value, function(o) { return o.legend == value[i].legend; });
                if(count.true > 1){
                    return resolve("^validator.report.data_series.legend_same");
                }
                 
                var count_opt_cond_all = _.countBy(value[i].all_conditions, function(o) { return o.field_key != '' && o.value != '' && o.operator == '' ; });
                if(count_opt_cond_all.true > 0){
                    return resolve("^validator.report.data_series.operator_must_not_empty");
                }
                 
             }else{
                 return resolve(options.message);
             }
        }
        return resolve();
    });
};

validate.validators.check_group_by_time = function(value, options, key, attributes, globalOptions) {
    return validate.Promise( (resolve, reject, req) => {
        if(!value){
            if(globalOptions.group_by == enums_report.GroupBy.time){
                return resolve(options.required);
            }
            return resolve();
        }

        if(enums_report.ReportGroupByTime.indexOf(value) == -1 ){
            return resolve(options.message);
        }
        return resolve();
    });
};

validate.validators.check_report_time_to = function(value, options, key, attributes, globalOptions) {
    if(!value){
        return null;
    }
    return validate.Promise( (resolve, reject, req) => {
        if(globalOptions.report_time_to < globalOptions.report_time_from){
            return resolve(options.message);
        }
        return resolve();
    });
};

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

/*
    Vaidators report's body
    @author: khanhpq
*/
                 
module.exports = (data, next) => {
    var constraints = {
        name: {
            presence: {
                message: "^validator.report.name_required"
            },
            length: {
                maximum: 100,
                tooLong: "^validator.report.name_len"
            },
            check_name_report:{
                message: "^validator.report.name_invalid"
            }
        },
        is_fixed_date: {
            presence: {
                message: "^validator.report.is_fixed_date"
            }
        },
        from_date: {
            numericality: {
                onlyInteger: true,
                lessThanOrEqualTo: +moment.utc(),
                message: "^validator.report.from_date_invalid"
            }
        },
        to_date: {
            numericality: {
                onlyInteger: true,
                greaterThan: data.from_date,
                message: "^validator.report.to_date_invalid"
            }
        },
        relative_day: {
            check_relative_day: {
                message: "^validator.report.relative_day"
            }
        },
        is_fixed_date:{
            check_fixed_date: {
                message: "^validator.report.fixed_date"
            }
        },
        from_date:{
            check_from_date: {
                message: "^validator.report.from_date"
            }
        },
        to_date:{
            check_to_date: {
                message: "^validator.report.to_date"
            }
        },
        data_series: {
            presence: {
                message: "^validator.report.data_series.required"
            },
            check_data_series: {
                message: "^validator.report.data_series"
            }
        },
        group_by: {
            presence: {
                message: "^validator.report.group_by.required"
            },
            inclusion: {
                within: _.values(enums_report.GroupBy),
                message: "^validator.report.group_by.inclusion"
            }
        },
        group_by_time: {
            check_group_by_time: {
                message: "^validator.report.group_by_time.invalid",
                required: "^validator.report.group_by_time.required"
            }
        },
        report_time_from: {
            presence: {
                message: "^validator.report.report_time_from.required"
            },
            numericality: {
                onlyInteger: true,
                greatThanOrEqualTo: 0,
                message: "^validator.report.report_time_from.invalid"
            }
        },
        report_time_to: {
            presence: {
                message: "^validator.report.report_time_to.required"
            },
            numericality: {
                onlyInteger: true,
                lessThanOrEqualTo: 23,
                message: "^validator.report.report_time_to.invalid"
            },
            check_report_time_to: {
                message: "^validator.report.report_time_to.must_great_than"
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
