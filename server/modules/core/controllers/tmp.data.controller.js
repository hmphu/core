'use strict';
//
//  tmp data.controller.js
//  common functions of system
//
//  Created by vupl on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//
/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    TmpData = mongoose.model('TmpData');

/**
 * add tmp data
 * author @ vupl
 */
var addTmp = (key, ed_user_id, data) => {
    var tmp_data = new TmpData();
    tmp_data.key = key;
    tmp_data.data = data;
    tmp_data.ed_user_id = ed_user_id;
    tmp_data.save((err) => {
        if(err){
            console.error(err);
            return;
        }
        return;
    });
};

/**
 * save data into DB and save tmp data if failed
 * author : thanhdh
 */
exports.save = (key, ed_user_id, data, model, next) =>{
    // save data into DB and save tmp data if failed
    model.save((err, result) => {
        if(err){
            addTmp(key, ed_user_id, data);
            return next(err);
        }
        return next(null, result);
    });
};

/**
 * findOne and save tmp data if failed
 * author : thanhdh
 */
exports.findOne = (key, ed_user_id, data, model, query, next) =>{
    // load data into DB and save tmp data if failed
    model.findOne(query, (err, result) => {
        if(err){
            addTmp(key, ed_user_id, data);
            return next(err);
        }
        return next(null, result);
    });
};

/**
 * findOneAndUpdate and save tmp data if failed
 * author : thanhdh
 */
exports.findOneAndUpdate = (key, ed_user_id, data, model, query, next) =>{
    // load data into DB and save tmp data if failed
    model.findOneAndUpdate(query, data.update, data.options, (err, result) => {
        if(err){
            addTmp(key, ed_user_id, data);
            return next(err);
        }
        return next(null, result);
    });
};

/**
 * add tmp data for custom data (not a model)
 * author : lamtv
 */
exports.saveWithData = addTmp;
