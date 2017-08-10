'use strict';
//
//  googleplay.controller.js
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
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    GooglePlayApp = mongoose.model('GooglePlayApp'),
    Utils = require('../../core/resources/utils'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    googlePlay = require('../../core/resources/google.play'),
    validate = require('../validator/googleplay.app.validator');

/**
 * add a new GooglePlayApps
 * author : khanhpq
 */
exports.add = (req, res, next) =>{
    var app = new GooglePlayApp(req.body),
        idOwner = Utils.getParentUserId(req.user);

    app.ed_user_id = idOwner;
    app.is_active = true;
    app.save((errsave) => {
        if(errsave){
            return next(errsave);
        }
        if(req.body.getReview === true){
            app.req_user = req.user;
            emitter.emit('evt.googleplay.app.getReview', app);
        }
        app.service_account_key = undefined;
        res.json(app);
    });
};


/**
 * show current app
 * author : khanhpq
 */
exports.read = (req, res) => {
    req.google_app.service_account_key = undefined;
    res.json(req.google_app);
};

/**
 * update the current google_app
 * author : khanhpq
 */
exports.update = (req, res, next) =>{
    var google_app = req.google_app;

    delete req.body.ed_user_id;
    delete req.body.is_active;
    if(google_app.app_id == req.body.app_id){
        delete req.body.last_review_id;
    }else{
        google_app.body.last_review_id = "";
    }

    // Merge existing google_app
    google_app = _.assign(google_app, req.body);
    google_app.save((errsave) => {
        if(errsave){
            return next(errsave);
        }

        if(google_app.getReview === true && google_app.is_active === true){
            google_app.req_user = req.user;
            emitter.emit('evt.googleplay.app.getReview', google_app);
        }

        google_app.service_account_key = undefined;
        res.json(google_app);
    });
};

/**
 * remove all inactive author : khanhpq
 */
exports.deleteInactive = (req, res, next) => {
    var idOwner = Utils.getParentUserId(req.user),
        tasks = [];

    GooglePlayApp.find({
        ed_user_id: idOwner,
        is_active: false
    }).exec((err, arr) =>{
        if(err){
            return next(err);
        }

        arr.forEach((app) => {
            var promise = new Promise((resolve, reject) => {
                app.remove(function (err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
            tasks.push(promise);
        });

        Promise.all(tasks).then(function(apps) {
            res.json({is_succes: true});

        }, function(reason) {
            return next(reason);
        });
    });
};

/**
 * logically delete the current google_app
 * author : khanhpq
 */
exports.delete = (req, res, next) => {
    var google_app = req.google_app;
    google_app.remove(function (err) {
        if (err) {
            return next(err);
        }
        res.json({is_success: true});
    });
};

/**
 *
 * author : khanhpq
 * get list google_app
 */
exports.list = (req, res) => {
    var idOwner = Utils.getParentUserId(req.user),
        params = {
            query: {
                ed_user_id: idOwner,
                is_active: req.params.is_active == 1? true: false
            },
            select: 'name is_active add_time _id',
            skip: req.query.skip,
            sort_order: 1,
            sort: 'add_time',
            limit: req.query.limit || config.paging.limit
        };

    Utils.findByQuery(GooglePlayApp, params).exec(function (err, apps) {
        if (err) {
            return next(err);
        }
        res.json(apps);
    });
};


/*
    Count all google_app
    @author: khanhpq
 */
exports.count = function (req, res, next) {
    var idOwner = Utils.getParentUserId(req.user);

    new Promise(function(resolve, reject) {
        GooglePlayApp.count({
            ed_user_id: idOwner,
            is_active: true
        }, function (err, count) {
            if (err) {
                return reject(new TypeError('googleplay.app.count.fail'));
            }
            resolve(count);
        });

    }).then(function(count_active) {

        return new Promise(function(resolve, reject) {
            GooglePlayApp.count({
                ed_user_id: idOwner,
                is_active: false
            }, function (err, count) {
                if (err) {
                    return reject(new TypeError('googleplay.app.count.fail'));
                }
                res.json({count_inactive: count, count_active: count_active});
            });
        });

    }, function(reason) {
        next(reason);
    });
};

/**
 * deactive or active
 * @author: khanhpq
 */
exports.toggle = (req, res, next) => {
    var google_app = req.google_app,
        idOwner = Utils.getParentUserId(req.user),
        is_active = null;

    google_app.is_active = !google_app.is_active;
    google_app.save((errsave) => {
        if(errsave){
            return next(errsave);
        }
        res.json({is_success: true});
    });
};

/**
 * GooglePlayApp middleware
 */
exports.googleplayAppByID = (req, res, next, id) => {

    // check the validity of id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('googleplay.app.id.objectId'));
    }

    var idOwner = Utils.getParentUserId(req.user);
    // find google_apps by its id
    GooglePlayApp.findById(id).exec((err, google_app) => {
        if (err){
            return next(err);
        }
        if (!google_app || !_.isEqual(idOwner, google_app.ed_user_id)) {
            return next(new TypeError('googleplay.app.id.notFound'));
        }
        req.google_app = google_app;
        next();
    });
};
