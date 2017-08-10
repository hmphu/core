'use strict';
//
//  handle gmail events
//
//  Created by khanhpq on 2015-01-04.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    redis = require(path.resolve('./config/lib/redis'));
//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========

/*
 * save redis gmail watch_id
 * @author: khanhpq
 */
module.exports = (emitter) => {
    emitter.on('evt.mail.gmail.cache_redis', (options) => {
        redis.setWithDb(config.redis.defaultDatabase, options.key, options.data, (setError, success) => {
            if(setError) {
                console.error(err,'user.current_max_support.update_fail');
                return;
            }

            // cache expires
            redis.expireWithDb(config.redis.defaultDatabase, options.key, 7*24*60*60, (eError) => {
                if(eError){
                    console.error(eError,'user.current_max_support.update_fail');
                }
                return;
            });
        });
    });
}
