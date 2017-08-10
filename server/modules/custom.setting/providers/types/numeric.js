'use strict';
//
//  numeric.js
//  feed numeric data for custom setting schema
//
//  Created by thanhdh on 2016-03-08.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * set numeric channel to provider
 * author : thanhdh
 * ex:
 *    {
 *        is_multiline: true
 *    }
 */
exports.setNumeric = (data) => {
    return {
        is_decimal: data.is_decimal || false
    };
};
