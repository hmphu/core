'use strict'
//
//  fb.js
//  define fb function
//
//  Created by lamtv on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var _ = require('lodash'),
    fs = require('fs'),
    mime = require('mime'),
    path = require('path'),
    crypto = require('crypto'),
    moment = require('moment'),
    request = require('./request'),

    config = require(path.resolve('./config/config')),
    utils = require('../../core/resources/utils');

exports.getErrorMessage = err_code => {
    switch (err_code) {
        case -201:
            return "zalo.authen_errors.params_invalid"; //Parameters are invalid";
        case -202:
            return "zalo.authen_errors.mac_invalid"; //"Mac is invalid";
        case -204:
            return "zalo.authen_errors.oa_disabled"; //"OA is disabled";
        case -205:
            return "zalo.authen_errors.oa_invalid"; //"OA is not exist";
        case -207:
            return "zalo.authen_errors.oa_not_3_party"; //"OA is not 3rd party";
        case -208:
            return "zalo.authen_errors.oa_no_secret_key"; //"OA has no secret key";
        case -209:
            return "zalo.authen_errors.api_not_support"; //"Api is not supported";
        case -210:
            return "zalo.authen_errors.params_reach_limit"; //"Parameter reach limit";
        case -211:
            return "zalo.authen_errors.out_of_quota"; //"Out of quota";
        case -212:
            return "zalo.authen_errors.oa_not_register_api"; //"Oa has not registered the api";
        case -213:
            return "zalo.authen_errors.user_not_follow_oa"; //"User has not followed the oa";
        case -214:
            return "zalo.authen_errors.media_processing"; //"Media (article) is being processed";
        case -215:
            return "zalo.authen_errors.appid_invalid"; //"Appid is invalid";
        case -216:
            return "zalo.authen_errors.token_invalid"; //"Access token is invalid";
        default:
            return `Unknow Error: ${err_code}`;
    }
};

exports.objectToParams = obj => {
    var res_str = "";
    for (var i in obj) {
        if (res_str) { res_str += "&"; }
        res_str += (i + "=" + obj[i]);
    }
    return res_str;
};

exports.createHash = (params, options) => {
    options = options || {};

    var hash_str = "";

    (options.appId!==false)&&(hash_str += config.zalo.clientID);

    hash_str += params.join("");

    (options.secretKey!==false)&&(hash_str += config.zalo.clientSecret);

    return crypto.createHash("SHA256").update(hash_str, "utf-8").digest("hex");
};

exports.getOAId = access_token => {

    var data = JSON.stringify({accessTok: access_token}),
        timestamp = +moment.utc(),
        hashstr = this.createHash([data, timestamp]);

    var params = {
        timestamp: timestamp,
        mac: hashstr,
        appid: config.zalo.clientID,
        data: data
    };

    var url = `${config.zalo.openApiURL}/onbehalf/getoa?${this.objectToParams(params)}`;
    return new Promise((resolve, reject) => {
        request.get(url, handleZaloResponse(resolve, reject));
    });
};

exports.getMessages = options => {
    var data = JSON.stringify(options),
        timestamp = +moment.utc(),
        hashstr = this.createHash([data, timestamp]);

    var params = {
        timestamp: timestamp,
        mac: hashstr,
        appid: config.zalo.clientID,
        data: data
    };

    var url = `${config.zalo.openApiURL}/onbehalf/conversation?${this.objectToParams(params)}`;
    return new Promise((resolve, reject) => {
        request.get(url, handleZaloResponse(resolve, reject));
    });
};

exports.downloadImage = (img_url, dir, name) => {
    return new Promise((resolve, reject) => {
        request.download(img_url, dir, name, err => {
            if (err) { return reject(err); }
            resolve();
        });
    });
};

exports.uploadImage = (file, access_token) => {
    return new Promise((resolve, reject) => {
        var data = JSON.stringify({accessTok: access_token}),
            timestamp = +moment.utc(),
            hashstr = this.createHash([data, timestamp]);

        try {
            var buffer = fs.readFileSync(file.path);
            if (buffer.length > (config.zalo.fileSize || 1024 * 1024)) {
                return reject("zalo.file_too_large");
            }
        } catch (ex) {
            return reject(ex);
        }
        var params = [
            { key: "timestamp", value: timestamp },
            { key: "mac", value: hashstr },
            { key: "appid", value: config.zalo.clientID },
            { key: "data", value: data },
            {
                key: "file",
                value: buffer,
                options: {
                    contentType: mime.lookup(file.path),
                    filename: file.originalname
                }
            }
        ];

        var url = `${config.zalo.openApiURL}/onbehalf/upload/image`;
        request.createFormMultipart(url, "post", params, handleZaloResponse(resolve, reject));
    });

};

exports.postMessage = (msg, access_token) => {
    var type = "text",
        obj_data = {
            accessTok: access_token,
            message: msg.content,
            uid: msg.uid
        };
    if (msg.imgid) {
        obj_data.imageid = msg.imgid;
        type = "image";
    } else if (msg.links) {
        obj_data.links = msg.links;
        type = "links";
    }

    var data = JSON.stringify(obj_data),
        timestamp = +moment.utc(),
        hashstr = this.createHash([data, timestamp]);

    var params = {
        timestamp: timestamp,
        mac: hashstr,
        appid: config.zalo.clientID,
        data: data
    };

    var url = `${config.zalo.openApiURL}/onbehalf/sendmessage/${type}`;
    return new Promise((resolve, reject) => {
        request.createFormEncoded(url, "post", params, handleZaloResponse(resolve, reject));
    });
};





var handleZaloResponse = (resolve, reject) => {
    return (err, response) => {
        if (err || response.status_code != 200) {
            return reject({error: err, body: (response||{}).body});
        }
        try {
            var parsed = JSON.parse(response.body.replace(/:([0-9]{18,})([,}])/g, ":\"$1\"$2"));
            if (parsed.errorCode != 1) {
                return reject({raw: response.body, body: parsed, errorMsg: this.getErrorMessage(parsed.errorCode)});
            }
            return resolve({raw: response.body, body: parsed});
        } catch (ex) {
            resolve({raw: response.body});
        }
    };
};
