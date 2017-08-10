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
    GooglePlay = mongoose.model('GooglePlay'),
    Utils = require('../../core/resources/utils');

/**
 * show current google_play
 * author : khanhpq
 */
exports.read = (req, res) => {
    findByEdUser(Utils.getParentUserId(req.user), (err, result) => {
        res.json(result);
    });
};

/**
 * update the current google_play
 * author : khanhpq
 */
exports.update = (req, res, next) =>{
    findByEdUser(Utils.getParentUserId(req.user), (err, google_play) => {
        delete req.body.ed_user_id;
        // Merge existing google_play
        google_play = _.assign(google_play, req.body);
        google_play.save((errsave) => {
            if(errsave){
                return next(errsave);
            }
            res.json(google_play);
        });
    });
};

/**
 * logically delete the current google_play
 * author : khanhpq
 */
exports.delete = (req, res, next) => {
    findByEdUser(Utils.getParentUserId(req.user), (err, google_play) => {
        google_play.remove(function (err) {
            if (err) {
                return next(err);
            }
            res.json({is_success: true});
        });
    });
};

/**
 * deactive or active
 * @author: khanhpq
 */
exports.toggle = (req, res, next) => {
    findByEdUser(Utils.getParentUserId(req.user), (err, google_play) => {
        google_play.is_active = !google_play.is_active;
        google_play.save((errsave) => {
            if(errsave){
                return next(errsave);
            }
            res.json({is_success: true});
        });
    });
};

var findByEdUser = (ed_user_id, next) => {
    GooglePlay.findOne({
        ed_user_id: ed_user_id
    }).exec((err, result) => {
        if (err) {
            return next(new TypeError('googleplay.app.id.notFound'));
        }

        next(err, result);
    });
};
