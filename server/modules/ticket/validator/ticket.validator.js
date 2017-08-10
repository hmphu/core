'use strict';
//
// ticket.validator.js
// check the validity of ticket functions
//
// Created by thanhdh on 2015-07-19.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    _ = require('lodash'),
    mongoose = require('mongoose'),
    moment = require('moment'),
    User = mongoose.model('User'),
    CustomSetting = mongoose.model('CustomSetting'),
    path = require('path'),
    enums = require('../resources/enums'),
    utils = require('../../core/resources/utils'),
    redis = require(path.resolve('./config/lib/redis')),
    enumsBizRule = require('../../biz.rule/resources/enums'),
    enumsContactType = require('../../people/resources/enums.res'),
    groupController = require(path.resolve('./modules/people/controllers/people.group.controller')),
    groupUserController = require(path.resolve('./modules/people/controllers/people.group.user.controller')),
    userMailAccount = require(path.resolve('./modules/user.setting/controllers/user.mail.account.controller')),
    macroController = require(path.resolve('./modules/biz.rule/controllers/macro.controller')),
    orgController = require(path.resolve('./modules/people/controllers/people.organization.controller')),
    providerData = require('../providers/index.provider'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));
// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

/**
 * check agent exists a new ticket author : vupl
 */
validate.validators.check_ticket_agent_exists = (value, options, key, attributes, globalOptions) =>{
    if(!value){
        return null;
    }
    return validate.Promise((resolve, reject) =>{
        if (!mongoose.Types.ObjectId.isValid(value.toString())) {
            return resolve("^validator.ticket.invalid_agent_id");
        }
        User.findById(value, (err, result) =>{
            if(err){
                console.error(err);
                return resolve(options.message);
            }
            var idOwner = utils.getParentUserId(result);
            if (!result || !_.isEqual(idOwner, mongoose.Types.ObjectId(globalOptions.data.ed_user_id)) || result.is_requester == true) {
                return resolve(options.message);
            }
            if(result.is_suspended == true){
                return resolve("^validator.ticket.suspended_agent");
            }
            return resolve();
        });
    });
};

/**
 * check requester exists a new ticket author : vupl
 */
validate.validators.check_ticket_requester_exists = (value, options, key, attributes, globalOptions) =>{
    if(utils.isEmpty(value)){
        attributes.organization = undefined;
        if(globalOptions.data.comment){
            if(attributes.comment.provider == enums.Provider.fbComment || attributes.comment.provider == enums.Provider.fbMessage){
                    attributes.comment.provider = attributes.comment.provider;
                    attributes.comment.provider_data = attributes.comment.provider_data;
            } else {
                attributes.comment.provider = enums.Provider.web;
                attributes.comment.provider_data = undefined;
            }
        }
        return undefined;
    }
    return validate.Promise((resolve, reject) =>{
        if(!mongoose.Types.ObjectId.isValid(value.toString())){
            return resolve("^validator.ticket.invalid_requester_id")
        }
        User.findById(value, (err, result) =>{
            if(err){
                console.error(err);
                return resolve(options.message);
            }
            var idOwner = utils.getParentUserId(result);
            if (!result || !_.isEqual(idOwner, mongoose.Types.ObjectId(globalOptions.data.ed_user_id)) || result.is_requester == false) {
                return resolve(options.message);
            }
            if(result.is_suspended == true){
                return resolve("^validator.ticket.suspended_requester");
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
 * check field exists a new ticket author : vupl
 */
validate.validators.check_ticket_field_invalid = (value, options, key, attributes, globalOptions) =>{
    if(!value){
        return null;
    }
    return validate.Promise((resolve, reject) =>{
        var field_keys = _.uniq(_.keys(value));
        var queries = {
            query: {
                ed_user_id: globalOptions.data.ed_user_id,
                field_key: {$in : field_keys}
            },
            select: 'field_key -_id'
        };
        CustomSetting.find(queries.query).select(queries.select).exec((err, custom_settings) =>{
            if(err){
                return resolve();
            }
            if(field_keys.length != custom_settings.length){
                // delete ticket_fields not in db
                var field_key_custom = [];
                _.forEach(custom_settings, (item) =>{
                    field_key_custom.push(item.field_key);
                })
                _.forEach(value, (index, key) =>{
                    if(field_key_custom.indexOf(key) == -1){
                        delete value[key];
                    }
                });
                return resolve();
            }
            return resolve();
        });
    });
};

/**
 * check org exists a new ticket author : vupl
 */
validate.validators.check_ticket_org_exists = (value, options, key, attributes, globalOptions) =>{
    if(!value){
        if(globalOptions.ticket){
            attributes.organization = globalOptions.ticket.organization;
        }
        return;
    }
    return validate.Promise((resolve, reject) =>{
        if(!mongoose.Types.ObjectId.isValid(value.toString())){
            return resolve("^validator.ticket.invalid_org_id");
        }
        orgController.findById_Internal(value, (err, result) =>{
            if(err){
                console.error(err);
                return resolve(options.message);
            }
            if(!result){
                attributes.organization = undefined;
                return resolve();
            }
            if (!result || !_.isEqual(result.ed_user_id, mongoose.Types.ObjectId(globalOptions.data.ed_user_id))) {
                return resolve(options.message);
            }
            if(utils.isEmpty(globalOptions.data.requester_id)){
                return resolve("^validator.ticket.org_no_requester");
            }
            return resolve();
        });
    });
};

/**
 * check org exists a new ticket author : vupl
 */
validate.validators.check_ticket_comment_provider_data = (value, options, key, attributes, globalOptions) =>{
    if(utils.isEmpty(value)){
        if(globalOptions.data.comment){
            attributes.comment.provider = enums.Provider.web;
            attributes.comment.provider_data = undefined;
            return;
        }
        return;
    }
    return validate.Promise((resolve, reject) =>{
        if(globalOptions.data.comment.provider == enums.Provider.sms){
            if(utils.isEmpty(globalOptions.data.requester_id)){
                return resolve("^validator.ticket.invalid_requester_id");
            }
            if(utils.isEmpty(value.phone_no)){
                return resolve("^validator.ticket.no_phone");
            }
            providerData.validateDataSms(value, globalOptions, (err, result) =>{
                if(err){
                    return resolve("^validator.ticket.invalid_phone_format");
                }
                return resolve();
            });
        }
        else if(globalOptions.data.comment.provider == enums.Provider.fbComment){
            //TODO: remove later
            /*if(utils.isEmpty(globalOptions.ticket.provider) || globalOptions.ticket.provider != enums.Provider.fbComment){
                return resolve(options.message);
            }*/
            if(value.sender_id){
                providerData.validateDataFb(value, globalOptions, (err, result) =>{
                    if(err){
                        return resolve(options.message);
                    }
                    return resolve();
                });
            }
            return resolve();
        }
        else if(globalOptions.data.comment.provider == enums.Provider.fbMessage){
            //TODO : remove later
            /*if(!globalOptions.ticket || utils.isEmpty(globalOptions.ticket.provider) || globalOptions.ticket.provider != enums.Provider.fbMessage){
                return resolve(options.message);
            }*/
            return resolve();
        }
        else if(globalOptions.data.comment.provider == enums.Provider.gmail || globalOptions.data.comment.provider == enums.Provider.iziMail){
            if(utils.isEmpty(globalOptions.data.requester_id)){
                return resolve("^validator.ticket.invalid_requester_id");
            }
            if(!value.to_email || !utils.isValidEmail(value.to_email)){
                return resolve("^validator.ticket.invalid_email_format");
            }
            if(value.ex_ccs && !_.isArray(value.ex_ccs)){
                return resolve("^validator.ticket.ext_array");
            }
            if(_.isArray(value.ex_ccs)){
                _.forEach(value.ex_ccs, (item) =>{
                    if(!utils.isValidEmail(item)){
                        return resolve("^validator.ticket.invalid_email_format");
                    }
                });
            }
            if(value.ex_to && !_.isArray(value.ex_to)){
                return resolve("^validator.ticket.ext_array");
            }
            if(_.isArray(value.ex_to)){
                _.forEach(value.ex_to, (item) =>{
                    if(!utils.isValidEmail(item)){
                        return resolve("^validator.ticket.invalid_email_format");
                    }
                });
            }
            providerData.validateDataMail(value, globalOptions, (err, result) =>{
                if(err){
                    return resolve(options.message);
                }
                var data = globalOptions.ticket ? globalOptions.ticket : globalOptions.data;
                if(data._id){
                    var query = {};
                    if(data.provider == enums.Provider.iziMail || data.provider == enums.Provider.gmail){
                        query = {
                            ed_user_id: data.ed_user_id
                        };
                        if(data.provider_data.receive_support_mail){
                            query.mail = data.provider_data.receive_support_mail;
                        }
                    } else {
                        query = {
                            ed_user_id: data.ed_user_id,
                            is_default: true
                        }
                    }

                    var done = function(result_find, is_mail_removed){
                        if(result_find.provider === "local"){
                            let from_email = result_find.mail;
                            if(data.provider_data){
                                from_email = data.provider_data.receive_support_mail ? data.provider_data.receive_support_mail : from_email;
                            }
                            attributes.comment.provider_data.from_email = is_mail_removed ? result_find.mail : from_email;
                            attributes.comment.provider_data.message_id = `izi.${+moment.utc()}-ticket_id+${data._id}@izihelp.com`;
                            attributes.comment.provider = enums.Provider.iziMail;
                        }
                        if(result_find.provider === "gmail"){
                            let from_email = result_find.mail;
                            if(data.provider_data){
                                from_email = data.provider_data.receive_support_mail ? data.provider_data.receive_support_mail : from_email;
                            }
                            attributes.comment.provider_data.from_email = is_mail_removed ? result_find.mail : from_email;
                            attributes.comment.provider_data.message_id = `izi.${+moment.utc()}-ticket_id+${data._id}@izihelp.com`;
                            attributes.comment.provider = enums.Provider.gmail;
                        }
                        return resolve();
                    };

                    userMailAccount.findMail(query, (err_find, result_find) =>{
                        if(err_find){
                            return resolve(options.message);
                        }

                        if(!result_find){
                            userMailAccount.findMail({
                                ed_user_id: data.ed_user_id,
                                is_default: true
                            }, (err_find, result_find) =>{
                                if(err_find){
                                    return resolve(options.message);
                                }
                                done(result_find, true);
                            });
                        }else{
                            done(result_find, false);
                        }
                    });
                } else {
                    userMailAccount.findDefaultMail(globalOptions.data.ed_user_id, (err_find, result_find) =>{
                        if(err_find){
                            return resolve(options.message);
                        }
                        if(result_find.provider === "local"){
                            let from_email = result_find.mail;
                            if(data.provider_data){
                                from_email = data.provider_data.receive_support_mail ? data.provider_data.receive_support_mail : from_email;
                            }
                            attributes.comment.provider_data.from_email = from_email;
                            attributes.comment.provider = enums.Provider.iziMail;
                        }
                        if(result_find.provider === "gmail"){
                            let from_email = result_find.mail;
                            if(data.provider_data){
                                from_email = data.provider_data.receive_support_mail ? data.provider_data.receive_support_mail : from_email;
                            }
                            attributes.comment.provider_data.from_email = from_email;
                            attributes.comment.provider = enums.Provider.gmail;
                        }
                        return resolve();
                    });
                }
            });
        } else if(globalOptions.data.comment.provider == enums.Provider.iziComment){
            return resolve();
        } else if(globalOptions.data.comment.provider == enums.Provider.voip){
            let provider_data = globalOptions.data.comment.provider_data;
            if(utils.isEmpty(provider_data.from) || utils.isEmpty(provider_data.to)){
                return resolve("^validator.ticket.invalid_no_phone");
            }
            return resolve();
        } else if (globalOptions.data.comment.provider == enums.Provider.zaloMessage) {
            attributes.comment.provider = enums.Provider.zaloMessage;
            attributes.comment.provider_data = {};
            return resolve();
        } else {
            attributes.comment.provider = enums.Provider.web;
            attributes.comment.provider_data = undefined;
            return resolve();
        }
    });
};
/**
 * check group exists a new ticket author : vupl
 */
validate.validators.check_ticket_group_exists = (value, options, key, attributes, globalOptions) =>{
    if(!value){
        return;
    }
    return validate.Promise((resolve, reject) =>{
        if(!mongoose.Types.ObjectId.isValid(value.toString())){
            return resolve("^validator.ticket.invalid_group_id");
        }
        if(utils.isEmpty(globalOptions.data.agent_id)){
            groupController.findOneById(value, (err, result) =>{
                if(err){
                    console.error(err);
                    return resolve(options.message);
                }
                if(!result || !_.isEqual(result.ed_user_id, mongoose.Types.ObjectId(globalOptions.data.ed_user_id))){
                    return resolve(options.message);
                }
                return resolve();
            });
        } else {
            groupUserController.findUserInGroup(globalOptions.data.ed_user_id, value, globalOptions.data.agent_id, (err, result) =>{
                if(err){
                    console.error(err);
                    return resolve(options.message);
                }
                if(!result){
                    return resolve(options.message);
                }
                return resolve();
            });
        }
    });
};

validate.validators.check_ticket_status_solve = (value, options, key, attributes, globalOptions) =>{
    if(globalOptions.data.status != enums.TicketStatus.Solved){
        return null;
    }
    return validate.Promise((resolve, reject) =>{
        if(utils.isEmpty(value)){
            return resolve(options.message);
        }
        return resolve();
    });
};

validate.validators.check_ticket_macro_id = (value, options, key, attributes, globalOptions) =>{
    if(!value){
        return null;
    }
    return validate.Promise((resolve, reject) =>{
        if (!mongoose.Types.ObjectId.isValid(value.toString())) {
            return resolve("^validator.ticket.invalid_macro_id");
        }
        macroController.findById_Internal(value, (err, result) =>{
            if(err){
                console.error(err);
                return resolve(options.message);
            }
            if(!result || !result.is_active || !_.isEqual(result.ed_user_id, mongoose.Types.ObjectId(globalOptions.data.ed_user_id))){
                return resolve(options.message);
            }
            let user_id = globalOptions.data.comment ? globalOptions.data.comment.user_id : globalOptions.data.user_id;
            if(result.availability == enumsBizRule.Availability.Only_me) {
                if (!mongoose.Types.ObjectId.isValid(user_id)) {
                    return resolve(options.objectId);
                }

                if(!_.isEqual(result.user_id, mongoose.Types.ObjectId(user_id))){
                    return resolve(options.message);
                }
            }
            if(!result.group_id){
                return resolve();
            }
            groupUserController.findUserInGroup(globalOptions.data.ed_user_id, result.group_id, user_id, (err_group, result_group) =>{
                if(err_group){
                    console.error(err_group);
                    return resolve(options.message);
                }
                if(!result_group){
                    return resolve(options.message);
                }
                return resolve();
            });
        });
    });
};

validate.validators.check_taggings = function(value, options, key, attributes, globalOptions) {
    return validate.Promise( (resolve, reject, req) => {
        if (!value) {
            return resolve();
        }

        if (!Array.isArray(value)) {
            return resolve(options.is_array);
        }

        value.forEach((tag)=>{
            if(tag.indexOf(' ') != -1){
                return resolve(options.message);
            }

            var count = _.countBy(value, function(o) { return o == tag; });

            if(count.true > 1){
                return resolve(options.must_different);
            }

        });
        return resolve();
    });
};

validate.validators.check_rating_existed = function(value, options, key, attributes, globalOptions) {
    return validate.Promise( (resolve, reject, req) => {
        if (!value) {
            return resolve();
        }

        mongoose.model('Ticket').findById(globalOptions.ticket_id).exec((err, results) => {
            if(err){
                console.error(err);
                return resolve(options.not_found);
            }

            if(!results){
                return resolve(options.not_found);
            }

            /*if(results[0].rating.value != null || results[0].rating.value != undefined || results[0].rating.comment){
                return resolve(options.existed);
            }*/

            return resolve();
        });
    });
};

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * validate data before update ticket @author: vupl
 */
exports.check_add_ticket = function(data, next) {
    validate.validators.check_ticket_agent_exists = (value, options, key, attributes, globalOptions) =>{
        if(!value){
            return null;
        }
        return validate.Promise((resolve, reject) =>{
            if (!mongoose.Types.ObjectId.isValid(value.toString())) {
                return resolve("^invalid_agent_id");
            }
            User.findById(value, (err, result) =>{
                if(err){
                    console.error(err);
                    return resolve(options.message);
                }
                var idOwner = utils.getParentUserId(result);
                if (!result || !_.isEqual(idOwner, mongoose.Types.ObjectId(globalOptions.data.ed_user_id)) || result.is_requester == true) {
                    return resolve(options.message);
                }
                if(result.is_suspended == true){
                    return resolve("^validator.ticket.suspended_agent");
                }
                if(data.status != enums.TicketStatus.Solved){
                    data.status = enums.TicketStatus.Open;
                }
                return resolve();
            });
        });
    };
    var constraints = {
        agent_id: {
            check_ticket_agent_exists: {
                message: "^validator.ticket.agent_id_exist"
            },
            check_ticket_status_solve: {
                message: "^validator.ticket.solve_no_assignee"
            }
        },
        requester_id: {
            check_ticket_requester_exists: {
                message: "^validator.ticket.requester_id_exist"
            }
        },
        subject: {
            presence: {
                message: "^validator.ticket.subject_required"
            },
            length: {
                minimum: 1,
                tooShort: "^validator.ticket.subject_min_len",
                maximum: 500,
                tooLong: "^validator.ticket.subject_max_len"
            }
        },
        organization: {
            check_ticket_org_exists: {
                message: "^validator.ticket.invalid_org_id"
            }
        },
        group_id: {
            check_ticket_group_exists: {
                message: "^validator.ticket.invalid_group_id"
            }
        },
        status: {
            presence: {
                message: "^validator.ticket.status_required"
            },
            inclusion: {
                within: [enums.TicketStatus.New, enums.TicketStatus.Open, enums.TicketStatus.Pending, enums.TicketStatus.Solved],
                message: "^validator.ticket.status_inclusion"
            }
        },
        type: {
            inclusion: {
                within: _.values(enums.TicketType),
                message: "^validator.ticket.type_inclusion"
            }
        },
        priority: {
            inclusion: {
                within: _.values(enums.TicketPriority),
                message: "^validator.ticket.priority_inclusion"
            }
        },
        fields: {
            check_ticket_field_invalid: {
                message: "^validator.ticket.field_invalid"
            }
        },
        deadline: {
            datetime: {
                message: "^validator.ticket.deadline_invalid"
            }
        },
        "comment.content": {
            presence: {
                message: "^validator.ticket.comment_required"
            }
        },
        "comment.provider": {
            inclusion: {
                within: _.values(enums.Provider),
                message: "^validator.ticket.comment_inclusion"
            }
        },
        "comment.provider_data": {
            check_ticket_comment_provider_data: {
                message: "^validator.ticket.invalid_provider_data"
            }
        },
        "macro_id": {
            check_ticket_macro_id: {
                message: "^validator.ticket.invalid_macro_id",
                objectId: "^validator.user_id.invalid_objectid"
            }
        },
        "tags": {
            check_taggings: {
                message: "^validator.ticket.invalid_tag"
            }
        }
    };
    var success = (attributes) =>{
        data.organization = attributes.organization;
        data.comment.provider = attributes.comment.provider;
        data.comment.provider_data = attributes.comment.provider_data;
        if(data.comment.provider == enums.Provider.gmail || data.comment.provider == enums.Provider.iziMail){
            data.comment.provider_data.from_email = attributes.comment.provider_data.from_email;
        }
        if(utils.isEmpty(data.agent_id)){
            next();
        } else {
            groupUserController.findGroupUser(data.ed_user_id, data.agent_id, (err, result) =>{
                if(err){
                    console.error(err, 'ticket.validator.error')
                }
                if(result && utils.isEmpty(data.group_id)){
                    data.group_id = result.group_id;
                }
                next();
            });
        }
    }, error = (errors) =>{
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints, {data : data}).then(success, error);
};

/*
 * validate data before update ticket @author: vupl
 */
exports.check_update_ticket = (data, ticket, next) =>{
    validate.validators.check_ticket_requester_exists = (value, options, key, attributes, globalOptions) =>{
        if(utils.isEmpty(value)){
            attributes.organization = undefined;
            if(globalOptions.data.comment){
                if(attributes.comment.provider == enums.Provider.fbComment || attributes.comment.provider == enums.Provider.fbMessage || attributes.comment.provider == enums.Provider.iziComment || attributes.comment.provider == enums.Provider.zaloMessage){
                    attributes.comment.provider = attributes.comment.provider;
                    attributes.comment.provider_data = attributes.comment.provider_data;
                } else {
                    attributes.comment.provider = enums.Provider.web;
                    attributes.comment.provider_data = undefined;
                }
            }
            return null;
        }
        return validate.Promise((resolve, reject) =>{
            if(!mongoose.Types.ObjectId.isValid(value)){
                return resolve("^validator.ticket.invalid_requester_id")
            }
            User.findById(value, (err, result) =>{
                if(err){
                    console.error(err);
                    return resolve(options.message);
                }
                var idOwner = utils.getParentUserId(result);
                if (!result || !_.isEqual(idOwner, mongoose.Types.ObjectId(globalOptions.data.ed_user_id)) || result.is_requester == false) {
                    return resolve(options.message);
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
    var constraints = {
        agent_id: {
            check_ticket_agent_exists: {
                message: "^agent_id_exist"
            },
            check_ticket_status_solve: {
                message: "^validator.ticket.solve_no_assignee"
            }
        },
        requester_id: {
            check_ticket_requester_exists: {
                message: "^validator.ticket.requester_id_exist"
            }
        },
        status: {
            presence: {
                message: "^validator.ticket.status_required"
            },
            inclusion: {
                // check status not new
                within: [enums.TicketStatus.Open, enums.TicketStatus.Pending, enums.TicketStatus.Solved],
                message: "^validator.ticket.status_inclusion"
            }
        },
        organization: {
            check_ticket_org_exists: {
                message: "^validator.ticket.invalid_org_id"
            }
        },
        group_id: {
            check_ticket_group_exists: {
                message: "^validator.ticket.invalid_group_id"
            }
        },
        type: {
            inclusion: {
                within: _.values(enums.TicketType),
                message: "^validator.ticket.type_inclusion"
            }
        },
        priority: {
            inclusion: {
                within: _.values(enums.TicketPriority),
                message: "^validator.ticket.priority_inclusion"
            }
        },
        fields: {
            check_ticket_field_invalid: {
                message: "^validator.ticket.field_invalid"
            }
        },
        deadline: {
            datetime: {
                message: "^validator.ticket.deadline_invalid"
            }
        },
        "comment.provider": {
            inclusion: {
                within: [enums.Provider.web, enums.Provider.sms, enums.Provider.fbComment, enums.Provider.fbMessage, enums.Provider.gmail, enums.Provider.iziMail, enums.Provider.iziComment, enums.Provider.voip, enums.Provider.zaloMessage],
                message: "^validator.ticket.provider_inclusion"
            }
        },
        "comment.provider_data": {
            check_ticket_comment_provider_data: {
                message: "^validator.ticket.invalid_provider_data"
            }
        },
        "macro_id": {
            check_ticket_macro_id: {
                message: "^validator.ticket.invalid_macro_id",
                objectId: "^validator.user_id.invalid_objectid"
            }
        },
        "tags": {
            check_taggings: {
                message: "^validator.ticket.invalid_tag"
            }
        }
    };
    var success = (attributes) =>{
        if(utils.isEmpty(data.requester_id)){
            data.requester_id = null;
            data.organization = null;
        } else {
            data.organization = attributes.organization;
        }
        if(data.comment){
            data.comment.provider = attributes.comment.provider;
            data.comment.provider_data = attributes.comment.provider_data;
            if(data.comment.provider == enums.Provider.gmail || data.comment.provider == enums.Provider.iziMail){
                data.comment.provider_data.from_email = attributes.comment.provider_data.from_email;
            }
            if(data.comment.provider == enums.Provider.fbComment){
                data.comment.provider_data.page_id = ticket.provider_data.page_id;
                data.comment.provider_data.post_id = ticket.provider_data.post_id;
                data.comment.provider_data.parent_id = data.comment.provider_data.parent_id ? data.comment.provider_data.parent_id : ticket.provider_data.parent_id;
            }
            if(data.comment.provider == enums.Provider.fbMessage){
                data.comment.provider_data.page_id = ticket.provider_data.page_id;
                data.comment.provider_data.thread_id = ticket.provider_data.thread_id;
            }
        }
        if(utils.isEmpty(data.agent_id)) {
            if(utils.isEmpty(data.group_id)){
                data.agent_id = null;
                data.group_id = null;
            } else {
                data.agent_id = null;
            }
            next();
        } else {
            groupUserController.findGroupUser(data.ed_user_id, data.agent_id, (err, result) =>{
                if(err){
                    console.error(err, 'ticket.validator.error')
                }
                if(result && utils.isEmpty(data.group_id)){
                    data.group_id = result.group_id;
                }
                next();
            });
        }
    }, error = (errors) =>{
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints, {data: data, ticket: ticket}).then(success, error);
};

/*
 * validate rating @author: dientn
 */
exports.validateRating = (data, next) =>{
    var constraints = {
        rating: {
            presence: {
                message: "^validator.ticket.rating_required"
            },
            inclusion: {
                within: _.keys(enums.TicketRating),// check status not is new,
                message: "^validator.ticket.rating_inclusion"
            },
            check_rating_existed: {
                existed: "^validator.ticket.rating_existed",
                not_found: "^validator.ticket.not_found"
            }
        },
//        token:{
//            presence: {
//                message: "^validator.ticket.access_token_required"
//            }
//        }
    };
    var success = () =>{
        next();
    }, error = (errors) =>{
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints, data).then(success, error);
};

exports.check_search_ticket = (data, next) =>{
    var constraints = {
        type: {
            inclusion: {
                within: [enums.SearchTicketBy.id, enums.SearchTicketBy.requester, enums.SearchTicketBy.subject],
                message: "^validator.ticket.search_ticket_by"
            }
        }
    };
    var success = () =>{
        return next();
    }, error = (errors) =>{
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints).then(success, error);
};
