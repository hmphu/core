'use strict';
//
//  sms.controller.js
//  handle core system routes
//
//  Created by vupl on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    Sms = mongoose.model('Sms'),
    path = require('path'),
    moment = require('moment'),
    config = require(path.resolve('./config/config')),
    utils = require('../../core/resources/utils'),
    utils_sms = require('../resources/utils.sms'),
    cache = require(path.resolve('./config/lib/redis.cache')),
    validate = require('../validator/sms.validator'),
    sendmail = require('../../core/resources/sendmail');

/**
 * add a new sms
 * author : vupl
 */
exports.add = (req, res, next) => {
    var sms = new Sms();
    sms.is_active = false;
    sms.ed_user_id = utils.getParentUserId(req.user);
    sms.customer_type = 2;
    sms.short_code.is_active = false;
    sms.brand.is_active = false;
    sms.brand.time_active = {
        start_time : +moment.utc(),
        end_time : null,
        end : null,
        is_active : false
    };
    sms.save((err) => {
        if (err) {
            return next(err);
        }
        var data = {
            sub_domain: req.user.sub_domain
        }
        var options = {
            from : config.mailer.from,
            to : config.mailer.admin,
            template : 'modules/sms/templates/register-sms-email.html',
            subject : 'Register SMS'
        };
        sendmail(data, options);
        res.json(sms);
    });
};

/**
 * load settings voip
 * author : vupl
 */
exports.loadSettingSms = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: idOwner
    };

    cache.findOneWithCache(idOwner, 'user.setting.sms', Sms, query, (err, sms) =>{
        if( err ){
            return next(err);
        }
        res.json(sms);
    });
}



/**
 * show current sms
 * author : vupl
 */
exports.read = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var query = {
        ed_user_id: idOwner
    };

    cache.findOneWithCache(idOwner, 'user.setting.sms', Sms, query, (err, sms) =>{
        if(err){
            return next(err);
        }
        res.json(sms)
    });
};

/**
 * update the current sms
 * author : vupl
 */
exports.update = [
    (req, res, next) =>{
        delete req.body.ed_user_id;
        delete req.body.customer_type;
        delete req.body.is_active;
        delete req.body.add_time;
        delete req.body.upd_time;
        if(!req.sms.is_active){
            return next(new TypeError("sms.settings.sms_waiting_active"));
        }
        validate.update_setting_sms(req.body, next);
    },
    (req, res, next) => {
        var sms = req.sms;
        var idOwner = utils.getParentUserId(req.user);
        sms.short_code.value = req.body.short_code.value;
        sms.brand.name = req.body.brand.name;
        sms.provider = req.body.provider || utils_sms.defaultProviderSMS();

        cache.saveAndUpdateCache(idOwner, 'user.setting.sms', sms, (err) =>{
            if(err){
                return next(err);
            }
            res.json(sms);
        });
    }
];

/**
 * logically delete the current sms
 * author : vupl
 */
exports.delete = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var sms = req.sms;
    sms.is_active = false;

    cache.saveAndUpdateCache(idOwner, 'user.setting.sms', sms, (err) =>{
        if(err){
            return next(err);
        }
        res.json(sms);
    });
};

/**
 * deactive brand name
 * author : vupl
 */

exports.deactiveBrandName = (req, res, next) => {
    var sms = req.sms,
        idOwner = utils.getParentUserId(req.user);
    sms.brand.name = null;
    sms.brand.end_time = null;
    sms.brand.is_active = false;
    sms.brand.time_active[sms.brand.time_active.length - 1].end_time = +moment.utc();

    sms.brand.time_active[sms.brand.time_active.length] = {
        start_time: +moment.utc(),
        end_time: null,
        is_active: false
    };

    cache.saveAndUpdateCache(idOwner, 'user.setting.sms', sms, (err) =>{
        if(err){
            return next(err);
        }
        res.json(sms);
    });
};


/**
 * Sms middleware
 */
exports.smsByID = (req, res, next, id) => {
    // check the validity of ticket id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError("sms.id.objectId"));
    }
    var idOwner = utils.getParentUserId(req.user);
    // find sms by id
    Sms.findById(id).exec((err, sms) => {
        if (err) {
            return next(err);
        }
        if (!sms || !(_.isEqual(idOwner, sms.ed_user_id))) {
            return next(new TypeError('sms.id.notFound'));
        }
        req.sms = sms;
        next();
    });
};
