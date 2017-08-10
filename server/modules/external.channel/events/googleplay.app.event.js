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
    googlePlay_res = require('../../core/resources/google.play'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    mongoose = require('mongoose');

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

//ed_user_id  language  provider  provider_data
module.exports = (emitter) => {
    emitter.on('evt.googleplay.app.getReview', (options) => {
        googlePlay_res.getReview(options.app_id, options.service_account_key, options.last_review_id, function(err, result){
            if(err){
                console.error(err, "Failed to get reviews google play");
            }

            if(!result || !Array.isArray(result.reviews) || result.reviews.length == 0){
                return null;
            }

            emitter.emit('evt.ticket.add.googleplay.review', options, result.reviews);
        });
    });
};
