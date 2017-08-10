'use strict';
//
//  voip.history validator.js
//  check the validity of ticket functions
//
//  Created by vupl on 2015-12-19.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    _ = require('lodash'),
    mongoose = require("mongoose"),
    path = require('path'),
    utils = require('../../core/resources/utils'),
    userController = require('../../people/controllers/people.user.controller'),
    userContact = require('../../people/controllers/people.user.contact.controller'),
    ticketController = require('../../ticket/controllers/ticket.controller'),
    voipController = require('../../voip/controllers/voip.controller'),
    groupUserController = require('../../people/controllers/people.group.user.controller'),
    enumsVoip = require('../resources/enums'),
    enumsContact = require('../../people/resources/enums.res'),
    enumsTicket = require('../../ticket/resources/enums'),
    enums = require('../../core/resources/enums.res'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========
validate.validators.rp_validToDate = (value, options, key, attributes) =>{
    return validate.Promise( (resolve, reject) => {
        if (!value){
            return resolve("voip.query_data.to_date.required");
        }
        if (attributes.from_date > value){
            return resolve("voip.query_data.greater_than_from_date");
        }
        return resolve();
    });
};

validate.validators.check_agent_ids = (value, options, key, attributes) => {
    if(utils.isEmpty(value)){
        return null;
    }
    return validate.Promise( (resolve, reject) => {
        if (value.length == 0){
            return resolve();
        }
        if(!Array.isArray(value)){
            return resolve("voip.query_data.agent_is_array");
        }
        _.forEach(value,(id) =>{
            if(!mongoose.Types.ObjectId.isValid(id)){
                return resolve("voip.query_data.agent_id_invalid");
            }
            return resolve();
        })
        return resolve();
    });
};

validate.validators.check_requester_ids = (value, options, key, attributes) => {
    if(utils.isEmpty(value)){
        return null;
    }
    return validate.Promise( (resolve, reject) => {
        if (value.length == 0){
            return resolve();
        }
        if(!Array.isArray(value)){
            return resolve("voip.query_data.agent_is_array");
        }
        _.forEach(value,(id) =>{
            if(!mongoose.Types.ObjectId.isValid(id)){
                return resolve("voip.query_data.agent_id_invalid");
            }
            return resolve();
        })
        return resolve();
    });
};

/*
 * Check caller to is exists
 * @author : vupl
 */
validate.validators.check_from_user_exists = (value, options, key, attributes, globalOptions) =>{
    var idOwner = utils.getParentUserId(globalOptions.user);
    if(globalOptions.data.caller.call_type == enumsVoip.VoipType.outgoing_call || globalOptions.data.caller.call_type == enumsVoip.VoipType.outgoing_missed_call){
        return validate.Promise((resolve, reject) =>{
            var query = {
                ed_user_id: idOwner,
                user_id: value,
                type: enumsContact.UserContactType.extension
            };
            userContact.findOneByQuery({query: query}, (err, result) =>{
                if(err){
                    console.error(err);
                    return resolve(options.message);
                }
                if(!result){
                    return resolve(options.message);
                }
                attributes.phone_no.from = result.value;
                return resolve();
            })
        });
    } else {
        return validate.Promise((resolve, reject) =>{
            if(!mongoose.Types.ObjectId.isValid(value)){
                return resolve(options.message);
            }
            var query = {
                ed_user_id : idOwner,
                user_id: value,
//                value: globalOptions.data.phone_no.from
            };
//            query.$or = [{
//                type: enumsContact.UserContactType.phone
//            }, {
//                type: enumsContact.UserContactType.extension
//            }];
            userContact.findByQuery({query: query}, (err, result) =>{
                if(err){
                    console.error(err);
                    return resolve(options.message);
                }
                if(!result || result.length == 0){
                    return resolve(options.message);
                }
                attributes.phone_no.from = globalOptions.data.phone_no.from;
                return resolve();
            });
        });
    }
};

/*
 * Check caller to is exists
 * @author : vupl
 */
validate.validators.check_to_user_exists = (value, options, key, attributes, globalOptions) =>{
    var idOwner = utils.getParentUserId(globalOptions.user);
    if(globalOptions.data.caller.call_type == enumsVoip.VoipType.incoming_call || globalOptions.data.caller.call_type == enumsVoip.VoipType.incoming_missed_call){
        return validate.Promise((resolve, reject) =>{
            var query = {
                ed_user_id: idOwner,
                user_id: value,
                type: enumsContact.UserContactType.extension
            };
            userContact.findOneByQuery({query: query}, (err, result) =>{
                if(err){
                    console.error(err);
                    return resolve(options.message);
                }
                if(!result){
                    return resolve(options.message);
                }
                attributes.phone_no.to = result.value;
                return resolve();
            })
        });
    } else {
        return validate.Promise((resolve, reject) =>{
            if(!mongoose.Types.ObjectId.isValid(value)){
                return resolve(options.message);
            }
            var query = {
                ed_user_id : idOwner,
                user_id: value,
//                value: globalOptions.data.phone_no.to
            };
//            query.$or = [{
//                type: enumsContact.UserContactType.phone
//            }, {
//                type: enumsContact.UserContactType.extension
//            }];
            
            userContact.findByQuery({query: query}, (err, result) =>{
                if(err){
                    console.error(err);
                    return resolve(options.message);
                }
                if(!result || result.length == 0){
                    return resolve(options.message);
                }
                attributes.phone_no.to = globalOptions.data.phone_no.to;
                return resolve();
            });
        });
    }
};

/*
 * Check ticket id is exists
 * @author : vupl
 */
validate.validators.check_ticket_id = (value, options, key, attributes, globalOptions) =>{
    if(!value){
        return null;
    }
    return validate.Promise((resolve, reject) =>{
        var idOwner = utils.getParentUserId(globalOptions.user);
        if(!mongoose.Types.ObjectId.isValid(value)){
            return resolve(options.message);
        }
        ticketController.getTicketInfo(value, (err, result) =>{
            if(err || !result){
                return resolve(options.message);
            }
            if(!_.isEqual(result.ed_user_id, idOwner)){
                return resolve(options.message);
            }
            return resolve();
        })
    });
};

/*
 * Check voip hist id is exists
 * @author : vupl
 */
validate.validators.check_voip_hist_id = (value, options, key, attributes, globalOptions) =>{
    if(!value){
        return null;
    }
    return validate.Promise((resolve, reject) =>{
        var idOwner = utils.getParentUserId(globalOptions.user);
        if(!mongoose.Types.ObjectId.isValid(value)){
            return resolve(options.message);
        }
        voipController.findById(value, (err, result) =>{
            if(err || !result){
                return resolve(options.message);
            }
            if(!_.isEqual(result.ed_user_id, idOwner)){
                return resolve(options.message);
            }
            return resolve();
        })
    });
};

/*
 * Check agent exists convert ticket to voip
 * @author: vupl
 */
validate.validators.check_agent_exists = (value, options, key, attributes, globalOptions) =>{
    return validate.Promise((resolve, reject) =>{
        if (!mongoose.Types.ObjectId.isValid(value.toString())) {
            return resolve("^ticket.agent_id.invalid");
        }
        userController.findById_internal(value, "", (err, result) =>{
            if(err){
                console.error(err);
                return resolve(options.message);
            }
            var idOwner = utils.getParentUserId(result);
            var parentId = utils.getParentUserId(globalOptions.user);
            if (!result || !_.isEqual(idOwner, parentId)) {
                return resolve(options.message);
            }
            attributes.status = enumsTicket.TicketStatus.Open;
            if(result.is_suspended == true){
                attributes.status = enumsTicket.TicketStatus.suppended;
            }
            return resolve();
        });
    });
};

/**
 * check requester exists convert ticket to voip
 * author : vupl
 */
validate.validators.check_requester_exists = (value, options, key, attributes, globalOptions) =>{
    return validate.Promise((resolve, reject) =>{
        if(!mongoose.Types.ObjectId.isValid(value.toString())){
            return resolve("^ticket.requester_id.invalid")
        }
        userController.findById_internal(value, "", (err, result) =>{
            if(err){
                console.error(err);
                return resolve(options.message);
            }
            var idOwner = utils.getParentUserId(result);
            var parentId = utils.getParentUserId(globalOptions.user);
            if (!result || !_.isEqual(idOwner, parentId)) {
                return resolve(options.message);
            }
            if(result.is_suspended == true){
                attributes.status = enumsTicket.TicketStatus.suppended;
            }
            if(result.org_id){
                attributes.organization = result.org_id;
            } else {
                attributes.organization = undefined;
            }
            return resolve();
        });
    });
};

/**
 * check from vs to is difference
 * @author: vupl
 */
validate.validators.check_from_is_equal_to = (value, options, key, attributes, globalOptions) =>{
    return validate.Promise((resolve, reject) =>{
        if(_.isEqual(value, globalOptions.data.caller.to)){
            return resolve(options.message);
        }
        return resolve();
    });
};
//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

exports.validate_history_query_data = (data, next) => {
    var call_type = _.values(enumsVoip.VoipType);
    var voip_convert_ticket = _.values(enumsVoip.VoipisTicket);
    var call_status = _.values(enumsVoip.VoipStatus);
    var constraints = {
        agent_ids: {
            check_agent_ids: {
                message: "voip.query_data.agent_not_exists"
            }
        },
        requester_ids: {
            check_requester_ids: {
                message: "voip.query_data.agent_not_exists"
            }
        },
        from_date: {
            numericality: {
                onlyInteger: true,
                greaterThan: 0,
                lessThanOrEqualTo: 9999999999999,
                notInteger: "^voip.query_data.from_date_invalid",
                notGreaterThan: "^voip.query_data.from_date_value"
            }
        },
        to_date: {
            numericality: {
                onlyInteger: true,
                greaterThan: 0,
                lessThanOrEqualTo: 9999999999999,
                notInteger: "^voip.query_data.to_date_invalid",
                notGreaterThan: "^voip.query_data.to_date_value"
            },
            rp_validToDate: {
                message: "voip.query_data.to_date_outrange"
            }
        },
        call_type: {
            inclusion: {
                within: call_type,
                message: "^voip.call_type.inclusion"
            }
        },
        call_status: {
            inclusion: {
                within: call_status,
                message: "^voip.call_status.inclusion"
            }
        },
        voip_convert_ticket: {
            inclusion: {
                within: voip_convert_ticket,
                message: "^voip.voip_convert_ticket.inclusion"
            }
        }
    };
    var success = () => {
        next();
    }, error = (errors) => {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints).then(success, error);
};

exports.validate_report_query_data = (data, next) => {
    var call_stats_type = _.values(enumsVoip.VoipStatsCallType);
    var constraints = {
        from_date : {
            numericality: {
                onlyInteger: true,
                greaterThan: 0,
                lessThanOrEqualTo: 9999999999999,
                notInteger: "^voip.query_data.from_date_invalid",
                notGreaterThan: "^voip.query_data.from_date_value"
            }
        },
        to_date : {
            numericality : {
                onlyInteger : true,
                greaterThan : 0,
                lessThanOrEqualTo : 9999999999999,
                notInteger : "^voip.query_data.to_date_invalid",
                notGreaterThan : "^voip.query_data.to_date_value"
            },
            rp_validToDate : {
                message: "voip.query_data.to_date_outrange"
            }
        },
        call_type : {
            inclusion : {
                within : call_stats_type,
                message : "^voip.call_type.inclusion"
            }
        },
        provider : {
            presence: {
                message : "^voip.call_provider.require"
            }
        }
    };
    var success = () => {
        next();
    }, error = (errors) => {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints).then(success, error);
};

exports.validate_voip_add = (data, user, next) =>{
    var call_type = _.values(enumsVoip.VoipType);
    var constraints = {
        call_id: {
            presence: {
                message: "^voip.call_id.require"
            },
            length: {
                maximum: 255,
                tooShort: "^voip.call_id.max"
            }
        },
        "caller.call_type": {
            presence: {
                message: "^voip.call_type.require"
            },
            inclusion: {
                within: call_type,
                message: "^voip.call_type.inclusion"
            }
        },
        "phone_no.from":{
            presence: {
                message: "^voip.phone_no_from.require"
            }
        },
        "phone_no.to": {
            presence: {
                message: "^voip.phone_no_to.require"
            }
        },
        "caller.from": {
            presence: {
                message: "^voip.caller_from.require"
            },
            check_from_is_equal_to: {
                message: "^voip.caller_from.is_equal_caller_to"
            },
            check_from_user_exists: {
                message: "^voip.caller_from.is_not_exists"
            }
        },
        "caller.to": {
            presence: {
                message: "^voip.caller_to.require"
            },
            check_to_user_exists: {
                message: "^voip.caller_to.is_not_exists"
            }
        },
        "content.duration": {
            presence: {
                message: "^voip.duration.require"
            },
            numericality: {
                onlyInteger: true,
                message: "^voip.content_duration.is_integer"
            }
        }
    };
    var success = (attributes) =>{
        data.phone_no.from = attributes.phone_no.from;
        data.phone_no.to = attributes.phone_no.to;
        next();
    }, error = (errors) =>{
        next(errorHandler.validationError(errors));
    };
    validate.async(data, constraints, {data: data, user: user}).then(success, error);
};

exports.validate_voip_convert_ticket = (data, user, next) =>{
    var constraints = {
        ticket_id: {
            check_ticket_id: {
                message: "^voip.ticket_id.is_not_exists"
            }
        },
        agent_id: {
            presence: {
                message: "^voip.agent_id.require"
            },
            check_agent_exists: {
                message: "^voip.agent_id.is_not_exists"
            }
        },
        requester_id: {
            presence: {
                message: "^voip.requester_id.require"
            },
            check_requester_exists: {
                message: "^voip.requester_id.is_not_exists"
            }
        },
        'comment.content': {
            presence: {
                message: "^voip.content.require"
            }
        }
    };
    var success = (attributes) =>{
        if(!utils.isEmpty(data.ticket)){
            next();
        } else{
            data.status = attributes.status;
            data.organization = attributes.organization;
            var idOwner = utils.getParentUserId(user);
            if(utils.isEmpty(data.agent_id)) {
                if(utils.isEmpty(data.group_id)){
                    data.agent_id = undefined;
                    data.group_id = undefined;
                } else {
                    data.agent_id = undefined;
                }
                next();
            } else {
                groupUserController.findGroupUser(idOwner, data.agent_id, (err, result) =>{
                    if(err){
                        console.error(err, 'ticket.validator.error')
                    }
                    if(result && utils.isEmpty(data.group_id)){
                        data.group_id = result.group_id;
                    }
                    next();
                });
            }
        }
    }, error = (errors) =>{
        console.log(errors);
        next(errorHandler.validationError(errors));
    };
    validate.async(data, constraints, {data: data, user: user}).then(success, error);
};

exports.validate_update_settings = (data, next) => {
    var constraints = {
        domain : {
            length : {
                maximum : 250,
                tooLong : "^voip_setting.domain.maximum_length",
                minimum : 0,
                tooShort : "^voip_setting.domain.minimum_length"
            }
        },
        ws_servers: {
            length : {
                maximum : 250,
                tooLong : "^voip_setting.ws_servers.maximum_length",
                minimum : 0,
                tooShort : "^voip_setting.ws_servers.minimum_length"
            }
        },
        password: {
            length: {
                maximum : 250,
                tooLong : "^voip_setting.password.maximum_length",
                minimum : 0,
                tooShort : "^voip_setting.password.minimum_length"
            }
        },
        authorization_user: {
            length : {
                maximum : 50,
                tooLong : "^voip_setting.authorization_user.maximum_length",
                minimum : 0,
                tooShort : "^voip_setting.authorization_user.minimum_length"
            }
        },
        max_interval : {
            numericality : {
                onlyInteger : true,
                greaterThan : 0,
                lessThanOrEqualTo : 999999999999,
                notInteger : "^voip_setting.max_interval.max_interval_int",
                notGreaterThan : "^voip_setting.max_interval.max_interval_value",
                notLessThanOrEqualTo : "^voip_setting.max_interval.max_interval_valueless_than_999999999999",
                notValid : "^voip_setting.max_interval.max_interval_value_int"
            }
        },
        min_interval : {
            numericality : {
                onlyInteger : true,
                greaterThan : 0,
                lessThanOrEqualTo : 999999999999,
                notInteger : "^voip_setting.min_interval.min_interval_int",
                notGreaterThan : "^voip_setting.min_interval.min_interval_value",
                notLessThanOrEqualTo : "^voip_setting.min_interval.min_interval_value_less_than_999999999999",
                notValid : "^voip_setting.min_interval.min_interval_value_int"
            }
        },
        no_answer_timeout : {
            numericality : {
                onlyInteger : true,
                greaterThan : 0,
                lessThanOrEqualTo : 999999999999,
                notInteger : "^voip_setting.no_answer_timeout.no_answer_timeout_int",
                notGreaterThan : "^voip_setting.no_answer_timeout.no_answer_timeout_value",
                notLessThanOrEqualTo : "^voip_setting.no_answer_timeout.no_answer_timeout_value_less_than_999999999999",
                notValid : "^voip_setting.no_answer_timeout.no_answer_timeout_value_int"
            }
        },
        node_websocket_options : {
            length : {
                maximum : 50,
                tooLong : "^voip_setting.node_websocket_options.maximum_length",
                minimum : 0,
                tooShort : "^voip_setting.node_websocket_options.minimum_length"
            }
        },
        register_exprires : {
            numericality : {
                onlyInteger : true,
                greaterThan : 0,
                lessThanOrEqualTo : 999999999999,
                notInteger : "^voip_setting.register_expires.register_exprires_int",
                notGreaterThan : "^voip_setting.register_expires.register_exprires_greater_than_0",
                notLessThanOrEqualTo : "^voip_setting.register_expires.register_exprires_less_than_999999999999",
                notValid : "^voip_setting.register_exprires.register_exprires_int"
            }
        },
        registrar_server : {
            length : {
                maximum : 50,
                tooLong : "^voip_setting.registrar_server.maximum_length",
                minimum : 0,
                tooShort : "^voip_setting.registrar_server.minimum_length"
            }
        },
        line_access_code : {
            numericality : {
                onlyInteger : true,
                notInteger : "^voip_setting.line_access_code.line_access_code_int",
                notValid : "^voip_setting.line_access_code.line_access_code_int"
            }
        },
        sp_url : {
            length : {
                maximum : 250,
                tooLong : "^voip_setting.sp_url.maximum_length",
                minimum : 0,
                tooShort : "^voip_setting.sp_url.minimum_length"
            }
        },
        sp_token : {
            length: {
                maximum : 250,
                tooLong : "^voip_setting.sp_token.maximum_length",
                minimum : 0,
                tooShort : "^voip_setting.sp_token.minimum_length"
            }
        }
    };
    
    var success = () => {
        next()
    }, error = (errors) => {
        next(errorHandler.validationError(errors));
    };
    validate.async(data.provider_data, constraints).then(success, error);
};

exports.validate_voip_update_missed_call = (data, next) => {
    var constraints = {
        call_id : {
            presence : {
                message : "^voip.call_id.require"
            },
            length : {
                maximum : 255,
                tooShort : "^voip.call_id.max"
            }
        },
        "phone_no.from" : {
            presence : {
                message : "^voip.phone_no_from.require"
            }
        }
    };
    
    var success = (attributes) => {
        next();
    }, error = (errors) =>{
        next(errorHandler.validationError(errors));
    };
    
    validate.async(data, constraints, { data : data }).then(success, error);
};
