'use strict';
//
//  people.org.controller.js
//  handle core system routes
//
//  Created by khanhpq on 2016-01-06.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _            = require('lodash'),
    mongoose     = require('mongoose'),
    Utils        = require('../../core/resources/utils'),
    utilsElastics = require('../../elastics/resources/utils'),
    path         = require('path'),
    enumsCore    = require('../../core/resources/enums.res'),
    config       = require(path.resolve('./config/config')),
    rbSender     = require(path.resolve('./config/lib/emitters/sender.rabbitmq')),
    validate     = require('../validator/organization.validator'),
    Org          = mongoose.model('Organization'),
    User         = mongoose.model('User');

/**
 * add Org
 * author : khanhpq
 */
exports.add = [
    (req, res, next) => {
        var idOwner = Utils.getParentUserId(req.user);
        
        req.body.name = _.trim(req.body.name);
        req.body.ed_user_id   = idOwner;
        req.body.user_id = req.user._id;
        
        validate.validate_org(req.body, function(err){
            if(err){
                return next(err);
            }
            
            var tasks = [];
            req.body.domains.forEach((domain)=>{
                var promise = new Promise((resolve, reject) => {
                    Org.count({
                        ed_user_id: idOwner,
                        domains: domain
                    }, function (err, count) {
                        if(err){
                            return reject(err);
                        }

                        if(count > 0){
                            return reject(new TypeError('org.domain.' + domain + '.existed'));
                        }
                        resolve();
                    });
                });
                tasks.push(promise);
            });
            Promise.all(tasks).then(function(result) {
                next();
            }, function(reason) {
                next(reason);
            });
        });
    },
    (req, res, next) =>{
        var org = new Org(req.body);

        //save organization
        org.save((err) => {

            if (err) {
                return next(err);
            }
            
            if(org.tags && org.tags.length > 0){
                rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-core-tag-cloud', payload: {
                    tagCloud: org.tags,
                    idOwner: Utils.getParentUserId(req.user),
                    tag_cloud_type: enumsCore.TagCloud.Org
                }});
            }
            res.json(org);
        });
    }
];

/**
 * show current org
 * author : khanhpq
 */
exports.read = (req, res) => {
    res.json(req.org);
};

/**
 * update the current org
 * author : khanhpq
 */
exports.update = [
    (req, res, next) => {
        var idOwner = Utils.getParentUserId(req.user);
        //req.body.name = _.trim(req.body.name);
        req.body.ed_user_id = idOwner;
        req.body.user_id = req.user._id;
        delete req.body.__v;
        
        req.org = _.assign(req.org, req.body);
        validate.validate_org(req.org, function(err){
            if(err){
                return next(err);
            }
            if(!req.body.domains){
                return next();
            }
            var tasks = [];
            req.body.domains.forEach((domain)=>{
                var promise = new Promise((resolve, reject) => {
                    Org.count({
                        ed_user_id: idOwner,
                        domains: domain
                    }, function (err, count) {
                        if(err){
                            return reject(err);
                        }

                        if(count > 1){
                            return reject(new TypeError('org.domain.' + domain + '.existed'));
                        }
                        resolve();
                    });
                });
                tasks.push(promise);
            });
            Promise.all(tasks).then(function(result) {
                next();
            }, function(reason) {
                next(reason);
            });
        });
    },
    (req, res, next) => {
        req.org.name = _.trim(req.org.name);
        req.org.save((err) => {
            if (err) {
                return next(err);
            }
            
            if(req.org.tags && req.org.tags.length > 0){
                rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-core-tag-cloud', payload: {
                    tagCloud: req.org.tags,
                    idOwner: Utils.getParentUserId(req.user),
                    tag_cloud_type: enumsCore.TagCloud.Org
                }});
            }
            
            res.json(req.org);
        });
    }
];

/**
 * logically delete the current org
 * author : khanhpq
 */
exports.delete = (req, res, next) => {
    var org = req.org,
        org_elastics = req.org.toObject();

    org.remove(function (err) {
        if (err) {
            return next(err);
        }
        // sync to elastics when delete org
        utilsElastics.sendDelete({
            index: `profile-${org_elastics.ed_user_id}`,
            type: 'org',
            id: `${org_elastics._id}`
        });
        res.json({is_succes: true});
    });
};

/*
    Get all org
    @author: khanhpq
 */
exports.list = function (req, res, next) {
    var params = {
        query: {
            ed_user_id: Utils.getParentUserId(req.user)
        },
        skip: req.query.skip,
        sort_order: req.query.sort_order,
        limit: req.query.limit
    };

    if(req.query.name){
        if (Utils.isValidObjectId(req.query.name)) {
            params.query._id = req.query.name;
        }else{
            params.query.name = new RegExp(decodeURI(req.query.name), "i");
        }   
    }
    
    Utils.findByQuery(Org, params).exec(function (err, org) {
        if (err) {
            return next(err);
        }
        res.json(org);
    });
};

/*
    Count all org
    @author: dientn
 */
exports.count = function (req, res, next) {
    var idOwner = Utils.getParentUserId(req.user),
        params = {
            query: {
                ed_user_id: idOwner
            },
            is_count: true
        };
    Utils.findByQuery(Org, params).exec(function (err, count) {
        if (err) {
            return next(err);
        }
        res.json({count: count});
    });
};

/*
 *
 *
 */
exports.findById_Internal = (org_id, next) =>{
    Org.findById(org_id).exec((err, result) =>{
        if(err){
            return next(err);
        }
        return next(null, result);
    });
};


exports.searchRequesterByOrgId = (req, res, next) =>{
    var org_id = req.params.org_id_search;
    var requester_name = req.query.name;
    
    var params = {
        query: {
            ed_parent_id: Utils.getParentUserId(req.user),
            roles: [enumsCore.UserRoles.requester],
            is_suspended: false
        },
        select: '_id name roles org_id ',
        skip: req.query.skip,
        sort_order: req.query.sort_order,
        limit: req.query.limit
    };
    
    if(org_id != 'null'){
        params.query.org_id = org_id;
    }

    if(requester_name != null && requester_name != undefined && requester_name != ""){
        params.query.name = new RegExp(Utils.escapeRegExp(decodeURI(req.query.name)), "i");
    }
    Utils.findByQuery(User, params).exec(function (err, result) {
        if (err) {
            return next(err);
        }
        res.json(result);
    });
};


/**
 * orgByID middleware
 * author: khanhpq
 */
exports.orgByID = (req, res, next, id) => {

    // check the validity of org id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('people.org.id.objectId'));
    }

    var idOwner = Utils.getParentUserId(req.user);
    // find org by its id
    
    Org.findById(id).exec((err, org) => {
        if (err){
            return next(err);
        }
        //Check is owner
        if (!org || !_.isEqual(org.ed_user_id, idOwner)) {
            return next(new TypeError('people.org.id.notFound'));
        }

        req.org = org;
        req.body.ed_user_id = idOwner;
        next();
    });
};
