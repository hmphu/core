'use strict';
//
//  requester.controller.js
//  handle core system routes
//
//  Created by khanhpq on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    enums = require('../../core/resources/enums.res'),
    Requester = mongoose.model('RequesterFilters'),
    Utils = require('../../core/resources/utils');

/**
 * add a new requester
 * author : khanhpq
 */
exports.add = (req, res, next) =>{
    var requester = new Requester(req.body);
    requester.ed_user_id = Utils.getParentUserId(req.user);
    requester.user_id = req.user._id;
    
    requester.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(requester);
    });
};

/**
 * show current requester
 * author : khanhpq
 */
exports.read = (req, res) => {
    res.json(req.requester);
};

/**
 * update the current requester
 * author : khanhpq
 */
exports.update = (req, res, next) => {
    var requester = req.requester;
    if(req.body){
        delete req.body.ed_user_id;
    }

    // Merge existing requester
    requester = _.assign(requester, req.body);

    requester.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(requester);
    });
};

/**
 * reoder requester
 * author : khanhpq
 */
exports.reorder = (req, res, next) => {
    // init vars
    var arr_requester = req.body.arr_requester,
        tasks = [];

    // init check
    if(!Array.isArray(field_ids)){
        return next(new TypeError('requester.reorder.emply'));
    }

    var idOwner = Utils.getParentUserId(req.user);

    arr_requester.forEach((id, index) => {
        var promise = new Promise((resolve, reject) => {
            // check the existing of requester ids
            Requester.findById(id, (err, requester) => {
                if(err){
                    return reject(err);
                }
                if (!requester || !_.isEqual(requester.ed_user_id, idOwner)) {
                    return reject(new TypeError('requester.id.notFound'));
                }
                // save if exits
                requester.position = index;
                requester.save((err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(requester);
                });
            });
        });
        tasks.push(promise);
    });

    Promise.all(tasks).then(function(values) {
        res.json({
            message: "requester.reorder.success"
        });
    }, function(reason) {
        next(reason);
    });
};

/**
 * logically delete the current requester
 * author : khanhpq
 */
exports.delete = (req, res, next) => {
    var requester = req.requester;

    requester.remove(function (err) {
        if (err) {
            return next(err);
        }
        res.json(requester);
    });
};

/*
    Get all requesters
    @author: khanhpq
 */
exports.list = function (req, res, next) {
    var params = {
        query: {
            ed_user_id: Utils.getParentUserId(req.user)
        },
        select: '_id position name availability is_active add_time',
        sort: 'position',
        skip: req.query.skip
    };
                
    if(req.params.isPersonal === 1){
        params.query['availability'] = {
            $or : [
                {
                    availability: enums.Availability.All
                },
                {
                    group_id: {
                        $in: req.user.group
                    }
                }
            ]
        }
    }else{
        params.query['availability'] = enums.Availability.Only_me;
    }
    
    Utils.findByQuery(Requester, params).exec(function (err, requesters) {
        if (err) {
            return next(err);
        }
        res.json(requesters);
    });
};

/**
 * requester middleware
 */
exports.requesterByID = (req, res, next, id) => {

    // check the validity of requester id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('requester.id.objectId'));
    }

    var idOwner = Utils.getParentUserId(req.user);
    // find requester by its id
    Requester.findById(id).exec((err, requester) => {
        if (err){
            return next(err);
        }
        if (!requester || !_.isEqual(requester.ed_user_id, idOwner)) {
            return next(new TypeError('requester.id.notFound'));
        }
        req.requester = requester;
        next();
    });
};
