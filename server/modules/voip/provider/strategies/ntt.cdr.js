'use strict';
//
//  ntt.js
//  feed ntt settings
//
//  Created by vupl on 2016-07-29.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//
var _ = require('lodash');

module.exports.cdrRequest = (data) => {
    return {
        token : data.api_key,
        call_id : data.call_id
    }
}

module.exports.cdrResponse = (data) => {
    if (data && data[0]) {
        var cdr = data[0];
        
        return {
            status : cdr.event,
            tta : cdr.duration,
            start : cdr.date_time,
            direction : cdr.type,
            recording_file : cdr.recordingfile
        }
    };
    
    return null;
}

module.exports.cdrResponseExts = (data) => {
    return data ? data : null;
}
