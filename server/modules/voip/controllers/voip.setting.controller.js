'use strict';
//
//  voip.controller.js
//  handle core system routes
//
//  Created by vupl on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    mongoose = require('mongoose'),
    VoipSetting = mongoose.model('VoipSetting'),
    provider = require('../provider/index.provider'),
    moment = require('moment'),
    utils = require('../../core/resources/utils'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    validate = require('../validator/voip.validator'),
    enums = require('../resources/enums'),
    cache = require(path.resolve('./config/lib/redis.cache')),
    config = require(path.resolve('./config/config'));

/**
 * Voip enable
  * author : vupl
 */
exports.add = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    VoipSetting.findOne({ ed_user_id : idOwner }, (err, voipSetting) => {
        if (err) {
            return next(err);
        }
        
        if (!voipSetting) {
            voipSetting = new VoipSetting();
            voipSetting.ed_user_id = idOwner;
        }
        
        voipSetting.enable_voip = req.body.enable_voip;
        
        cache.saveAndUpdateCache(idOwner, 'user.setting.voip', voipSetting, (errSave) => {
            if (errSave) {
                return next(errSave);
            }
            
            res.json(voipSetting);
        });
    });
};


/**
 * load settings voip
  * author : vupl
 */
exports.loadSetting = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    
    var query = {
        ed_user_id: idOwner
    };
    
    cache.findOneWithCache(idOwner, 'user.setting.voip', VoipSetting, query, (err, voipSetting) => {
        if (err) {
            return next(err);
        }
        
        res.json(voipSetting);
    });
};


/**
 * show current voip
 * author vupl
 */
exports.read = (req, res) => {
    var voipSetting = req.voipSetting;
    res.json(voipSetting);
};

/**
 * update current voip
 * author vupl
 */
exports.update = [
    (req, res, next) => {
        if (enums.Provider[req.body.provider]) {
            validate.validate_update_settings(req.body, next);
        } else {
            next(new TypeError('voip.unsupported.provider'));
        }
    },
    (req, res, next) => {
        var voipSetting = req.voipSetting;
        var idOwner = utils.getParentUserId(req.user);
        // Merge existing ticket
        req.body.provider_data = provider.setSettings(req.body.provider, req.body.provider_data);
        
        voipSetting = _.assign(voipSetting, req.body);
        
        cache.saveAndUpdateCache(idOwner, 'user.setting.voip', voipSetting, (errSave) => {
            if (errSave) {
                return next(errSave);
            }
            
            res.json(voipSetting);
        });
    }
];

/**
 * logically delete the current voip
 * author : vupl
 */
exports.delete = (req, res, next) => {
    var voipSetting = req.voipSetting;
    voipSetting.is_delete = true;

    voipSetting.save((err) => {
        if (err) {
            return next(err);
        } else {
            res.json(voipSetting);
        }
    });
};

/**
 * Voip middleware
 */
exports.voipByID = (req, res, next, id) => {
    // check the validity of ticket id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError("voip.id.objectId"));
    }
    var idOwner = utils.getParentUserId(req.user);
    // find sms by id
    VoipSetting.findById(id).exec((err, voipSetting) => {
        if (err) {
            return next(err);
        }
        if (!voipSetting || !(_.isEqual(idOwner, voipSetting.ed_user_id))) {
            return next(new TypeError('voip.id.notFound'));
        }
        req.voipSetting = voipSetting;
        next();
    });
};
