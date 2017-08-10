'use strict';
//
//  index.provider.js
//  handle fb provider data
//
//  Created by thanhdh on 2016-02-22.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash');

/**
 * Extend user's controller
 */
module.exports = _.assign(
    require('./strategies/conversation'),
    require('./strategies/comment'),
    require('./strategies/wallpost'),
    require('./strategies/userpost')
);
