'use strict';
//
//  gg.map.js
//  get google map api
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    http = require('./http');

/**
 * get remote timezone from google map api based on user lat/long
 * author : thanhdh
 */
exports.getTimeZoneFromLatLong = (lat_long, callback) =>{
    // if no data
    if(!lat_long){
        return callback(config.timezone.id);
    }
    // init params
    var timestamp = new Date().getTime() / 1000;
    var params = {
        host: config.google.map.url,
        port: config.google.map.port,
        path: `/maps/api/timezone/json?location=${lat_long}&timestamp=${timestamp}&sensor=false&key=${config.google.map.key}`,
        method: 'GET',
        is_https: true
    };
    // execute remote google map api
    http(params, (err, result) => {
        if(err){
            console.error(err, `Failed to get timezone from Google map api with lat_long=${lat_long}`);
            return callback(config.timezone);
        }
        if(!result || result.status != "OK"){
            return callback(config.timezone.id);
        }
        if ( result.timeZoneId === "Asia/Saigon" ) {
            result.timeZoneId = config.timezone.id;
        }
        return callback(result.timeZoneId);
    });
};
