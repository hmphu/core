'use strict';
//
//  http.js
//  http request util
//
//  Created by thanhdh on 2015-12-31.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var https = require("https"),
    http = require("http");

module.exports = (params, next) => {
    var post_data = JSON.stringify(params.data) || '';
    var headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(post_data, "utf8")
        };
    
    if(params.headers){
        headers = Object.assign(headers, params.headers); 
    }
    
    var options = {
        hostname: params.host,
        path: params.path,
        method: params.method,
        rejectUnauthorized: false,
        headers: headers
    };
    if (params.port !== undefined) {
        options.port = params.port;
        options.hostname = options.hostname.replace(/:.*$/, "");
    }
    var r = (params.is_https ? https: http).request(options, function (response) {
        response.setEncoding('utf-8');
        var responseString = '';

        response.on('data', function (data) {
            responseString += data;
        });

        response.on('end', function () {
            if (response.statusCode != 200) {
                return next(null, {
                    status_code: response.statusCode
                });
            }
            try {
                var resultObject = JSON.parse(responseString) || {};
            } catch(ex){
                var resultObject = {};
            }
            resultObject.status_code = response.statusCode;

            if (!resultObject || resultObject.error) {
                return next(resultObject.error);
            } else {
                return next(null, resultObject);
            }
        });
    });
    r.on('error', function (e) {
        return next(e, null);
    });
    r.write(post_data);
    r.end();
};
