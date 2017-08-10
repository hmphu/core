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
var ntt = require('./strategies/ntt');
var digitel = require('./strategies/digitel');
var vht = require('./strategies/vht');
var epacific = require('./strategies/epacific');

/**
 * Extend user's controller
 */
module.exports = _.assign({ setSettings : (provider, providerData) => {
    switch (provider) {
        case enums.Provider.ntt:
            return ntt(providerData);
        case enums.Provider.digitel:
            return digitel(providerData);
        case enums.Provider.vht:
            return vht(providerData);
        case enums.Provider.epacific:
            return epacific(providerData);
        default:
            return {};
    }
}});
