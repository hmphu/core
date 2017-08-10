'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    UserSso = mongoose.model('UserSso'),
    path = require('path'),
    validate = require('../validator/user.sso.validator'),
    utils = require('../../core/resources/utils'),
    enums = require('../resources/enums'),
    config = require(path.resolve('./config/config'));

/**
 * update an sso setting
 */
exports.update = [(req, res, next) => {
    if (enums.SsoProvider[req.body.provider]) {
        validate.validate(req.body.provider_data, next);
    } else {
        next(new TypeError('user.sso.unsupported_provider'));
    }
}, (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    
    var query = {
        ed_user_id : idOwner
    };
    
    UserSso.findOne(query, (err, sso) => {
        if (err) {
            return next(err);
        }
        
        if (!sso) {
            return next(new TypeError('user.sso.not_found'));
        }
        
        var providerData = {
            login_url : req.body.provider_data.login_url,
            logout_url : req.body.provider_data.logout_url,
            token : req.body.provider_data.token
        };
        
        sso.provider = req.body.provider;
        sso.provider_data = providerData;
        
        sso.save((saveErr, updatedSso) => {
            if (saveErr) {
                return next(saveErr);
            }
            
            res.json(updatedSso);
        });
    });
}];

/**
 * show current sso setting
 */
exports.read = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    
    var query = {
        ed_user_id : idOwner
    };
    
    UserSso.findOne(query, (err, sso) => {
        if (err) {
            return next(err);
        }
        
        res.json(sso || {});
    });
};

/**
 * enable/disable sso setting
 */
exports.toggle = (req, res, next) => {
    if (!_.isBoolean(req.body.is_enable)) {
        return next(new TypeError("user.sso.is_enable_invalid"));
    }
    
    var idOwner = utils.getParentUserId(req.user);
    
    var query = {
        ed_user_id : idOwner
    };
    
    var update = {
        is_enable : req.body.is_enable,
        upd_time : Date.now(),
        $setOnInsert : {
            provider : enums.SsoProvider.jwt,
            provider_data : {
                login_url : 'http://',
                logout_url : 'http://',
                token : (new mongoose.Types.ObjectId).toString()
            },
            add_time : Date.now()
        }
    };
    
    var option = {
        upsert : true,
        'new' : true
    };
    
    UserSso.findOneAndUpdate(query, update, option, (err, updatedSso) => {
        if (err) {
            return next(err);
        }
        
        if (!updatedSso) {
            return next(new TypeError('user.sso.not_found'));
        }
        
        res.json(updatedSso);
    });
};

/**
 * show current sso setting without token secret
 */
exports.readOnly = (req, res, next) => {
    var subDomain = req.res.locals.sub_domain;
    
    var stages = [{
        $match : {
            sub_domain : subDomain,
            roles : 'owner'
        }
    }, {
        $lookup : {
            from : `${config.dbTablePrefix}user_sso`,
            localField : '_id',
            foreignField : 'ed_user_id',
            as : 'sso'
        }
    }, {
        $match : {
            'sso.is_enable' : true,
            'sso.provider' : {$ne : null}
        }
    }, {
        $project : {
            sso : 1
        }
    }];
    
    var results = [];
    var cursor = User.aggregate(stages).allowDiskUse(true).cursor({ batchSize : 1000 }).exec();
    cursor.each((err, doc) => {
        if (err) {
            return next(err);
        }

        if (doc) {
            results.push(doc);
        } else {
            var sso = results[0] ? results[0].sso[0] : null;
            
            if (sso) {
                delete sso.provider_data.token;
            }
            
            res.json(sso || {});
        }
    });
};
