'use strict';
//
//  core.routes.js
//  handle core system routes
//
//  Created by khanhpq on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash');
var enums = require('../resources/enums.sms');
var vht = require('./strategies/vht');
var vietguys = require('./strategies/vietguys');

module.exports.settingSend = (provider) => {
    var settings = null;
    switch (provider) {
        case enums.Provider.vht:
            settings = vht();
            break;
        case enums.Provider.vietguys:
            settings = vietguys();
            break;
        default:
            return {};
    }

    return {
        data: {
            submission: {
                api_key: settings.SMS_API_KEY,
                api_secret: settings.SMS_API_SECRET,
                sms: []
            }
        },
        host: settings.SMS_HOST,
        path: settings.SMS_PATH,
        port: settings.SMS_PORT,
        is_https: settings.SMS_PROTOCAL_HTTPS,
        method: "POST"
    };
}
