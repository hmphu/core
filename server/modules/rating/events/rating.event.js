'use strict';
//
//  Created by khanhpq on 2015-01-04.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    Rating = mongoose.model('Rating'),
    utils = require('../../core/resources/utils');

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========
module.exports = (emitter) => {
    emitter.on('evt.rating.add', (user) => {
        var idOwner = utils.getParentUserId(user);
        var rating = new Rating();
        rating.ed_user_id = idOwner;
        rating.theme = `
             <h5 class="rating_title"><strong t="common.how_u_feel"></strong></h5>
                <div class="mde-dIB-wrapper w100per">
                    <div class="mde-dIB mde-wCol5">
                        <span class="mde-cl-gray-light">Comment</span>
                    </div>
                    <div class="mde-dIB mde-wCol5 mde-tRight">
                        <label class="mde-thumb">
                            <input type="radio" name="radio">
                            <span class="mde-icon-btn"><i class="material-icons">thumb_up</i></span>
                        </label>
                        <label class="mde-thumb">
                            <input type="radio" name="radio">
                            <span class="mde-icon-btn"><i class="material-icons">thumb_down</i></span>
                        </label>
                    </div>
                </div>
                <mde-input type="textarea" value.bind="comment" mde-class="mde-autosize w100per" mde-style="max-height:30vh;"></mde-input>
                <div class="mde-tRight">
                    <button type="button" click.trigger="submit()" class="mde-default-btn mde-mTop">
                        <span t="common.save"></span>
                    </button>
                </div>`;
        tmp_data.save('rating_add', idOwner, rating, rating, (err, result) =>{
            if(err){
                console.error(err, "save rating");
            }
            return;
        });
    });
};
