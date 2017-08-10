'use strict';
//
//  core.routes.js
//  handle core system routes
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash');
var enums = require('../resources/enums');
var ntt = require('./strategies/ntt.cdr');
var digitel = require('./strategies/digitel.cdr');
var vht = require('./strategies/vht.cdr');
var epacific = require('./strategies/epacific.cdr');

/**
 * Extend user's controller
 */
module.exports = _.assign({ getProvider : (provider) => {
    switch (provider) {
        case enums.Provider.ntt:
            return ntt;
        case enums.Provider.digitel:
            return digitel;
        case enums.Provider.vht:
            return vht;
        case enums.Provider.epacific:
            return epacific;
        default:
            return {};
    }
}});
