'use strict';
//
//  user.setting.event.js
//  handle user.setting events
//
//  Created by thanhdh on 2015-01-04.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    VoipStats = mongoose.model('VoipStats'),
    moment = require('moment'),
    enums = require('../../voip/resources/enums'),
    voipStats = require('../controllers/voip.stats.controller'),
    voipHist = require('../controllers/voip.hist.controller'),
    tmp_data = require('../../core/controllers/tmp.data.controller');

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========
module.exports = (emitter) => {
    emitter.on('evt.voip.update.history',(ticket, voip_call_id) =>{
        voipHist.update(ticket, voip_call_id);
    })
};
