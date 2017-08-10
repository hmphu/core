'use strict'
//
//  utils.js
//
//  Created by khanhpq on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//
var _ = require('lodash'),
    path         = require('path'),
    mongoose     = require('mongoose'),
    config       = require(path.resolve('./config/config')),
    cache        = require(path.resolve('./config/lib/redis.cache')),
    enums_core   = require('../../core/resources/enums.res'),
    cache        = require(path.resolve('./config/lib/redis.cache')),
    Utils        = require('../../core/resources/utils'),
    enums        = require('../resources/enums');
    
exports.checkNameBiz = function( value){   
    var regex = /^[a-z0-9A-Z_\- ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂưăạảấầẩẫậắằẳẵặẹẻẽếềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹý]+$/;

    return !regex.test(value);
};

exports.removeEmptyCond = function(value){   
    _.remove(value.all_conditions, function(o){
        return o.field_key == undefined;
    });
    
    _.remove(value.any_conditions, function(o){
        return o.field_key == undefined;
    });
    
    return value;
};

exports.bizSort = function(is_cache, model, name, idOwner, id_from, id_to, next){   
    var max_position = null,
        position_from = null,
        position_to = null;
    
    if(_.isEqual(id_from, id_to)){
        return next(new TypeError('biz.id_from.id_to.must_not_equal'));
    }
	new Promise(function(resolve, reject) {
        //get max position
        model.findOne({
            ed_user_id: idOwner
        }).
        select("_id ed_user_id position").
        sort({position: -1}).
        exec((err, result) => {
            if (err) {
                return reject(err);
            }

            if(!result){
                return reject('biz.postion.have_not_position');
            }
            max_position = result.position;
            resolve();
        });
    }).then(function() {
        //get biz item from id_from
        return new Promise(function(resolve, reject) {
            model.findOne({
                _id: id_from
            }).
            exec((err, result) => {
                if (err) {
                    return reject(err);
                }
                
                if (!result || !_.isEqual(result.ed_user_id, idOwner)) {
                    return next('biz.id_from.not_found');
                }
                
                if(result.position > max_position){
                    return next('biz.id_from.position.must_less_than_max_position');
                }
                
                resolve(result);
            });
        });
    }).then(function(biz_from) {
        //get biz item from id_to
        return new Promise(function(resolve, reject) {
            model.findOne({
                _id: id_to
            }).
            exec((err, result) => {
                if (err) {
                    return reject(err);
                }
                
                if (!result || !_.isEqual(result.ed_user_id, idOwner)) {
                    return next('biz.id_to.not_found');
                }
                
                if(result.position > max_position){
                    return next('biz.id_to.position.must_less_than_max_position');
                }
                
                resolve({
                    biz_from: biz_from,
                    biz_to: result
                });
            });
        });
    }).then(function(data) {
        return new Promise(function(resolve, reject) {
            var position_query = {};
            position_from = data.biz_from.position;
            position_to = data.biz_to.position;
            if(position_from > position_to){
                position_query = {
                    $gte: position_to,
                    $lt: position_from
                };
            }else{
                position_query = {
                    $gt: position_from,
                    $lte: position_to
                };  
            }

            model.find({
                ed_user_id: idOwner,
                position: position_query
            }).exec((err, results) => {
                if (err){
                    return reject(err);
                }

                if (!results || results.length == 0) {
                    return reject('biz.reorder.not_found_items');
                }
                
                if(position_from > position_to){
                    data.biz_from.position = data.biz_to.position - 1;
                    results.unshift(data.biz_from);
                }else{
                    data.biz_from.position = data.biz_to.position + 1;
                    results[results.length] = data.biz_from;
                }     
                
                data.bizs = results;
                resolve(data);
            });
        });

    }).then(function(data) {

        return new Promise(function(resolve, reject) {
            var tasks = [],
                bizs = data.bizs;
            for(var i = 0; i < bizs.length; i++){
                
                if(position_from > position_to){
                    bizs[i].position = bizs[i].position + 1;
                }else{
                    bizs[i].position = bizs[i].position - 1;
                }

                var promise = new Promise((resolve_, reject_) => {
                    bizs[i].save((err) => {
                        if(err){
                            return reject_(err);
                        }
                        resolve_();
                    });
                });
                tasks.push(promise);
            }

            Promise.all(tasks).then(function(values) {
                if(is_cache){
                    cache.removeCache(idOwner, name, (errsave) => {
                        if(errsave){
                            console.error(errsave, name + '.remove.removeCache.fail');
                        }
                    });
                }
                next();
            }, function(reason) {
                next(reason);
            });
        });

    }, function(reason) {
        next(reason);
    });
};

exports.check_conditions = function(value, options, globalOptions, biz_resources, next) {
    if(!Array.isArray(value)){
        return next(options.condition_array);
    }

    if(Array.isArray(globalOptions.all_conditions) && Array.isArray(globalOptions.any_conditions) && globalOptions.all_conditions.length == 0 && globalOptions.any_conditions.length == 0){
        return next(options.condition_required);
    }

    if(globalOptions.all_conditions.length + globalOptions.any_conditions.length > config.bizRule.maxCondition){
        return next(options.max_action);
    }

    var tasks = [],
        conditions = value;
    
    conditions.forEach((item) => {

        var promise = new Promise((resolve_, reject_) => {
            //check type
            if(_.indexOf([enums.BizRuleType.Ticket, enums.BizRuleType.TicketField, enums.BizRuleType.OrgField
                         ,enums.BizRuleType.UserField, enums.BizRuleType.RequesterField, enums.BizRuleType.Others], item.cond_type) == -1){
                return reject_(options.type_invalid);
            }

            if( !item.operator){
                return reject_(options.operator_required);
            }
            if( !item.value){
                return reject_(options.value_required);
            }

            if(_.indexOf([enums.BizRuleType.TicketField, enums.BizRuleType.OrgField,enums.BizRuleType.UserField,        enums.BizRuleType.RequesterField, enums.BizRuleType.Others], item.cond_type) == -1){

                mongoose.model('CustomSetting').count({
                    ed_user_id: globalOptions.ed_user_id,
                    field_key: item.field_key
                }).exec((err, count) => {
                    if (err){
                        return reject_(err);
                    }

                    if(!count){
                        return reject_(options.field_key_not_exist);
                    }
                    return resolve_();
                });

            }else{
                var condition = biz_resources.condition[item.field_key];
                if( !condition){
                    return reject_(options.condition_required);
                }

                if( !item.operator){
                    return reject_(options.operator_required);
                }else{
                    var operator = _.find(condition.operator, function(o) { return o.key === item.operator; });

                    if(!operator){
                        return reject_(options.operator_required);
                    }
                }

                if(!Array.isArray(condition.value.value) && _.isEqual(condition.value.value, "{{db}}")){
                    var pre_value = _.find(condition.value.pre_value, function(o) { return o.key === item.value; }),
                        mongoose_ = null,
                        query = {},
                        message = "";

                    if(pre_value){
                        return resolve_();

                    }else{
                        if (!mongoose.Types.ObjectId.isValid(item.value)) {
                            return reject_(options.not_objectId);
                        }
                        if(item.field_key == 'group' || item.field_key == 'email_group'){ //group
                            mongoose_ = mongoose.model('Group');
                            query = {
                                ed_user_id: globalOptions.ed_user_id,
                                _id: item.value
                            };
                            message = options.group_not_exist;

                        }else if(item.field_key == 'fb_page'){

                            mongoose_ = mongoose.model('UserFbPage');
                            query = {
                                ed_user_id: globalOptions.ed_user_id,
                                _id: item.value
                            };
                            options.fb_page_not_exist;

                        }else if(item.field_key == 'current_user'){
                            mongoose_ = mongoose.model('User');
                            query = {
                                ed_parent_id: globalOptions.ed_user_id,
                                _id: action.value.value,
                                is_requester: false,
                                roles: {
                                    $in: [enums.UserRoles.agent]
                                }
                            };
                            options.agent_not_exist;

                        }else if(item.value == 'requester'){
                            mongoose_ = mongoose.model('User');
                            query = {
                                ed_parent_id: globalOptions.ed_user_id,
                                _id: action.value.value,
                                is_requester: true,
                                roles: {
                                    $in: [enums.UserRoles.requester]
                                }
                            };
                            options.requester_not_exist;
                        }

                        mongoose_.count(query).exec((err, count) => {
                            if (err){
                                return reject_(err);
                            }

                            if(!count){
                                return reject_(message);
                            }
                            return resolve_();
                        });
                    }
                }else{

                    var value_ = _.find(action.value.value, function(o) { return o.key == item.value; });
                    if( value_ == null || value_ == undefined){
                        return reject_(options.value_invalid);
                    }
                    return resolve_();
                }
            }
        });
        tasks.push(promise);
    });

    if (!tasks.length) {
        return next();
    }

    Promise.all(tasks).then(function(result) {
        return next();
    }, function(reason) {
        return next(reason);
    });
};

exports.check_actions = function(value, options, globalOptions, biz_resources, next) {
    var actions = value;

    if(!Array.isArray(actions)){
        return next(options.action_array);
    }

    if(actions.length == 0){
        return next(options.action_required);
    }

    if(actions.length > config.bizRule.maxAction){
        return next(options.max_action);
    }

    var tasks = [];

    actions.forEach((item) => {
        var promise = new Promise((resolve_, reject_) => {
            //check type
            if(_.indexOf(enums.BizRuleType, item.act_type) != -1){
                return reject_(options.type_invalid);
            }

            if( !item.value){
                return reject_(options.value_required);
            }


            if(_.indexOf([enums.BizRuleType.TicketField, enums.BizRuleType.OrgField,enums.BizRuleType.UserField, enums.BizRuleType.RequesterField, enums.BizRuleType.Others], item.act_type) == -1){

                mongoose.model('CustomSetting').count({
                    ed_user_id: globalOptions.ed_user_id,
                    field_key: item.field_key
                }).exec((err, count) => {
                    if (err){
                        return reject_(err);
                    }

                    if(!count){
                        return reject_(options.field_key_not_exist);
                    }
                    return resolve_();
                });

            }else{

                var action = biz_resources.action[item.field_key];

                if( !action){
                    return reject_(options.action_required);
                }

                if(!Array.isArray(action.value.value) && action.value.value === '{{db}}'){
                    var pre_value = _.find(action.value.pre_value, function(o) { return o.key === item.value; }),
                        mongoose_ = null,
                        query = {},
                        message = "";

                    if(pre_value){
                        return resolve_();

                    }else{
                        
                        if (!mongoose.Types.ObjectId.isValid(item.value)) {
                            return reject_(options.not_objectId);
                        }

                        if(item.value == 'group' || item.value == 'email_group'){ //group

                            mongoose_ = mongoose.model('Group');
                            query = {
                                ed_user_id: globalOptions.ed_user_id,
                                _id: item.value
                            };
                            message = options.group_not_exist;

                        }else if(item.value == 'fb_page'){

                            mongoose_ = mongoose.model('UserFbPage');
                            query = {
                                ed_user_id: globalOptions.ed_user_id,
                                _id: item.value
                            };
                            options.fb_page_not_exist;

                        }else if(item.value == 'current_user'){
                            resolve_();

                        }else if(item.value == 'received_at'){

                            mongoose_ = mongoose.model('UserMailAccount');
                            query = {
                                ed_user_id: globalOptions.ed_user_id,
                                mail: item.value
                            };
                            options.email_not_exist;

                        }else if(item.value == 'agent'){
                            mongoose_ = mongoose.model('User');
                            query = {
                                ed_parent_id: globalOptions.ed_user_id,
                                _id: item.value,
                                is_requester: false,
                                roles: {
                                    $in: [enums.UserRoles.agent]
                                }
                            };
                            options.agent_not_exist;

                        }else if(item.value == 'requester'){
                            mongoose_ = mongoose.model('User');
                            query = {
                                ed_parent_id: globalOptions.ed_user_id,
                                _id: item.value,
                                is_requester: true,
                                roles: {
                                    $in: [enums.UserRoles.requester]
                                }
                            };
                            options.requester_not_exist;
                        }

                        mongoose_.count(query).exec((err, count) => {
                            if (err){
                                return reject_(err);
                            }

                            if(!count){
                                return reject_(message);
                            }
                            return resolve_();
                        });
                    }
                }else{

                    var value_ = _.find(action.value.value, function(o) { return o.key == item.value; });
                    if( value_ == null || value_ == undefined){
                        return reject_(options.value_invalid);
                    }
                    return resolve_();
                }
            }
        });
        tasks.push(promise);
    });

    if (!tasks.length) {
        return next();
    }

    Promise.all(tasks).then(function(result) {
        return next();
    }, function(reason) {
        return next(reason);
    });
};


/*
    param:
    {
        _id: ObjectId 
        active: Object //{is_active: true or false} 
        is_only: bool, 
        idOwner: ObjectId, 
        user_id: ObjectId,
        group_id: ObjectId,
        role: 
    }
*/
exports.getBizSettingByAvailability = function(options, next){
    var user_groups = [];
    new Promise(function(resolve, reject) {

        if(options.group_id && options.group_id != 0){
            if (!Utils.isValidObjectId(options.group_id)) {
                if(options.group_id == 1){ // non-group 
                    resolve(null);
                }else{
                    return reject(new TypeError(options.name + '.group.objectid'));
                }
            }else{
                user_groups = [options.group_id];
                resolve(options.group_id);
            }
            
        }else{     
            mongoose.model('GroupUser').find({
                user_id: options.user_id, 
                ed_user_id: options.idOwner
            }).select("group_id").exec((err, groups) =>{
                if(err){
                    return reject(err);
                }

                var idGroups = [];
                groups.forEach((group) => {
                    idGroups[idGroups.length] = group.group_id;
                });
                
                user_groups = idGroups;
                resolve({ $in : idGroups});
            });
        }
    }).then(function(group) {
        return new Promise(function(resolve, reject) {
            var query = {
                $and : [{
                    ed_user_id : options.idOwner
                }]
            };

            if(options._id){
                query.$and.push({
                    _id: options._id
                 });
            }else{
                if(options.active){
                    query.$and.push(options.active);   
                }
            }

            var user_filter = [];
            if (options.role == enums_core.UserRoles.agent || options.is_only === true) {
                query.$and.push({
                    availability: enums_core.Availability.Only_me,
                    user_id : options.user_id
                });
            }else{
                if(options._id){
                    if(options.role == enums_core.UserRoles.agent){
                        user_filter = [{
                            user_id : options.user_id
                        }, {
                            availability: enums_core.Availability.All
                        }, {
                            availability : enums_core.Availability.Group,
                            group_id : group
                        }];
                    }else{
                        user_filter = [{
                            user_id : options.user_id
                        }, {
                            availability: enums_core.Availability.All
                        }, {
                            availability : enums_core.Availability.Group
                        }];
                    }
                    
                }else if(options.group_id == 0){
                    user_filter = [{
                        availability:{
                            $ne : enums_core.Availability.Only_me
                        }
                    }];  
                }else{ //get list
                    if(group){ //find by group
                        user_filter = [{
                            availability : enums_core.Availability.Group,
                            group_id : group
                        }];
                    }else if(options.group_id == 1){ //find by non-group
                        user_filter = [{
                            //availability: enums_core.Availability.All,
                            availability:{
                                $ne : enums_core.Availability.Only_me
                            },
                            group_id : null
                        }];
                    }
                }
            }
            
            if(user_filter.length > 0){
                query.$and.push({
                    $or : user_filter
                });
            }
            return next(null , {query : query, user_groups: user_groups});
        });
        
    }, function(reason) {
         return next(reason);
    });
};

exports.getBizViewByAvailability = function(options, next){
    new Promise(function(resolve, reject) {
        mongoose.model('GroupUser').find({
            user_id: options.user_id, 
            ed_user_id: options.idOwner
        }).select("group_id").exec((err, groups) =>{
            if(err){
                return reject(err);
            }

            var idGroups = [];
            groups.forEach((group) => {
                idGroups[idGroups.length] = group.group_id;
            });

            resolve({ $in : idGroups});
        });
    }).then(function(group) {
        return new Promise(function(resolve, reject) {
            var query = {
                $and: [{
                    ed_user_id : options.idOwner,
                    is_active: true
                }],
                $or: [{
                    availability: enums_core.Availability.All
                }, {
                    user_id: options.user_id,
                    availability: enums_core.Availability.Only_me
                },{
                    availability: enums_core.Availability.Group,
                    group_id: group
                }]
            };
            
            if(options._id){
                query['$and'].push({_id: options._id});
            }
            return next(null ,query);
        });
        
    }, function(reason) {
         return next(reason);
    });
};
