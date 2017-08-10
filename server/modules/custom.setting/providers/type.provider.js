'use strict';
//
//  type.provider.js
//  handle custom setting types
//
//  Created by thanhdh on 2016-03-09.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash');

/**
 * Extend type's controller
 */
module.exports = _.assign(
    require('./types/choice'),
    require('./types/date'),
    require('./types/dropdown'),
    require('./types/numeric'),
    require('./types/slider'),
    require('./types/switch'),
    require('./types/text')
);
