'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    mongoose = require('mongoose'),
    moment = require('moment'),
    multer = require('multer'),
    jwt = require('jsonwebtoken'),
    config = require(path.resolve('./config/config')),
    utils = require('../../../core/resources/utils'),
    local_utils = require('../../resources/utils'),
    upload = require('../../../core/resources/upload'),
    file = require('../../../core/resources/file'),
    validate = require('../../validator/user.validator'),
    cache = require(path.resolve('./config/lib/redis.cache')),
    UserSetting = mongoose.model('UserSetting'),
    User = mongoose.model('User');

/**
 * Update user details
 */
module.exports.update = [
    (req, res, next) => {
        // remove sensitive data
        delete req.body.sub_domain;
        delete req.body.password;
        delete req.body.confirmed_password;
        delete req.body.roles;
        delete req.body.salt;
        delete req.body.is_requester;
        delete req.body.provider;
        delete req.body.provider_data;
        delete req.body.additional_provider_data;
        delete req.body.is_suspended;
        delete req.body.is_verified;
        delete req.body.email;

        // Init Variables
        var user = req.user;
        // Merge existing user
        user = _.assign(user, req.body);
        validate(user, false, next);
    },
    (req, res, next) =>{
        var idOwner = utils.getParentUserId(req.user);
        cache.saveAndUpdateCache(idOwner, req.user._id, req.user, (err) => {
            if (err) {
                return next(err);
            }
            req.login(req.user, (err) =>{
                if (err) {
                    return next(new TypeError('common.users.unauthenticated'));
                }
                req.user.salt = undefined;
                req.user.password = undefined;
                res.json(req.user);
            });
        });
    }
];

/**
 * Update profile picture
 */
module.exports.changeProfilePicture = (req, res, next) =>{
    var user = req.user,
        idOwner = utils.getParentUserId(user);

    // set profile img for user
    user.profile_image = req.file.filename;
    cache.saveAndUpdateCache(idOwner, user._id, user, (err) => {
        if(err){
            return next(err);
        }
        file.moveFile(idOwner, [req.file]);
        req.user.salt = undefined;
        req.user.password = undefined;
        res.json(user);
    });
};

/**
 * suspend a user
 */
module.exports.suspend = (req, res, next) =>{
    // init params
    var user = req.user,
        idOwner = utils.getParentUserId(user);

    // set suspended status for user
    user.is_suspended = true;
    cache.saveAndUpdateCache(idOwner, user._id, user, (err) => {
        if (err) {
            return next(err);
        }
        req.user.salt = undefined;
        req.user.password = undefined;
        res.json(user);
    });
};

/**
 * Send User
 */
module.exports.me = (req, res) =>{
    res.json(local_utils.getUserData(req.user || {}));
};

/**
 * Send Token
 */
module.exports.internalToken = (req, res) =>{
    if (!req.user) { return res.json({ token : "" }); }
    var token = jwt.sign({
        email : req.user.email,
        sub_domain : req.user.sub_domain
    }, config.loginSecret, { expiresIn: 30 });
    res.json({ token : token });
};

/**
 * get the current user setting
 * author : dientn
 */
exports.userById = (req, res, next) =>{
    if(!req.user){
        return next(new TypeError('user.user.not_found'));
    }
    User.findById(req.user._id, (err, user) =>{
        if(err){
            return next(err);
        }
        if(!user || user.is_suspended){
            return next(new TypeError('user.user.not_found'));
        }
        req.user = user;
        next();
    });
};

/**
 * get the current user setting
 * author : dientn
 */
exports.changeSubdomain = (idOwner, sub_domain, next) =>{
    if(!sub_domain){
        return;
    }
    cache.massUpdateAndDeleteAllCache(idOwner, User, { $or: [{_id: idOwner}, {ed_parent_id: idOwner}] }, { sub_domain: sub_domain }, { multi: true }, next );
};

/**
 * get the current user setting
 * author : dientn
 */
module.exports.userByIdInternal = (req, idOwner, userId, next) => {
    var queries = [{
        _id : userId
    }, {
        ed_user_id : idOwner
    }];
    // find user setting by its owner id
    cache.findOneWithMCache(idOwner, [userId, 'user.setting.setting'], [User, UserSetting], queries, (err, data) => {
        if (err){
            return next(err);
        }
        if(!Array.isArray(data) || data.length != 2){
            return next(new TypeError('common.users.nodata'));
        }
        var user = data[0];
        user.salt = undefined;
        user.password = undefined;
        user.settings = data[1];
        if(user.is_suspended == true){
            return next(new TypeError('common.users.suspended'));
        }
        // check expired url
        var days = moment(user.settings.plan_expiration).diff(moment.utc(), 'minutes');
        if(req.method.toUpperCase() != 'GET' && days <= 0 && !config.unExpiredUrl.some(item => req.url.indexOf(item) !== -1)){
            return next(new TypeError('common.users.expired'));
        }
        return next(null, user);
    });
};

/**
 * get users by owner id
 * author : dientn
 */
exports.userByOwnerIdInternal = (idOwner, next) => {
    var query = {
        $or:[
            {_id : idOwner},
            {ed_parent_id : idOwner}
        ],
        is_suspended: false,
        is_requester: false
    };

    // find user setting by its owner id
    User.find(query, (err, data) => {
        if (err){
            return next(err);
        }
        return next(null, data);
    });
};
