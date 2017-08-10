'use strict';
//
//  rating.controller.js
//
//  Created by khanhpq.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    mongoose = require('mongoose'),
    Rating = mongoose.model('Rating'),
    cache = require(path.resolve('./config/lib/redis.cache')),
    Utils = require('../../core/resources/utils'),
    validate = require('../validator/rating.validator');

/**
 * add a new rating
 * author : khanhpq
 */

exports.add = (req, res, next) =>{
    var rating = new Rating(req.body);
    rating.ed_user_id = Utils.getParentUserId(req.user);
    
    Rating.findOne({
        ed_user_id: Utils.getParentUserId(req.user)
    }, (err, result) => {

        if(err){
            return reject(err);
        }
        
        if(result){
            rating = result;
            rating.theme = req.body.theme;
        }
       
        rating.save((errsave) => {
            if(errsave){
                return next(errsave);
            }

            res.json(rating);
        });
    });
};

/**
 * show current rating
 * author : khanhpq
 */
exports.read = (req, res) => {
    var idOwner = null;
    if(req.user){
        idOwner = Utils.getParentUserId(req.user);
    }else{
        idOwner = req.params.rating_ed_id;
    }
    
    Rating.findOne({
        ed_user_id: idOwner
    }, (err, result) => {
        if(err){
            return reject(err);
        }
        if(!result){
            return res.json({});
        }
        result.ed_user_id = undefined;
        res.json(result);
     });
};

/**
 * update the current rating
 * author : khanhpq
 */
exports.update = (req, res, next) =>{
     Rating.findOne({
        ed_user_id: Utils.getParentUserId(req.user)
     }, (err, rating) => {

        if(err){
            return reject(err);
        }

        delete req.body.ed_user_id;
        rating = _.assign(rating, req.body);

        rating.remove(function (err) {
            if (err) {
                return next(err);
            }
            res.json({is_success: true});
        });
     });
};

/**
 * logically delete the current rating
 * author : khanhpq
 */
exports.delete = (req, res, next) => {
     Rating.findOne({
        ed_user_id: Utils.getParentUserId(req.user)
     }, (err, rating) => {

        if(err){
            return reject(err);
        }

        rating.remove(function (err) {
            if (err) {
                return next(err);
            }
            res.json({is_success: true});
        });
     });
};
