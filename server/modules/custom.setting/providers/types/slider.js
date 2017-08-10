'use strict';
//
//  slider.js
//  feed slider data for custom setting schema
//
//  Created by thanhdh on 2016-03-08.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * set slider channel to provider
 * author : thanhdh
 */
exports.setSlider = (data) => {
    return {
        min: data.min || 0,
        max: data.max || 100
    };
};
