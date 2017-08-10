'use strict';
//
// custom_setting.controller.js
// handle core system routes
//
// Created by khanhpq on 2015-12-17.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    enums = require('../resources/enums.res'),
    provider_index = require('../providers/index.provider'),
    provider_type = require('../providers/type.provider'),
    CustomSetting = mongoose.model('CustomSetting'),
    translation = require('../resources/translate.res'),
    Utils = require('../../core/resources/utils');

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========
var setTypeData = function(type, type_data){
    switch (type){
        case enums.CustomFieldType.dropdown:
            return provider_type.setDropdown(type_data);

        case enums.CustomFieldType.slider:
            var regex = /^[0-9]+$/;
            if(regex.test(type_data.min)){
                type_data.min = _.parseInt(type_data.min);
            }
            
            if(regex.test(type_data.max)){
                type_data.max = _.parseInt(type_data.max);
            }
            
            return provider_type.setSlider(type_data);

        case enums.CustomFieldType.switch:
            return provider_type.setSwitch(type_data);

//        case enums.CustomFieldType.choice:
//            type_data = provider_type.setChoice(type_data);
//            break;
            
        case enums.CustomFieldType.date:
            return provider_type.setDate(type_data);
            
        case enums.CustomFieldType.numeric:
            return provider_type.setNumeric(type_data);
            
        case enums.CustomFieldType.text:
            return provider_type.setText(type_data);
    };
};

var setProviderData = function(type, provider_data){
    if(type == enums.Provider.ticket){
//        provider_data = provider_index.setTicket(provider_data);
        
    }else if(type == enums.Provider.org){
        provider_data = provider_index.setOrg(provider_data);
        
    }else if(type == enums.Provider.user){
        provider_data = provider_index.setUser(provider_data);
    }
    
    return provider_data;
};

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========
/**
 * add a new custom_setting author : khanhpq
 */
exports.add = [
    (req, res, next) =>{
        CustomSetting.findOne({
            ed_user_id: Utils.getParentUserId(req.user),
            provider: req.params.custom_type
        }).
        select("_id ed_user_id position").
        sort({position: -1}).
        exec((err, result) => {
            if (err) {
                return next(err);
            }
            
            if(!result){
                req.body.position = 0;
                return next();
            }
            req.body.position = result.position + 1;
            next();
        });
    },
    (req, res, next) => {
        if(req.body.provider != req.params.custom_type){
            return next(new TypeError('custom_settings.diff_provider'));
        }

        mongoose.model('CustomSetting').count({
            provider: req.params.custom_type,
            ed_user_id: Utils.getParentUserId(req.user),
            name: req.body.name
        }, function (err, count) {
            if(err){
                return next(err);
            }

            if(count > 0){
                return next(new TypeError('custom_settings.name_exist'));
            }
            return next();
        });
    },
    (req, res, next) =>{
        var body = req.body;

        body.provider_data = setProviderData(body.provider, body.provider_data || {});
        body.cs_type_data = setTypeData(body.cs_type, body.cs_type_data || {});

        if(body.provider_data){
            if(body.provider_data.agent_id == null || body.provider_data.agent_id == ''){
                delete body.provider_data.agent_id;
            }
            if(body.provider_data.group_id == null || body.provider_data.group_id == ''){
                delete body.provider_data.group_id;
            }
            if(body.provider_data.group_id && body.provider_data.agent_id){
                delete body.provider_data.group_id;
            }
        }else{
            return next(new TypeError('custom_settings.not_found_provider_data'));
        }
        
        var custom_setting = new CustomSetting(body);
        custom_setting.ed_user_id = Utils.getParentUserId(req.user);

        custom_setting.save((err) => {
            if (err) {
                return next(err);
            }
            res.json(custom_setting);
        });
    },
    
];

/**
 * show current custom_setting author : khanhpq
 */
exports.read = (req, res) => {
    res.json(req.custom_setting);
};

/**
 * show current custom_setting author : khanhpq
 */
exports.clone = (req, res) => {
    req.custom_setting.name += "_" + translation[req.user.language || "en"].clone;
    res.json(req.custom_setting);
};

/**
 * update the current custom_setting author : khanhpq
 */
exports.update = [
    (req, res, next) => {

        mongoose.model('CustomSetting').count({
            provider: req.custom_setting.provider,
            ed_user_id: Utils.getParentUserId(req.user),
            name: req.custom_setting.name
        }, function (err, count) {
            if(err){
                return next(err);
            }
            if(count > 1){
                return next(new TypeError('custom_settings.name_exist'));
            }
            return next();
        });
    },
    (req, res, next) => {
        var custom_setting = req.custom_setting,
            body = req.body;

        if(custom_setting.provider != req.params.custom_type){
            return next(new TypeError('custom_settings.diff_provider'));
        }

        delete body.field_key;
        delete body.position;
        delete body.provider;
        delete body.upd_time;
        delete body.add_time;
        delete body.ed_user_id;
        delete body.__v;

        if(custom_setting.provider == enums.Provider.org){
            delete body.provider_data;
        }else if(custom_setting.provider == enums.Provider.ticket){
            if(body.provider_data){
                if(body.provider_data.agent_id == null || body.provider_data.agent_id == ''){
                    delete body.provider_data.agent_id;
                }
                if(body.provider_data.group_id == null || body.provider_data.group_id == ''){
                    delete body.provider_data.group_id;
                }
                if(body.provider_data.group_id && body.provider_data.agent_id){
                    delete body.provider_data.group_id;
                }
            }
        }
        delete body.cs_type;
        // Merge existing custom_setting
        custom_setting = _.assign(custom_setting, body);

        if(custom_setting.provider && custom_setting.provider_data){
            custom_setting.provider_data = setProviderData(custom_setting.provider, custom_setting.provider_data || {});
        }

        if(custom_setting.cs_type && custom_setting.cs_type_data){
             custom_setting.cs_type_data = setTypeData(custom_setting.cs_type, custom_setting.cs_type_data || {});
        }

        custom_setting.save((err) => {  
            if (err) {
                return next(err);
            }
            res.json(custom_setting);
        });
    }
];

/**
 * reoder custom_setting author : khanhpq
 */

exports.reorder = (req, res, next) => {
    var id_from = req.params.cs_id_from,
        id_to = req.params.cs_id_to,
        max_position = null,
        position_from = null,
        position_to = null,
        idOwner = Utils.getParentUserId(req.user);
    
	new Promise(function(resolve, reject) {
        // get max position
        CustomSetting.findOne({
            ed_user_id: idOwner
        }).
        select("_id ed_user_id position").
        sort({position: -1}).
        exec((err, result) => {
            if (err) {
                return reject(err);
            }

            if(!result){
                return reject('custom.setting.postion.have_not_position');
            }
            max_position = result.position;
            resolve();
        });
    }).then(function() {
        // get cs item from id_from
        return new Promise(function(resolve, reject) {
            CustomSetting.findOne({
                _id: id_from
            }).
            exec((err, result) => {
                if (err) {
                    return reject(err);
                }
                
                if (!result || !_.isEqual(result.ed_user_id, idOwner)) {
                    return next('custom.setting.id_from.not_found');
                }
                
                if(result.position > max_position){
                    return next('custom.setting.id_from.position.must_less_than_max_position');
                }
                
                resolve(result);
            });
        });
    }).then(function(cs_from) {
        // get cs item from id_to
        return new Promise(function(resolve, reject) {
            CustomSetting.findOne({
                _id: id_to
            }).
            exec((err, result) => {
                if (err) {
                    return reject(err);
                }
                
                if (!result || !_.isEqual(result.ed_user_id, idOwner)) {
                    return next('custom.setting.id_to.not_found');
                }
                
                if(result.position > max_position){
                    return next('custom.setting.id_to.position.must_less_than_max_position');
                }
                
                resolve({
                    cs_from: cs_from,
                    cs_to: result
                });
            });
        });
    }).then(function(data) {
        return new Promise(function(resolve, reject) {
            var position_query = {};
            position_from = data.cs_from.position;
            position_to = data.cs_to.position;
            
            if(data.cs_from.position > data.cs_to.position){
                position_query = {
                    $gte: data.cs_to.position,
                    $lt: data.cs_from.position
                };
            }else{
                position_query = {
                    $gt: data.cs_from.position,
                    $lte: data.cs_to.position
                };  
            }

            CustomSetting.find({
                ed_user_id: idOwner,
                position: position_query
            }).exec((err, results) => {

                if (err){
                    return reject(err);
                }

                if (!results || results.length == 0) {
                    return reject('custom.setting.reorder.not_found_items');
                }
                
                if(data.cs_from.position > data.cs_to.position){
                    data.cs_from.position = data.cs_to.position - 1;
                    results.unshift(data.cs_from);
                }else{
                    data.cs_from.position = data.cs_to.position + 1;//
                    results[results.length] = data.cs_from;
                }     
                
                data.css = results;
                resolve(data);
            });
        });

    }).then(function(data) {

        return new Promise(function(resolve, reject) {
            var tasks = [],
                css = data.css;
            for(var i = 0; i < css.length; i++){
                
                if(position_from > position_to){
                    css[i].position = css[i].position + 1;
                }else{
                    css[i].position = css[i].position - 1;
                }

                var promise = new Promise((resolve_, reject_) => {
                    css[i].save((err) => {
                        if(err){
                            return reject_(err);
                        }
                        resolve_();
                    });
                });
                tasks.push(promise);
            }

            Promise.all(tasks).then(function(values) {
                res.json({});
            }, function(reason) {
                next(reason);
            });
        });

    }, function(reason) {
        next(reason);
    });
};


/**
 * logically delete the current custom_setting author : khanhpq
 */
exports.delete = (req, res, next) => {
    var custom_setting = req.custom_setting;

    if(custom_setting.is_required){
        return next(new TypeError('custom_settings.cannot_delete'));
    }
    
    custom_setting.remove(function (err) {
        if (err) {
            return next(err);
        }
        res.json(custom_setting);
    });
};


/**
 * remove all cs inactive author : khanhpq
 */
exports.deleteInactive = (req, res, next) => {
    var idOwner = Utils.getParentUserId(req.user),
        tasks = [];
    
    CustomSetting.find({
        ed_user_id: idOwner,
        provider: req.params.custom_type,
        is_active: false
    }).exec((err, arr_cs) =>{
        if(err){
            return next(err);
        }
        
        arr_cs.forEach((cs) => {
            var promise = new Promise((resolve, reject) => {
                cs.remove(function (err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                 });
            });
            tasks.push(promise);
        });

        Promise.all(tasks).then(function(triggers) {
            res.json({is_succes: true});

        }, function(reason) {
            return next(reason);
        });
         
    });
};

/*
 * Count all cs @author: khanhpq
 */
exports.count = function (req, res, next) {
    var idOwner = Utils.getParentUserId(req.user);
    
    new Promise(function(resolve, reject) {
        CustomSetting.count({
            ed_user_id: idOwner,
            is_active: true,
            provider: req.params.custom_type
        }, function (err, count) {
            if (err) {
                return reject(new TypeError('custom.setting.count.fail'));
            }
            resolve(count);
        });
            
    }).then(function(count_active) {

        return new Promise(function(resolve, reject) {
            CustomSetting.count({
                ed_user_id: idOwner,
                is_active: false,
                provider: req.params.custom_type
            }, function (err, count) {
                if (err) {
                    return reject(new TypeError('custom.setting.count.fail'));
                }
                res.json({count_inactive: count, count_active: count_active});
            });
        });
        
    }, function(reason) {
        next(reason);
    });
};


/*
 * Get all custom_settings @author: khanhpq
 */

exports.list = function (req, res, next) {
    var params = {
        query: {
            ed_user_id: Utils.getParentUserId(req.user),
            provider: req.params.custom_type,
            is_active: req.query.is_active === "1"
        },
        skip: req.query.skip,
        sort_order: 1,
        sort: 'position',
        limit: req.query.limit || config.paging.limit
    };

    var req_query = {
        is_requester: {
            is_requester : req.query.is_requester == 1
        },
        group_id: {
            group_id : req.query.group_id
        },
        agent_id: {
            agent_id : req.query.agent_id
        }
    }

    _.forIn(req_query, function(value, key) {
        if(req.query[key]){
            params.query["provider_data"] = value;
        }
    });
    
    Utils.findByQuery(CustomSetting, params).exec(function (err, custom_settings) {
        if (err) {
            return next(err);
        }
        res.json(custom_settings);
    });
};

/**
 * custom_setting middleware author-: khanhpq
 */
exports.custom_settingByID = (req, res, next, id) => {

    // check the validity of custom_setting id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('custom_settings.id_notfound'));
    }

    var idOwner = Utils.getParentUserId(req.user);
    // find custom_setting by its id
    CustomSetting.findById(id).exec((err, custom_setting) => {
        if (err){
            return next(err);
        }
        if (!custom_setting || !_.isEqual(custom_setting.ed_user_id, idOwner)) {
            return next(new TypeError('custom_settings.id_notfound'));
        }
        
        req.custom_setting = custom_setting;
        next();
        
    });
};

/**
 * custom_settingByType middleware author-: khanhpq
 */
exports.custom_settingByType = (req, res, next, type) => {
    // check the validity of custom_setting type
    if (!type || enums.Provider[type] == undefined){
        
        return next(new TypeError('custom.setting.custom_type.invalid'));
    }
    
    req.params.custom_type = enums.Provider[type];

    next();
};

/**
 * middleware author-: khanhpq
 */
exports.position_valid = (req, res, next, position) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.cs_id_from)) {
        return next(new TypeError('custom.setting.reorder.id_from.objectId'));
    }
    
    if (!mongoose.Types.ObjectId.isValid(req.params.cs_id_to)) {
        return next(new TypeError('custom.setting.reorder.id_to.objectId'));
    }
    
    next();
};

exports.customs_settingFindOneByQuery = (data, next) =>{
    var query = {
        ed_user_id: data.ed_user_id,
        field_key: data.field_key,
        is_active: data.is_active
    };
    CustomSetting.findOne(query).exec((err, result) =>{
        if(err){
            console.error(err);
            return next(err);
        }
        if(!result){
            return next(null, null);
        }
        return next(null, result);
    })
}
