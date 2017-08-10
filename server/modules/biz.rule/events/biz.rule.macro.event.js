'use strict';
//
//  biz.rule.event.js
//  handle biz.rule events
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
    macro_rs = require('../resources/macro'),
    enums_biz = require('../resources/enums'),
    enums = require('../../core/resources/enums.res'),
    Biz = mongoose.model('Macro'),
    translation  = require('../resources/translate.res');


//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

module.exports = (emitter) => {
    emitter.on('evt.macro.add_master', (options) => {
        var arr_master = createMasterData(options.language),
            tasks = [],
            index = 0;
         arr_master.forEach(function(item){
            var promise = new Promise((resolve, reject) => {
                item.ed_user_id = options.ed_user_id;
                item.user_id = options.user_id;
                item.position = index;
                var biz = new Biz(item);
//                biz.save((err) => {
//                    if(err){
//                        return reject(err);
//                    }
                tmp_data.save('macro_add_master', options.ed_user_id, biz, biz, (err, result) =>{
                    if(err){
                        return reject(err);
                    }
                    resolve(result);
                });
            });
            index++;
            tasks.push(promise);
        });

        if (!tasks.length) {
            console.error("add macro master data fail", "add macro master data fail");
            return;
        }
        
        Promise.all(tasks).then(function(messages) {
             return;
        }, function(reason) {
            console.error(reason, "add macro master data fail");
        });
        
    });
};

var createMasterData = function(language){
    language = translation[language || "en"];
    return [
        {
            name: language.macro.customer_not_responding.name,
            actions: [{
                act_type: enums_biz.BizRuleType.Ticket,
                field_key: "status",
                value: "2"
            },{
                act_type: enums_biz.BizRuleType.Ticket,
                field_key: "comment",
                value: language.macro.customer_not_responding.text,
            }],
            availability: enums.Availability.All
        },{
            name: language.macro.downgrade_and_inform.name,
            actions: [{
                act_type: enums_biz.BizRuleType.Ticket,
                field_key: "priority",
                value: "1"
            },{
                act_type: enums_biz.BizRuleType.Ticket,
                field_key: "comment",
                value: language.macro.downgrade_and_inform.text
            }],
            availability: enums.Availability.All
        }
    ];
};
