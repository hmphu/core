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
    auto_rs = require('../resources/automation'),
    enums = require('../resources/enums'),
    Biz = mongoose.model('Automation'),
    translation  = require('../resources/translate.res');


//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

module.exports = (emitter) => {
    emitter.on('evt.automation.add_master', (options) => {
        var arr_master = createMasterData(options.language),
            tasks = [],
            index = 0;

         arr_master.forEach((item) => {
            
            var promise = new Promise((resolve, reject) => {
                item.ed_user_id = options.ed_user_id
                item.position = index;
                var biz = new Biz(item);
                
                tmp_data.save('automation_add_master', options.ed_user_id, biz, biz, (err, result) =>{
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
            console.error("add automation master data fail", "add automation master data fail");
            return;
        }
        
        Promise.all(tasks).then(function(messages) {
             return;
        }, function(reason) {
            console.error("add automation master data fail", JSON.stringify(reason));
        });
        
    });
};

var createMasterData = function(language){
    language = translation[language || "en"];
    return [
        {
            name: language.auto.close_ticket_4d,
            is_active : true,
            all_conditions: [{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "status",
                operator: "is",
                value: "3"
            }],
            any_conditions: [{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "hours_since_solved",
                operator: "greater_than",
                value: "96"
            }],
            actions: [{
                act_type: enums.BizRuleType.Ticket,
                field_key: "status",
                value: "4"
            }],
        },{
            name: language.auto.pending_notification_24h.name,
            is_active : false,
            all_conditions: [{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "hours_since_pending",
                operator: "is",
                value: "24"
            }],
            actions: [{
                act_type: enums.BizRuleType.Ticket,
                field_key: "email_user",
                value: "ticket_requester",
                additional_values: {
                    fields: {
                        body: language.auto.pending_notification_24h.body, 
                        subject: language.auto.pending_notification_24h.subject
                    }
                }
            }],
        },{
            name: language.auto.pending_notification_5d.name,
            is_active : false,
            all_conditions: [{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "hours_since_solved",
                operator: "is",
                value: "120"
            }],
            actions: [{
                act_type: enums.BizRuleType.Ticket,
                field_key: "email_user",
                value: "ticket_requester",
                additional_values: {
                    fields: {
                        body: language.auto.pending_notification_5d.body, 
                        subject: language.auto.pending_notification_5d.subject
                    }
                }
            }]
        },{
            name: language.auto.customer_satisfaction_rating.name,
            is_active : false,
            all_conditions: [{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "status",
                operator: "is",
                value: "3"
            },{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "hours_since_solved",
                operator: "is",
                value: "24"
            }],
            actions: [{
                act_type: enums.BizRuleType.Ticket,
                field_key: "email_user",
                value: "ticket_requester",
                additional_values: {
                    fields: {
                        body: language.auto.customer_satisfaction_rating.body, 
                        subject: language.auto.customer_satisfaction_rating.subject
                    }
                }
            }],
        }
    ];
};
