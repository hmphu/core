'use strict';
//
//  vht.js
//  feed vht settings
//
//  Created by khanhpq on 2016-07-29.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//
var _ = require('lodash');

module.exports = () => {
    return {
        SMS_PREFIX : "IZI",
        SMS_NUMBER : 6089,
        SMS_BRAND : "IZIHELP",
        BRAND_MONTHLY_FEE : 500000,
        SMS_BRAND_DEFAULT_COST : 750,
        SMS_MAX_LENGTH : 459,
        SMS_HOST : "sms.vht.com.vn",
        SMS_PORT: undefined,
        SMS_PROTOCAL_HTTPS : true,
        SMS_PATH : "/ccsms/json",
        SMS_API_KEY : "092280cf",
        SMS_API_SECRET : "24873e6d",
        SMS_BEGIN_DAY : 15,
        SMS_END_DAY : 14,
    }
}
