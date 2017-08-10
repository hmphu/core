'use strict';
//
//  elasticsearch.js
//  connect to elasticsearch client
//
//  Created by thanhdh on 2017-02-24.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Redis Client Wrapper.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    elasticsearch = require('elasticsearch');

function logger(config){
    this.error = (err) => {
        console.error(err, "Got errors in elastic connection");
    };
    this.warning = (warning) => {
        console.error(warning, '==== warning ====');
    };
    this.info = (info) => {
        console.log('info', info);
    };
    this.debug = (debug) => {
        console.log('debug', debug);
    };
    this.trace = (method, requestUrl, body, responseBody, responseStatus) => {
        //console.log('trace', method, requestUrl, body, responseBody, responseStatus);
    };
    this.close =  () => {
        
    };
}

/**
 * open a connection to redis server
 * author : thanhph
 */
var client = new elasticsearch.Client({
    host: {
        host: config.elastic.host,
        port: config.elastic.port
    },
    /*sniffOnStart: true,
    sniffInterval: 60000,*/
    maxRetries: 1,
    log: { log: ['error', 'warning'] }
});

module.exports = client;
