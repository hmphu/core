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
    translation  = require('../resources/translate.res'),
    cache = require(path.resolve('./config/lib/redis.cache')),
    DynamicContent = mongoose.model('DynamicContent');

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

//ed_user_id  language  provider  provider_data
module.exports = (emitter) => {
    emitter.on('evt.dc.add_master', (options) => {

        var arr_master = createMasterData(options.language),
            tasks = [];

         arr_master.forEach((item) => {
            
            var promise = new Promise((resolve, reject) => {
                item.ed_user_id = options.ed_user_id;
                item.is_system = true;
                item.placeholder = `{{dc.${item.placeholder}}}`;
                
                var dc = new DynamicContent(item);
                
                tmp_data.save('dc_add_master', options.ed_user_id, dc, dc, (err, result) =>{
                    if(err){
                        return reject(err);
                    }
                    cache.saveAndUpdateCache("dc_" + options.ed_user_id, dc._id, dc, (errsave) => {
                        if(errsave){
                            console.error(errsave, "save cache DynamicContent fail");
                        }
                    });
                    
                    resolve(result);
                }); 
            });
            tasks.push(promise);
        }); 

        if (!tasks.length) {
            console.error("create master data Dynamic Content fail", "add master data Dynamic Content fail");
            return;
        }
        
        Promise.all(tasks).then(function(messages) {
             return;
        }, function(reason) {
            console.error("save master data Dynamic Content fail", JSON.stringify(reason));
        });
        
    });
};

var createMasterData = function(language){
    var translations = translation[language || "en"],
        arr_keys = _.values(translations),
        arr = [];

    arr_keys.forEach((item) => {
        arr[arr.length] =  {
            name: item.name,
            placeholder: item.name,
            language: language,
            content: item.content
        }
    });
    
    return arr_keys;
};
