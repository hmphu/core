'use strict';
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
        SMS_HOST : "cloudsms.vietguys.biz",
        SMS_PORT : 4438,
        SMS_PROTOCAL_HTTPS : true,
        SMS_PATH : "/izihelp/mt_server.php",
        SMS_API_KEY : "izihelp",
        SMS_API_SECRET : "4fjrz",
        SMS_BEGIN_DAY : 15,
        SMS_END_DAY : 14,
    }
}
