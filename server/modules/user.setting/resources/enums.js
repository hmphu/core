'use strict';
//
//  enums.js
//  define user setting enums
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

exports.SuspendedTicketNotify = {
    Never : -1,
    Every_10_minutes : 1,
    Hourly_didgest : 2,
    Daily_didgest : 3
};

exports.Provider = {
    local : "local",
    gmail : "gmail"
};

exports.SsoProvider = {
    jwt : "jwt"
};
