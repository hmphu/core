'use strict';
//
//  Created by khanhpq on 2015-01-04.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    mongoose = require('mongoose'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    GooglePlay = mongoose.model('GooglePlay'),
    mongoose = require('mongoose');

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

module.exports = (emitter) => {
    emitter.on('evt.googleplay.add', (options) => {
        var googleplay = new GooglePlay({
            ed_user_id: options.ed_user_id,
            name: "Google Play",
            is_active: false
        });

        tmp_data.save('googleplay_add_setting', options.ed_user_id, googleplay, googleplay, (err, result) =>{
            if(err){
                console.error(err, "save setting google play fail");
            }
        });
    });
};
