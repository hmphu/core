'use strict';
//
//  text.js
//  feed text data for custom setting schema
//
//  Created by thanhdh on 2016-03-08.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * set text channel to provider
 * author : thanhdh
 * ex:
 *    {
 *        is_multiline: true,
 *        is_link: true
 *    }
 */
exports.setText = (data) => {
    return {
        is_multiline: data.is_multiline || false,
        is_link: data.is_link || false,
        is_edittable: data.is_edittable || false
    };
};
