'use strict';
//
//  dc.controller.js
//  handle core system routes
//
//  Created by khanhpq on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    mongoose = require('mongoose'),
    DynamicContent = mongoose.model('DynamicContent'),
    cache = require(path.resolve('./config/lib/redis.cache')),
    Utils = require('../../core/resources/utils'),
    dc_util = require('../resources/utils'),
    validate = require('../validator/dc.validator');

/**
 * add a new dc
 * author : khanhpq
 */

exports.add = [
    (req, res, next) =>{
        
        validate(req.body, next);
    },
    (req, res, next) =>{
        
        var dc = new DynamicContent(req.body),
            idOwner = Utils.getParentUserId(req.user);
        dc.is_system =false;
        dc.ed_user_id = idOwner;
        dc.placeholder = `{{dc.${dc.placeholder}}}`;
        dc.is_active = true;
        cache.saveAndUpdateCache("dc_" + idOwner, dc._id, dc, (errsave) => {
            if(errsave){
                return next(errsave);
            }
            res.json(dc);
        });
    }
];

/**
 * show current dc
 * author : khanhpq
 */
exports.read = (req, res) => {
    res.json(req.dc);
};

/**
 * update the current dc
 * author : khanhpq
 */
exports.update = (req, res, next) =>{
    var dc = req.dc;

    delete req.body.ed_user_id;
    delete req.body.placeholder;
    delete req.body.is_system;

    if(!_.isBoolean(req.body.is_active)){
        return next(new TypeError('dc.is_active.invalid'));
    }

    if(dc_util.checkNameDc(req.body.name)){
        return next(new TypeError("dc.name.invalid"));
    }

    if(dc.is_system && !req.body.is_active){
        return next(new TypeError('dc.is_system.can_not_deactive'));
    }
    
    // Merge existing dc
    dc = _.assign(dc, req.body);
    dc.placeholder = dc.placeholder.replace('{{dc.', '').replace('}}', '');

    validate(dc, function(err, result){
        if(err){
            return next(err);
        }
        
        dc.placeholder = `{{dc.${dc.placeholder}}}`;

        cache.saveAndUpdateCache("dc_" + dc.ed_user_id, dc._id, dc, (errsave) => {
            if(errsave){
                return next(errsave);
            }
            if(!dc.is_active){
                cache.removeCache("dc_" + dc.ed_user_id, dc._id, (errsave) => {
                    if(errsave){
                        console.error(errsave, 'dc.cache.remove_fail');
                    }
                });
            }
            res.json(dc);
        });
    });
};

/**
 * logically delete the current dc
 * author : khanhpq
 */
exports.delete = (req, res, next) => {
    var dc = req.dc;

    if(dc.is_system){
        return next(new TypeError('dc.is_system.can_not_remove'));
    }
    
    cache.removeDataAndCache("dc_" + dc.ed_user_id, dc._id, dc, null, function(err, result){
        if (err) {
            return next(err);
        }
        res.json({is_success: true});
    });
};


/**
 *
 * author : khanhpq
 * get list dc
 */
exports.list = (req, res) => {

    /*var optionsSendMail = {
        from : "khanhpq@fireflyinnov.com",
        to : ["pqkhanh88@gmail.com", "khanhpq@fireflyinnov.com", "p_q_khanh_18101988@yahoo.com", "p_q_khanh_18101988@yahoo.com.vn"],
        subject : 'Verify email account',
        references : [`test-references-izi@fireflyinnov.com`],
        template : `modules/people/templates/${req.user.language || "en"}/add-user.html`
    };
    require('../../core/resources/sendmail')({}, optionsSendMail);*/

    var params = {
        query: {
            ed_user_id: Utils.getParentUserId(req.user)
        },
        sort: 'add_time',
        skip: req.query.skip,
        sort_order: req.query.sort_order,
        limit: req.query.limit
    };

    if(req.query && req.query.active != null && req.query.active != undefined){
        params.query.is_active = req.query.active != '0' ? true : false;
    }
    
    Utils.findByQuery(DynamicContent, params).exec(function (err, dcs) {

        if (err) {
            return next(err);
        }
        res.json(dcs);
    });
};


/*
    Count all dc
    @author: khanhpq
 */
exports.count = function (req, res, next) {
    var idOwner = Utils.getParentUserId(req.user);

    new Promise(function(resolve, reject) {
        DynamicContent.count({
            ed_user_id: idOwner,
            is_active: true
        }, function (err, count) {
            if (err) {
                return reject(new TypeError('dc.count.fail'));
            }
            resolve(count);
        });
            
    }).then(function(count_active) {

        return new Promise(function(resolve, reject) {
            DynamicContent.count({
                ed_user_id: idOwner,
                is_active: false
            }, function (err, count) {
                if (err) {
                    return reject(new TypeError('dc.count.fail'));
                }
                res.json({count_inactive: count, count_active: count_active});
            });
        });
        
    }, function(reason) {
        next(reason);
    });
};

/**
 * Find PlaceHolder By IdOwner
 * @author Vupl
 */
exports.findByPlaceHolder = (idOwner, next) =>{
    var query = {
        ed_user_id: idOwner
    };
    cache.findWithCache(`dc_${idOwner}`, DynamicContent, query, (err, result) =>{
        if(err){
            console.error(err, "Find by placeholder");
            return next(err);
        }
        return next(null, result);
    });
};

/**
 * DyamicContent middleware
 */
exports.dcByID = (req, res, next, id) => {

    // check the validity of dcs id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('dc.id.objectId'));
    }

    var idOwner = Utils.getParentUserId(req.user);
    // find dcs by its id
    DynamicContent.findById(id).exec((err, dc) => {
        if (err){
            return next(err);
        }
        if (!dc || !_.isEqual(idOwner, dc.ed_user_id)) {
            return next(new TypeError('dc.id.notFound'));
        }
        req.dc = dc;
        next();
    });
};
