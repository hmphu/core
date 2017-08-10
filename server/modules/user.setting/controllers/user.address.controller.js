'use strict';
//
//  user.address.controller.js
//  handle user address routes
//
//  Created by dientn on 2015-12-25.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    UserAddress = mongoose.model('UserAddress'),
    path = require('path'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    utils = require('../../core/resources/utils'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    validator = require('../validator/user.address.validator'),
    cache = require(path.resolve('./config/lib/redis.cache'));

/**
 * add a new address
 * author : dientn
 */
exports.add = (idOwner, data, next) => {
    var address = new UserAddress(data);
    address.ed_user_id = idOwner;

    tmp_data.save('setting_add_address', idOwner, address, address, (err, result) =>{
        if(err){
            return next(err);
        }
        next(null, address);
    });
};

/**
 * show current address
 * author : dientn
 */
exports.read = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id : idOwner
    };
    cache.findOneWithCache(idOwner, 'user.setting.address', UserAddress, query, (err, result) =>{
        if(err){
            return next(err);
        }
        res.json(result);
    })
};

/**
 * update the current address by id owner
 * author : dientn
 */
exports.update = [
    (req, res, next)=>{
        validator(req.body, next);
    },
    (req, res, next) => {
        var idOwner = utils.getParentUserId(req.user);
        var data = req.body;
        delete data.__v;
        delete data.upd_time;
        if(_.keys(data).indexOf("phone") != -1 && _.keys(data).indexOf("code") != -1){
            data.phone  = `(+${data.code})${data.phone.replace(/^0/g, '')}`;
        }else{
            delete data.phone;
        }
        
        UserAddress.findOne({ed_user_id : idOwner}, (err, address) => {
            if(err){
                return next(err);
            }

            address = _.assign(address, data);
            cache.saveAndUpdateCache(idOwner, 'user.setting.address', address, (errsave) => {
                if(errsave){
                    return next(errsave);
                }
                res.json(address);
            });
        });
    }
];