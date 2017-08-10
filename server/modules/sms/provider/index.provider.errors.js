'use strict';
//
//  core.routes.js
//  handle core system routes
//
//  Created by khanhpq on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash');
var enums = require('../resources/enums');
var vietguys = require('./strategies/vietguys.errors');
var vht = require('./strategies/vht.process.errors');

/**
 * Extend user's controller
 */
module.exports = (provider) => {
    switch (provider) {
        case enums.Provider.vietguys:
            return vietguys();
        case enums.Provider.vht:
            return vht();
        default:
            return {};
    }
};
