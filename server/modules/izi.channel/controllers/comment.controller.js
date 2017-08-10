'use strict';
//
//  izicomment.controller.js
//  handle core system routes
//
//  Created by lamtv on 2016-03-10.
//  Copyright 2016 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var path = require("path"),
    mongoose = require("mongoose"),
    moment = require("moment"),

    config = require(path.resolve("./config/config")),
    senderRabbitMq = require(path.resolve("./config/lib/emitters/sender.rabbitmq")),
    utils = require(path.resolve('./modules/core/resources/utils')),
//    local_utils = require('../resources/utils'),

    User = mongoose.model("User"),
    UserBranding = mongoose.model("UserBranding"),
    UserLocal = mongoose.model("UserLocal"),
    UserSetting = mongoose.model("UserSetting"),
    Contact = mongoose.model("UserContact");

exports.active = [
    function (req, res, next) {
        var idOwner = utils.getParentUserId(req.user);

        new Promise(syncOwner(idOwner))
//        .then(syncUserBranding)
//        .then(syncUserLocal)
//        .then(syncUserSetting)
        .then(result => {
            res.json({ status : "activating..." });
        }, err => {
            console.log(err);
            res.status(400).send({ status : "failed" });
        });
    }
];


/*
    Send owner info to create comment-setting
    @author: lamtv
*/
function syncOwner(idOwner) {
    return (resolve, reject) => {

        User.findById(idOwner).exec((err, owner) => {
            if (err) {
                console.error(err);
                return reject("syncOwner");
            }
            var channel_comment = config.rabbit.sender.exchange.comment;
            senderRabbitMq(channel_comment, {topic: 'izicore-comment-active', payload: owner});
            resolve();
        });
    };
};



/*
    Copy user setting branding
    @author: lamtv
*/
exports.syncUserBranding = data => {
    return new Promise((resolve, reject) => {
        UserBranding.findOne({ ed_user_id : data.izi_account_id }).exec((err, branding) => {
            if (err) {
                console.error(err);
                return reject("syncUserBranding");
            }
            var sent_data = {
                izi_account_id : data.izi_account_id,
                branding : branding
            };
            var channel_comment = config.rabbit.sender.exchange.comment;
            senderRabbitMq(channel_comment, {topic: 'izicore-comment-sync-userbranding', payload: sent_data});
        });
    });
};

/*
    Copy user setting local
    @author: lamtv
*/
exports.syncUserLocal = data => {
    return new Promise((resolve, reject) => {

        UserLocal.findOne({ ed_user_id : data.izi_account_id }).exec((err, local) => {
            if (err) {
                console.error(err);
                return reject("syncUserLocal");
            }
            var sent_data = {
                izi_account_id : data.izi_account_id,
                local : local
            };
            var channel_comment = config.rabbit.sender.exchange.comment;
            senderRabbitMq(channel_comment, {topic: 'izicore-comment-sync-userlocal', payload: sent_data});
        });
    });
};

/*
    Copy user setting local
    @author: lamtv
*/
exports.syncUserSetting = data => {
    return new Promise((resolve, reject) => {

        UserSetting.findOne({ ed_user_id : data.izi_account_id }).exec((err, setting) => {
            if (err) {
                console.error(err);
                return reject("syncUserSetting");
            }
            var sent_data = {
                izi_account_id : data.izi_account_id,
                setting : setting
            };
            var channel_comment = config.rabbit.sender.exchange.comment;
            senderRabbitMq(channel_comment, {topic: 'izicore-comment-sync-usersetting', payload: sent_data});
        });
    });
};



/*
    Copy user setting branding
    @author: lamtv
*/
function syncUserBranding(data) {
    return new Promise((resolve, reject) => {

        UserBranding.findOne({ ed_user_id : data.account._id }).exec((err, branding) => {
            if (err) {
                console.error(err);
                return reject("syncUserBranding");
            }
            data.branding = branding;
            resolve(data);
        });
    });
};

/*
    Copy user setting local
    @author: lamtv
*/
function syncUserLocal(data) {
    return new Promise((resolve, reject) => {

        UserLocal.findOne({ ed_user_id : data.account._id }).exec((err, local) => {
            if (err) {
                console.error(err);
                return reject("syncUserLocal");
            }
            data.local = local;
            resolve(data);
        });
    });
};

/*
    Copy users to comment
    @author: lamtv
*/
exports.syncUsers = data => {
    return new Promise((resolve, reject) => {
        var params = {
            skip : 0,
            timeId: +moment.utc(),
            idOwner : data.izi_account_id
        };

        function callback(err, is_all) {
            if (err) {
                console.error(err);
                return reject("syncUsers");
            }
            if (is_all) { return resolve(data); }

            params.skip += 10;
            sendUsers(params, callback)
        };
        sendUsers(params, callback);
    });
};

/*
    Copy users to comment
    @author: lamtv
*/
exports.syncContacts = data => {
    return new Promise((resolve, reject) => {
        var params = {
            skip : 0,
            timeId: +moment.utc(),
            idOwner : data.izi_account_id,
        };

        function callback(err, is_all) {
            if (err) {
                console.error(err);
                return reject("syncContacts");
            }
            if (is_all) { return resolve(data); }

            params.skip += 10;
            sendContacts(params, callback)
        };
        sendContacts(params, callback);
    });
};

exports.apiSyncUsers = [
    function (req, res, next) {
        var idOwner = utils.getParentUserId(req.user);
        exports.syncUsers({izi_account_id: idOwner})
        .then(result => {
            res.json({ status : "activating..." });
        }, err => {
            console.log(err);
            res.status(400).send({ status : "failed" });
        });
    }
];

//Send contacts
function sendContacts(params, callback) {

    var limit = 10;
    Contact.find({
        ed_user_id : params.idOwner,
        is_requester : false
    }).skip(params.skip)
        .limit(limit + 1)
    .exec((err, contacts) => {
        if (err) { return callback(err); }

        var is_all = true;
        if (contacts.length == limit + 1) {
            contacts.pop();
            is_all = false;
        }
        var data = {
            izi_account_id : params.idOwner,
            time_id: params.timeId,
            is_first: !params.skip,
            is_all: is_all,
            contacts : contacts
        };

        var channel_comment = config.rabbit.sender.exchange.comment;
        senderRabbitMq(channel_comment, {topic: 'izicore-comment-sync-contact', payload: data});
        callback(null, is_all);
    });

};

//Send users
function sendUsers(params, callback) {
    var limit = 10;
    User.find({
        ed_parent_id : params.idOwner,
        is_requester : false
    }).skip(params.skip)
        .limit(limit + 1)
    .exec((err, users) => {
        if (err) { return callback(err); }

        var is_all = true;
        if (users.length == limit + 1) {
            users.pop();
            is_all = false;
        }
        var data = {
            izi_account_id : params.idOwner,
            time_id: params.timeId,
            is_first: !params.skip,
            is_all: is_all,
            users : users
        };
        var channel_comment = config.rabbit.sender.exchange.comment;
        senderRabbitMq(channel_comment, {topic: 'izicore-comment-sync-user', payload: data});
        callback(null, is_all);
    });
};
