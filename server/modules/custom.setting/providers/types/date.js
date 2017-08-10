'use strict';
//
//  date.js
//  feed date data for custom setting schema
//
//  Created by thanhdh on 2016-03-08.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * set date channel to provider
 * author : thanhdh
 * ex:
 *    {
 *        is_datetime: true
 *    }
 */
exports.setDate = (data) => {
    return {
        is_datetime: data.is_datetime || false
    };
};
