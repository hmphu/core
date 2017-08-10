'use strict';
//
//  user.localization.controller.js
//  handle user localization setting routes
//
//  Created by dientn on 2015-12-25.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    UserLocal = mongoose.model('UserLocal'),
    UserCalendar = mongoose.model('UserCalendar'),
    TimeZone = mongoose.model('TimeZone'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    utils = require('../../core/resources/utils'),
    path = require('path'),
    cache = require(path.resolve('./config/lib/redis.cache'));

/**
 * add a new localization setting
 * author : dientn
 */
exports.add = (idOwner, data, next) => {
    // save data
    var local  = new UserLocal(data);
    local.ed_user_id = idOwner;
    tmp_data.save('setting_add_local', idOwner, local, local, (err, result) =>{
        if(err){
            return next(err);
        }
        next(null, local);
    });
};

/**
 * read and cache localization data
 * author : thanhdh
 */
exports.readInternal = (idOwner, next) => {
    var query = {
        ed_user_id : idOwner
    };
    cache.findOneWithCache(idOwner, 'user.setting.local', UserLocal, query, next);
};

/**
 * show current localization setting
 * author : dientn
 */
exports.read = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    
    this.readInternal(idOwner, (err, local) => {
        if(err){
            return next(err);
        }
        res.json(local);
    });
};

/**
 * update the current localization by id owner
 * author : dientn
 */
exports.update = [
    (req, res, next) => {
        if(!req.body.time_zone){
            return next( new TypeError('user.local.time_zone.required') );
        }
        if(!_.isString(req.body.time_zone)){
           return next( new TypeError('user.local.time_zone.invalid') ); 
        }
        
        TimeZone.findById( req.body.time_zone, function( err, timezone ){
            if ( err ) {
                return next(err);
            }
            if (!timezone ) {
                return next( new TypeError('user.local.time_zone.not_found') );
            }
            req.body.time_zone = {
                id: timezone._id,
                value: timezone.value
            };
            return next();
        } );
    },
    (req, res, next) => {
        var idOwner = utils.getParentUserId(req.user);
        delete req.body.__v;
        delete req.body.upd_time;
        UserLocal.findOne({ed_user_id : idOwner}, (err, local) => {
            if(err){
                return next(err);
            }
            local = _.assign(local, req.body);
            cache.saveAndUpdateCache(idOwner, 'user.setting.local', local, (errSave) => {
                if(errSave){
                    return next(errSave);
                }
                
                UserCalendar.findOneAndUpdate({ed_user_id : idOwner},{
                     "$set": {time_zone: local.time_zone.value}
                },{
                    upsert: true,
                    new: true
                },(err, result)=>{
                    if(err){
                        console.error(err);
                    }
                    console.log('Update time zone for calendar success');
                });
                res.json(local);
            });
        });
    }
];
