'use strict';
//
//  epacific.js
//  feed epacific settings
//
//  Created by vupl on 2016-07-29.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//
var _ = require('lodash');

module.exports.cdrRequest = (data) => {
    return {
        submission : data
    }
}

module.exports.cdrResponse = (data) => {
    return data && data.response && data.response[0] && data.response[0].Cdr ? data.response[0].Cdr : null;
}

module.exports.cdrResponseExts = (data) => {
    return data && data.response ? data.response.registrations : null;
}
