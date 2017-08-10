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
    view_rs = require('../resources/trigger'),
    enums_biz = require('../resources/enums'),
    enums = require('../../core/resources/enums.res'),
    ViewUser = mongoose.model('ViewUser'),
    ViewTicket = mongoose.model('ViewTicket'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    translation  = require('../resources/translate.res');


//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

module.exports = (emitter) => {
    emitter.on('evt.view.user.add_master', (options) => {

        var arr_master = createMasterData("ticket", options.language),
            tasks = [],
            index = 0;
        
         arr_master.forEach((item) => {
            
            var promise = new Promise((resolve, reject) => {
                item.ed_user_id = options.ed_user_id;
                item.user_id = options.user_id;
                item.position = index;
                var biz = new ViewTicket(item);
                
                tmp_data.save('view_user_add_master', options.ed_user_id, biz, biz, (err, result) =>{
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
            console.error("add view user master data fail", "add view master data fail");
            return;
        }
        
        Promise.all(tasks).then(function(messages) {
             return;
        }, function(reason) {
            console.error(reason, "add view user master data fail");
        });
        
    });
};

var createMasterData = function(type, language){
    language = translation[language || "en"];
    if(type == 'ticket'){
        return [
            {
                name: language.view.ticket.pending_tickets,
                availability: enums.Availability.All, 
                order_ascending: true, 
                order_by: "add_time", 
                is_active: true, 
                any_conditions: [

                ], 
                all_conditions: [
                    {
                        field_key: "status", 
                        cond_type: enums_biz.BizRuleType.Ticket, 
                        operator: "is", 
                        value: "2", 
                    }
                ]
            },{
                name: language.view.ticket.recently_updated,
                availability: enums.Availability.All, 
                order_ascending: true, 
                order_by: "add_time", 
                is_active: true, 
                any_conditions: [

                ], 
                all_conditions: [
                    {
                        cond_type: enums_biz.BizRuleType.Ticket, 
                        field_key: "status", 
                        operator: "less_than", 
                        value: "3",
                    }, 
                    {
                        cond_type: enums_biz.BizRuleType.Ticket, 
                        field_key: "agent", 
                        operator: "is", 
                        value: "current_user"
                    }
                ]
            },{
                name: language.view.ticket.all_unsolved,
                availability: enums.Availability.All, 
                order_ascending: true, 
                order_by: "add_time", 
                is_active: true, 
                any_conditions: [

                ], 
                all_conditions: [
                    {
                        cond_type: enums_biz.BizRuleType.Ticket, 
                        field_key: "status", 
                        operator: "less_than", 
                        value: "3",
                    }
                ]
            },{
                name: language.view.ticket.solved,
                availability : enums.Availability.All, 
                order_ascending : true, 
                order_by : "add_time", 
                any_conditions : [], 
                all_conditions : [
                    {
                        cond_type: enums_biz.BizRuleType.Ticket, 
                        field_key: "status",
                        operator: "is",
                        value: "3"
                    }
                ]
            },{
                name: language.view.ticket.unassigned,
                availability: enums.Availability.All, 
                order_ascending: true, 
                order_by: "add_time", 
                is_active: true, 
                any_conditions: [

                ], 
                all_conditions: [
                    {
                        cond_type: enums_biz.BizRuleType.Ticket, 
                        field_key: "status", 
                        operator: "less_than", 
                        value: "3",
                    }, 
                    {
                        cond_type: enums_biz.BizRuleType.Ticket, 
                        field_key: "agent", 
                        operator: "is", 
                        value: null
                    }
                ]
            },{
                name: language.view.ticket.your_unsolved,
                availability: enums.Availability.All, 
                order_ascending: true, 
                order_by: "add_time", 
                is_active: true, 
                any_conditions: [

                ], 
                all_conditions: [
                    {
                        cond_type: enums_biz.BizRuleType.Ticket, 
                        field_key: "status", 
                        operator: "less_than", 
                        value: "3",
                    }, 
                    {
                        cond_type: enums_biz.BizRuleType.Ticket, 
                        field_key: "agent", 
                        operator: "is", 
                        value: "current_user"
                    }
                ]
            }
        ];
    }else{
        return [];
    }
};