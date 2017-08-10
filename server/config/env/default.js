'use strict';

module.exports = {
    app : {
        title : 'IZI CORE'
    },
    port : process.env.PORT || 3000,
    dbTablePrefix : 'ih_stage_',
    dbAutoIndex : true,
    // Session Cookie settings
    sessionCookie : {
        // session expiration is set by default to 24 hours
        maxAge : 7 * 24 * (60 * 60 * 1000),
        // httpOnly flag makes sure the cookie is only accessed
        // through the HTTP protocol and not JS/browser
        httpOnly : true,
        // secure cookie should be turned to true to provide additional
        // layer of security so that the cookie is set only when working
        // in HTTPS mode.
        secure : false
    },
    // sessionSecret should be changed for security measures and concerns
    sessionSecret : process.env.SESSION_SECRET || 'IZI',
    // sessionKey is set to the generic sessionId key used by PHP applications
    // for obsecurity reasons
    sessionKey : 'sessionId',
    sessionCollection : 'sessions',
    unExpiredUrl : ['/api/subscription/auth-cancel', '/api/coupon/apply', '/api/subscription/purchase/'],
    paging : {
        limit : 15,
        skip : 0
    },
    timeFormat : {
        h12 : 12,
        h24 : 24
    },
    timezone : {
        id : 'Asia/Ho_Chi_Minh',
        value : 7
    },
    language : {
        en : 'en',
        vi : 'vi'
    },
    upload : {
        path : 'assets/uploads/',
        tmp_path : 'assets/uploads/tmp/',
        size : 3145728
    // 3MB
    },
    google : {
        map : {
            key : 'AIzaSyDxGlB2zb711xsiP1tnY6ER-dGv1MHLBD8',
            url : 'maps.googleapis.com',
            port : 443
        }
    },
    plan : {
        name : "standard",
        trial : 14
    // 14 days
    },
    isp : {
        host : 'www.fireflyinnovative.com',
        port : 8080,
        user : 'remoteuizihelp',
        pass : 'IeKoE2DmF6x!gbtNwK1F9_izihelp',
        secret : 'f94586dc56cab55216285f84007dec6e9154c5788c0ea99628a464aeda11fed4',
        dest_mails : ['test@izihelp.com']
    },
    sms : {
        SMS_PREFIX : "IZI",
        SMS_NUMBER : 6089,
        SMS_BRAND : "IZIHELP",
        BRAND_MONTHLY_FEE : 500000,
        SMS_BRAND_DEFAULT_COST : 750,
        SMS_MAX_LENGTH : 459,
        SMS_HOST : "sms.vht.com.vn",
        SMS_PATH : "/ccsms/json",
        SMS_API_KEY : "092280cf",
        SMS_API_SECRET : "24873e6d",
        SMS_BEGIN_DAY : 15,
        SMS_END_DAY : 14,
    },
    defaultExchangeRateUsd : 21000,
    defaultColor : '#78a300'
};
