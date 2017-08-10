'use strict';
//
//  user.agent.controller.js
//  handle user agent setting routes
//
//  Created by dientn on 2015-12-25.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    UserAgent = mongoose.model('UserAgent'),
    path = require('path'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    utils = require('../../core/resources/utils'),
    cache = require(path.resolve('./config/lib/redis.cache')),
    validator = require('../validator/user.agent.validator');

/**
 * add a new agent setting
 * author : dientn
 */
exports.add = (idOwner, data, next) =>{
    var agentSetting = new UserAgent(data);
    agentSetting.ed_user_id = idOwner;

    tmp_data.save('setting_add_agent', idOwner, agentSetting, agentSetting, (err, result) =>{
        if(err){
            return next(err);
        }
        next(null, agentSetting);
    });
};

/**
 * show current agent setting
 * author : dientn
 */
exports.read = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: idOwner
    };
    cache.findOneWithCache(idOwner, 'user.setting.agent', UserAgent, query, (err, agentSetting) =>{
        if(err){
            return next(err);
        }
        res.json(agentSetting);
    })
};

/**
 * update the current agent settting by id owner
 * author : dientn
 */
exports.update = [
    (req, res, next)=>{
        validator(req.body, next);
    },
    (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var setting = req.body;
    delete setting.__v;
    delete setting.upd_time;
        
    UserAgent.findOne({ed_user_id : idOwner}, (err, agentSetting) => {
        if(err){
            return next(err);
        }
        if(!agentSetting){
            return next(new TypeError('user.agent.not_found'));
        }
        
        agentSetting = _.assign(agentSetting, setting);
        cache.saveAndUpdateCache(idOwner, 'user.setting.agent', agentSetting, (err) =>{
            if(err){
                return next(err);
            }
            res.json(agentSetting);
        })
    });
}];
