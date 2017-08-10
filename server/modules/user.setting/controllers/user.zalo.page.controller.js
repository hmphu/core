'use strict';
//
//  fb.controller.js
//  handle fb logic
//
//  Created by thanhdh on 2016-02-23.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose  = require('mongoose'),
    path = require('path'),
    moment = require('moment'),
    jwt = require('jsonwebtoken'),

    config = require(path.resolve('./config/config')),
    cache = require(path.resolve('./config/lib/redis.cache')),
    utils = require('../../core/resources/utils'),
    zalo_utils = require('../../zalo/resources/zalo.utils'),

    UserSetting = mongoose.model("UserSetting"),
    UserZaloOA = mongoose.model("UserZaloOA");

exports.authorizeURL = [
    function (req, res, next) {

        res.json({
            authorize_url: `${config.zalo.oauth2URL}?app_id=${config.zalo.clientID}&redirect_uri=${config.zalo.callbackURL}`
        });
    }
];

exports.authorizeCallback = [
    function (req, res, next) {
        var result = req.query,
            res_data = "";
        if (result.error) {
            res_data = JSON.stringify({topic: "zaloAuthenticated", error: zalo_utils.getErrorMessage(result.error), is_error: true});
        } else {
            result.add_time = +moment.utc();
            var data = jwt.sign(result, config.zalo.jwtSecret, {expiresIn: 15});
            res_data = JSON.stringify({topic: "zaloAuthenticated", data: data, is_error: false});
        }
        var res_script = `<script>window.opener&&window.opener.postMessage('${res_data}', '*'); window.close();</script>`;
        return res.format({
            'text/html': () => {
                res.send(res_script);
            }
        });
    }
];

exports.addOAToken = [
    function (req, res, next) {
        var data = req.body.encoded_data;
        jwt.verify(data||"", config.zalo.jwtSecret, (err, result) => {
            if (err) { return next(new TypeError("zalo.data_invalid")); }
            req.body = {
                access_token: result.access_token,
                uid: result.uid,
                add_time: result.add_time
            };
            next();
        });
    },
    function (req, res, next) {
        zalo_utils.getOAId(req.body.access_token)
        .then(result => {
            var oaData = Object.assign({}, result.body.data, req.body);
            //change to https
            oaData.avatar = oaData.avatar.replace(/^http:\/\//i, "https://");
//            oaData.cover = oaData.cover.replace(/^http:\/\//i, "https://"); //zalo not support for cover
            return saveOAToken(oaData, req.user);
        }).then(oaData => {
            res.json({page: oaData});
        }, result => {
            console.log(result);
            if (result) {
                return next(new TypeError(result.errorMsg || result));
            }
            return next(new TypeError("zalo.add_page_failure"));
        })
    }
];

exports.list = [
    function (req, res, next) {
        var q_active = req.query.is_active,
            q_skip = (req.query.qskip*1)||0;

        var query = {
            ed_user_id: utils.getParentUserId(req.user)
        };

        q_active&&(query.is_active=(q_active=="1"||q_active=="true"));
        q_skip&&(query.add_time={$gt:q_skip});
        UserZaloOA.find(query, (err, oas) => {
            if (err) { return next(err); }

            if (req.query.raw) {
                return res.json(processResponseResult(oas, {one_lvl: req.query.one_lvl}));
            }
            res.json({pages: processResponseResult(oas, {one_lvl: req.query.one_lvl})});
        });

    }
];

exports.count = [
    function (req, res, next) {
        var is_detail = req.query.is_detail;
        if (is_detail == "1" || is_detail == "true") { return next(); }

        var q_active = req.query.is_active;

        var query = {
            ed_user_id: utils.getParentUserId(req.user)
        };

        q_active&&(query.is_active=(q_active=="1"||q_active=="true"));

        UserZaloOA.count(query, (err, total) => {
            if (err) { return next(err); }
            if (req.query.raw) {
                return res.json(total);
            }
            res.json({total : total});
        });
    },
    function (req, res, next) {
        var idOwner = utils.getParentUserId(req.user);
        var tasks = [
            (resolve, reject) => {
                UserZaloOA.count({ed_user_id: idOwner, is_active: true}, (err, total) => {
                    if (err) { return reject(err); }
                    resolve(total);
                });
            },
            (resolve, reject) => {
                UserZaloOA.count({ed_user_id: idOwner, is_active: false}, (err, total) => {
                    if (err) { return reject(err); }
                    resolve(total);
                });
            }
        ];

        Promise.all(tasks.map(item => new Promise(item))).then(results => {
            res.json({
                total: results[0] + results[1],
                active: results[0],
                inactive: results[1]
            });
        }, err => {
            next(err);
        });
    }
];

exports.edit = [
    function (req, res, next) {
        UserSetting.findOne({
            ed_user_id: utils.getParentUserId(req.user)
        }, (err, userSetting) => {
            if (err) {
                return next(err);
            }
            if (!userSetting) {
                return next(new TypeError("zalo.user_setting_not_found"));
            }
            req.setting = userSetting.toObject();
            next();
        });
    },
    function (req, res, next) {
        var oa = req.zalo_oa,
            zalo = req.setting.features.channels.zalo;

        if (!zalo) {
            return next(new TypeError("zalo.require_admin_add_zalo_channel"));
        }

        var can_active = zalo.current_no < zalo.quantity;

        var allows = {
//            permission: true,
            page_settings: true

        };

        for (var i in allows) {
            if (req.body[i] !== undefined) {
                oa[i] = req.body[i];
            }
        }
        var inc_value = 0;

        if (req.body.is_active != oa.is_active) {
            if (!oa.is_active && !can_active) {
                return next(new TypeError("zalo.account_reach_limit"));
            }
            inc_value = oa.is_active?-1:1;
            oa.is_active = req.body.is_active;
        }

        oa.save(err => {
            if (err) { return next(err); }
            res.json(processResponseResult(oa));
            if (inc_value) {
                UserSetting.update({
                    ed_user_id: oa.ed_user_id
                }, {
                    $set: {
                        upd_time: +moment.utc()
                    },
                    $inc: {
                        "features.channels.zalo.current_no": inc_value
                    }
                }, (err, result) => {
                    if (err) { console.error(err); }
                    cache.removeCache(oa.ed_user_id, "user.setting.setting", (err) => {
                        err&&console.error(err);
                    });
                });
            }
        });
    }
];

exports.remove = [
    function (req, res, next) {
        var oa = req.zalo_oa;
        oa.remove(err => {
            if (err) { return next(err); }
            res.json({ is_removed: true });
        });
    }
];

exports.read = [
    function (req, res, next) {
        var oa = req.zalo_oa;
        res.json({page: processResponseResult(oa)});
    }
];

exports.readNameByPageId = [
    function (req, res, next) {
        var page_id = req.query.pageid;
        UserZaloOA.findOne({
            ed_user_id: utils.getParentUserId(req.user),
            is_active: true,
            page_id: page_id //oaid
        }, (err, oa) => {
            if (err) { return next(err); }
            if (!oa) {
                return next(new TypeError('zalo.page_not_found'));
            }
            res.json({
                name: oa.page_info.name,
                id: oa.page_id
            });
        });
    }
];

function processResponseResult(data, options) {
    options = options || {};
    function buildData(_item) {
        var item = _item.toJSON?_item.toJSON():_item;
        var res_data = {
            _id: item._id,
            page_id: item.page_id,
            user_id: item._id,
            is_active: item.is_active,
            page_settings: item.page_settings,
            page_info: item.page_info
        };

        if (options.one_lvl) {
            for (var i in item.page_info) {
                res_data["page_info__" + i] = item.page_info[i];
            }
//            for (var i in item.permission) {
                res_data["permission__" + "add_time"] = item.permission.add_time;
//            }
        }
        return res_data;
    };
    if (Array.isArray(data)) {
        return data.map(buildData);
    }
    return buildData(data);
}

function saveOAToken(oaData, user) {
    return new Promise((resolve, reject) => {
        new Promise((resv, rej) => {
            var idOwner = utils.getParentUserId(user);
            UserZaloOA.findOne({page_id: oaData.oaId}, (err, oa) => {
                if (err) { return rej(err); }
                if (oa && (oa.ed_user_id+"") != (idOwner+"")) {
                    return rej("zalo.page_exists");
                }
                resv(oa);
            });
        }).then(oa => {
            return new Promise((resv, rej) => {
                var idOwner = utils.getParentUserId(user);
                UserSetting.findOne({
                    ed_user_id: idOwner
                }, (err, userSetting) => {
                    if (err) {
                        return rej(err);
                    }
                    if (!userSetting) {
                        return rej("zalo.user_setting_not_found");
                    }
                    resv({setting: userSetting, page: oa});
                });
            });
        }).then(data =>{
            return new Promise((resv, rej) => {
                if (!data.page) { return resv(data); }
                var czalo = data.setting.features.channels.zalo;
                if (!czalo) {
                    return rej("zalo.require_admin_add_zalo_channel");
                }

                var can_active = czalo.current_no < czalo.quantity,
                    is_inc = can_active && !data.page.is_active;

                data.zalo_current_no_inc = is_inc;

                Object.assign(data.page, {
                    user_id: user._id,
                    page_info: {
                        name: oaData.name,
                        description: oaData.description,
                        avatar: oaData.avatar,
                        cover: oaData.cover,
                        admin_id: oaData.uid
                    },
                    is_active: can_active || data.page.is_active
                });
                if (data.page.permission.access_token != oaData.access_token) {
                    data.page.permission = {
                        access_token: oaData.access_token,
                        add_time: oaData.add_time
                    };
                }
                resv(data);
            });
        }).then(data => {
            return new Promise((resv, rej) => {
                if (data.page) { return resv(data); }
                var czalo = data.setting.features.channels.zalo,
                    can_active = czalo.current_no < czalo.quantity;

                data.zalo_current_no_inc = can_active;

                data.page = new UserZaloOA({
                    ed_user_id: utils.getParentUserId(user),
                    user_id: user._id,
                    page_id: oaData.oaId,
                    page_info: {
                        name: oaData.name,
                        description: oaData.description,
                        avatar: oaData.avatar,
                        cover: oaData.cover,
                        admin_id: oaData.uid
                    },
                    permission: {
                        access_token: oaData.access_token,
                        add_time: oaData.add_time
                    },
                    page_settings: {
                        is_auto_private_message: true
                    },
                    is_active: can_active
                });
                resv(data);
            });
        }).then(data => {
            data.page.save(err => {
                if (err) { return reject(err); }
                resolve(data.page);
            });
            if (data.zalo_current_no_inc) {
                UserSetting.update({
                    ed_user_id: data.setting.ed_user_id
                }, {
                    $set: { upd_time: +moment.utc() },
                    $inc: {
                        "features.channels.zalo.current_no": data.zalo_current_no_inc
                    }
                }, (err, result) => {
                    if (err) { console.error(err); }
                    cache.removeCache(data.setting.ed_user_id, "user.setting.setting", (err) => {
                        err&&console.error(err);
                    });
                });
            }
        }, err => {
            return reject(err);
        });
    });
}

exports.oaById = (req, res, next, id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('zalo.page_not_object_id'));
    }

    UserZaloOA.findById(id, (err, oa) => {
        if (err) { return next(err); }

        var parent_user_id = req.user?utils.getParentUserId(req.user).toString():{},
            ed_user_id = oa?oa.ed_user_id.toString():{};

        if (parent_user_id != ed_user_id) {
            return next(new TypeError('zalo.page_not_found'));
        }
        req.zalo_oa = oa;
        next();
    });
}

exports.oaByPageId = (req, res, next, id) => {
    UserZaloOA.findOne({page_id: id}, (err, oa) => {
        if (err) { return next(err); }

        var parent_user_id = req.user?utils.getParentUserId(req.user).toString():{},
            ed_user_id = oa?oa.ed_user_id.toString():{};

        if (parent_user_id != ed_user_id) {
            return next(new TypeError('zalo.page_not_found'));
        }
        req.zalo_oa = oa;
        next();
    });
}

