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
    UserCalendar = mongoose.model("UserCalendar"),
    Group = mongoose.model("Group"),
    Contact = mongoose.model("UserContact"),
    UserAddress = mongoose.model("UserAddress"),
    GroupUser = mongoose.model("GroupUser");

exports.active = [
    function (req, res, next) {
        var idOwner = utils.getParentUserId(req.user);

        new Promise(syncOwner(idOwner))
//        .then(syncUserBranding)
//        .then(syncUserLocal)
//        .then(syncUserSetting)
//        .then(syncCalendar)
//        .then(syncUsers)
//        .then(syncContacts)
//        .then(syncGroups)
//        .then(syncGroupUsers)
        .then(result => {
            res.json({ status : "activating..." });
        }, err => {
            res.status(400).send({ status : "failed" });
        });
    }
];

/*
    Send owner info to create chat-setting
    @author: lamtv
*/
function syncOwner(idOwner) {
    return (resolve, reject) => {

        User.findById(idOwner).exec((err, result) => {
            if (err) {
                console.error(err);
                return reject("syncOwner");
            }
            var owner = result.toJSON();
            UserAddress.findOne({ ed_user_id : owner._id }, (err, address) => {
                if (err) {
                    console.error(err);
                    return reject("syncOwner");
                }
                owner.company_name = address.company_name;
                var channel_chat = config.rabbit.sender.exchange.chat;
                senderRabbitMq(channel_chat, {topic: 'izicore-chat-active', payload: owner});
                resolve(owner);
            });
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
            var channel_chat = config.rabbit.sender.exchange.chat;
            senderRabbitMq(channel_chat, {topic: 'izicore-chat-sync-userbranding', payload: sent_data});
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
            var channel_chat = config.rabbit.sender.exchange.chat;
            senderRabbitMq(channel_chat, {topic: 'izicore-chat-sync-userlocal', payload: sent_data});
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
            var channel_chat = config.rabbit.sender.exchange.chat;
            senderRabbitMq(channel_chat, {topic: 'izicore-chat-sync-usersetting', payload: sent_data});
        });
    });
};



/*
    Copy calendar
    @author: lamtv
*/
exports.syncUserCalendar = data => {
    return new Promise((resolve, reject) => {

        UserCalendar.findOne({ ed_user_id : data.izi_account_id }, (err, setting) => {
            if (err) {
                console.error(err);
                return reject("syncCalendar");
            }
            if (!setting) { return; }
            var channel_chat = config.rabbit.sender.exchange.chat;
            var sent_data = {
                izi_account_id : data.izi_account_id,
                setting : setting.toJSON()
            };
            senderRabbitMq(channel_chat, {topic: 'izicore-chat-sync-usercalendar', payload: sent_data});
        });
    });
};

/*
    Copy users to chat
    @author: lamtv
*/
exports.syncUsers = (data) => {
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

exports.apiSyncUsers = [
    function (req, res, next) {
        var idOwner = utils.getParentUserId(req.user);

        exports.syncUsers({izi_account_id: idOwner})
        .then(result => {
            res.json({ status : "activating..." });
        }, err => {
            res.status(400).send({ status : "failed" });
        });
    }
];

exports.apiSyncGroups = [
    function (req, res, next) {
        var idOwner = utils.getParentUserId(req.user);
        exports.syncGroups({izi_account_id: idOwner})
        .then(exports.syncGroupUsers)
        .then(result => {
            res.json({ status : "activating..." });
        }, err => {
            res.status(400).send({ status : "failed" });
        });
    }
];

/*
    Copy users to chat
    @author: lamtv
*/
exports.syncContacts = data => {
    return new Promise((resolve, reject) => {

        var params = {
            skip : 0,
            timeId: +moment.utc(),
            idOwner : data.izi_account_id
        };

        function callback(err, is_all) {
            if (err) {
                console.error(err);
                return reject("syncContacts");
            }
            if (is_all) { return; }

            params.skip += 10;
            sendContacts(params, callback)
        };

        sendContacts(params, callback);
    });
};

/*
    Copy groups to chat
    @author: lamtv
*/
exports.syncGroups = data => {
    return new Promise((resolve, reject) => {

        var params = {
            skip : 0,
            timeId: +moment.utc(),
            idOwner : data.izi_account_id
        };

        function callback(err, is_all) {
            if (err) {
                console.error(err);
                return reject("syncGroups");
            }
            if (is_all) { return resolve(data); }

            params.skip += 10;
            sendGroups(params, callback)
        };

        sendGroups(params, callback);
    });
};

/*
    Copy group user to chat
    @author: lamtv
*/
exports.syncGroupUsers = data => {
    return new Promise((resolve, reject) => {

        var params = {
            skip : 0,
            timeId: +moment.utc(),
            idOwner : data.izi_account_id
        };

        function callback(err, is_all) {
            if (err) {
                console.error(err);
                return reject("syncGroupUsers");
            }

            if (is_all) { return resolve(data); }

            params.skip += 10;
            sendGroupUsers(params, callback)
        };

        sendGroupUsers(params, callback);
    });
};

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
        if (contacts.length > limit) {
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
        var channel_chat = config.rabbit.sender.exchange.chat;
        senderRabbitMq(channel_chat, {topic: 'izicore-chat-sync-contact', payload: data});
        callback(null, is_all);
    });

};

//Send contacts
function sendGroups(params, callback) {

    var limit = 10;

    Group.find({
        ed_user_id : params.idOwner
    }).skip(params.skip)
        .limit(limit + 1)
    .exec((err, groups) => {
        if (err) { return callback(err); }

        var is_all = true;
        if (groups.length > limit) {
            groups.pop();
            is_all = false;
        }
        var data = {
            izi_account_id : params.idOwner,
            time_id: params.timeId,
            is_first: !params.skip,
            is_all: is_all,
            groups : groups
        };
        var channel_chat = config.rabbit.sender.exchange.chat;
        senderRabbitMq(channel_chat, {topic: 'izicore-chat-sync-group', payload: data});
        callback(null, is_all);
    });

};

//Send contacts
function sendGroupUsers(params, callback) {

    var limit = 10;

    GroupUser.find({
        ed_user_id : params.idOwner
    }).skip(params.skip)
        .limit(limit + 1)
    .exec((err, group_users) => {
        if (err) { return callback(err); }

        var is_all = true;
        if (group_users.length > limit) {
            group_users.pop();
            is_all = false;
        }
        var data = {
            izi_account_id : params.idOwner,
            time_id: params.timeId,
            is_first: !params.skip,
            is_all: is_all,
            group_users : group_users
        };
        var channel_chat = config.rabbit.sender.exchange.chat;
        senderRabbitMq(channel_chat, {topic: 'izicore-chat-sync-group_user', payload: data});
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
        if (users.length > limit) {
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
        var channel_chat = config.rabbit.sender.exchange.chat;
        senderRabbitMq(channel_chat, {topic: 'izicore-chat-sync-user', payload: data});
        callback(null, is_all);
    });
};
