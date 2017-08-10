'use strict';
//
//  sms event.js
//  handle user.setting events
//
//  Created by vupl on 2015-01-04.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var sendSms = require('../controllers/sms.send.controller'),
    histSms = require('../controllers/sms.hist.controller');


//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

/**
 * Event convert voip to ticket
 * @author Vupl
 */
module.exports = (emitter) => {
    emitter.on('evt.sms.sendSms', (data) => {
        data.content = data.comment.content;
        data.phone_no = data.comment.provider_data.phone_no;
        sendSms.send(data);
    });

    emitter.on('evt.sms.saveHist', (data) =>{
        histSms.add(data);
    });
};
