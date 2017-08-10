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
    trigger_rs = require('../resources/trigger'),
    enums = require('../resources/enums'),
    Biz = mongoose.model('Trigger'),
    translation  = require('../resources/translate.res');


//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

module.exports = (emitter) => {
    emitter.on('evt.trigger.add_master', (options) => {
        var arr_master = createMasterData(options.language),
            tasks = [],
            index = 0;
         arr_master.forEach((item) => {
            var promise = new Promise((resolve, reject) => {
                item.ed_user_id = options.ed_user_id
                item.position = index;
                var biz = new Biz(item);
                
                tmp_data.save('trigger_add_master', options.ed_user_id, biz, biz, (err, result) =>{
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
            console.error("add trigger master data fail", "add trigger master data fail");
            return;
        }
        
        Promise.all(tasks).then(function(messages) {
             return;
        }, function(reason) {
            console.error("add trigger master data fail", JSON.stringify(reason));
        });
        
    });1
};

var createMasterData = function(language){
    language = translation[language || "en"];
    return [
        {
            name: language.trigger.received_request.name,
            is_active : false,
            all_conditions: [{
                cond_type: enums.BizRuleType.Ticket,
                field_key: "ticket_is",
                operator: "is",
                value: "created"
            },{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "status",
                operator: "is_not",
                value: "3"
            }],
            any_conditions: [],
            actions: [{
                act_type: enums.BizRuleType.Notification,
                field_key: "email_user",
                value: "ticket_requester",
                additional_values: {
                    fields:{
                        body : language.trigger.received_request.body,
                        subject : language.trigger.received_request.subject
                    }
                }
            }],
        },{
            name: language.trigger.comment_update.name,
            is_active : false,
            all_conditions: [{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "agent",
                operator: "is_not",
                value: null
            },{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "status",
                operator: "not_changed",
                value: "3"
            }],
            any_conditions: [{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "comment_is",
                operator: "is",
                value: "1"
            },{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "comment_is",
                operator: "is",
                value: "2"
            }],
            actions: [{
                act_type: enums.BizRuleType.Notification,
                field_key: "email_user",
                value: "ticket_agent",
                additional_values: {
                    fields:{
                        body : language.trigger.comment_update.body,
                        subject : language.trigger.comment_update.subject
                    }
                }
            }]
        },{
            name: language.trigger.group_assignment.name,
            is_active : false,
            all_conditions: [{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "agent",
                operator: "is",
                value: ""
            },{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "group",
                operator: "is_not",
                value: ""
            }],
            any_conditions: [],
            actions: [{
                act_type: enums.BizRuleType.Notification,
                field_key: "email_group",
                value: "assigned_group",
                additional_values: {
                    fields:{
                        body : language.trigger.group_assignment.body,
                        subject : language.trigger.group_assignment.subject
                    }
                }
            }]
        },{
            name: language.trigger.customer_satisfaction_rating.name,
            is_active : false,
            all_conditions: [{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "status",
                operator: "is",
                value: "3"
            },{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "status",
                operator: "changed",
                value: null
            }],
            any_conditions: [],
            actions: [{
                act_type: enums.BizRuleType.Notification,
                field_key: "email_user",
                value: "ticket_requester",
                additional_values: {
                    fields:{
                        body : language.trigger.customer_satisfaction_rating.body,
                        subject : language.trigger.customer_satisfaction_rating.subject
                    }
                }
            }]
        },{
            name: language.trigger.agents_received_request.name,
            is_active : false,
            all_conditions: [{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "ticket_is",
                value: "created"
            },{
                cond_type: enums.BizRuleType.Ticket, 
                field_key: "group",
                operator: "is",
                value: null
            }],
            any_conditions: [],
            actions: [{
                act_type: enums.BizRuleType.Notification,
                field_key: "email_user",
                value: "all_agents",
                additional_values: {
                    fields:{
                        body : language.trigger.agents_received_request.body,
                        subject : language.trigger.agents_received_request.subject
                    }
                }
            }]
        }
    ];
};
