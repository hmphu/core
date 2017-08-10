'use strict';
//
//  filter.cond.js
//  build trigger matrix to render layout
//
//  Created by thanhdh on 2016-01-13.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var path = require('path'),
    enums = require(path.resolve('./modules/biz.rule/resources/enums')),
    mongoose = require('mongoose'),
    utils = require(path.resolve('./modules/core/resources/utils')),
    enumsTicket = require(path.resolve('./modules/ticket/resources/enums')),
    filterUtils = require(path.resolve('./modules/filter/resources/utils.v2')),
    groupUserController = require(path.resolve('./modules/people/controllers/people.group.user.controller'));

/**
 * matching ticket data vs trigger conditions
 * author: thanhdh
 */
module.exports = (query, condition, user, next) => {
    let moreValue = {
        operator: condition.operator
    };
    // if there are ticket fields in the conditions
    if(condition.cond_type == enums.BizRuleType.Ticket){
        switch(condition.field_key) {
            case 'status':
            case 'type':
            case 'priority':
                filterUtils.buildCond(query, condition.field_key, condition);
                return next();
                break;
            case 'group':
                if(condition.value == 'default_loggedin_group'){
                    var idOwner = utils.getParentUserId(user);
                    groupUserController.findGroupUser(idOwner, user._id, (err, result) =>{
                        if(err){
                            console.error(err, 'filter.match in filter module');
                            return next(true);
                        }
                        if(result && result.group_id){
                            condition.value = result.group_id;
                            filterUtils.buildCond(query, 'group_id._id', condition);
                            return next();
                        }
                        return next(true);
                    });
                } else if(condition.value == 'all_loggedin_group') {
                    var idOwner = utils.getParentUserId(user);
                    groupUserController.getGroupIdOfUser(idOwner, user._id, (err, result) =>{
                        if(err){
                            console.error(err, 'filter.match in filter module');
                            return next(true);
                        }
                        if(result && result.length){
                            condition.operator = (condition.operator == 'is'? 'includes': 'not_includes');
                            condition.value = result;
                            filterUtils.buildCond(query, 'group_id._id', condition);
                            return next();
                        }
                        return next(true);
                    });
                } else {
                    filterUtils.buildCond(query, 'group_id._id', condition);
                    return next();
                }
                break;
            case 'agent':
                // current user
                if(condition.value == 'current_user'){
                    condition.value = user._id;
                }
                filterUtils.buildCond(query, 'agent_id._id', condition);
                return next();
                break;
            case 'requester':
                filterUtils.buildCond(query, 'requester_id._id', condition);
                return next();
                break;
            case 'org':
                filterUtils.buildCond(query, 'org_id._id', condition);
                return next();
                break;
            case 'tag':
                filterUtils.buildCond(query, 'tags', condition);
                return next();
                break;
            case 'channel':
                condition.value = filterUtils.channelMapping(condition.value);
                filterUtils.buildCond(query, '_type', condition);
                return next();
                break;
            case 'comment_via':
                condition.value = filterUtils.channelMapping(condition.value);
                filterUtils.buildCond(query, 'stats.last_comment_channel', condition);
                return next();
                break;
            case 'received_at':
                condition.operator = 'is';
                filterUtils.buildCond(query, 'data.receive_support_mail', condition);
                return next();
                break;
            case 'subject_text':
                if(condition.operator == 'is' || condition.operator == 'is_not'){
                    filterUtils.buildCond(query, 'subject.raw', condition);
                    return next();
                }
                condition.isFullText = true;
                condition.operator = (condition.operator == 'not_includes'? 'is_not': 'is');
                filterUtils.buildCond(query, 'subject', condition);
                return next();
                break;
            case 'fb_page':
                filterUtils.buildCond(query, 'data.page_id', condition);
                return next();
                break;
            case 'izi_last_comment':
                condition.value = (condition.value == 'agent'? true: false);
                filterUtils.buildCond(query, 'stats.is_agent_answered', condition);
                return next();
                break;
            case 'submitter':
                if(condition.value == 'current_loggedin_user'){
                    condition.value = user._id;
                }
                filterUtils.buildCond(query, 'submitter_id._id', condition);
                return next();
                break;
            case 'agent_ccs':
                var index = (condition.value || []).indexOf('current_user');
                if(index !== -1){
                    condition.value[index] = user._id;
                }
                filterUtils.buildCond(query, 'cc_agents', condition);
                return next();
                break;
            case 'agent_reply':
                filterUtils.buildCond(query, 'stats.counter_agent_cmt', condition);
                return next();
                break;
            case 'sla':
                filterUtils.buildCond(query, '', condition);
                return next();

                /*if(condition.value == 'processing'){
                    condition.operator = 'greater_than_equal';
                } else if(condition.value == 'overdue'){
                    condition.operator = 'less_than';
                }
                condition.value = 'now/s';
                filterUtils.buildCond(query, 'sla.deadline.agent_working_time', condition);
                filterUtils.buildCond(query, 'status', {
                    operator: 'less_than',
                    value: enumsTicket.TicketStatus.Solved
                });
                return next();*/
                break;
            case 'minutes_since_new':
                filterUtils.buildCond(query, 'status', {
                    operator: 'is',
                    value: enumsTicket.TicketStatus.New
                });
                condition.operator = 'minutes';
                filterUtils.buildCond(query, 'stats.last_time_status_new', condition, moreValue);
                return next();
                break;
            case 'minutes_since_open':
                filterUtils.buildCond(query, 'status', {
                    operator: 'is',
                    value: enumsTicket.TicketStatus.Open
                });
                condition.operator = 'minutes';
                filterUtils.buildCond(query, 'stats.last_time_status_open', condition, moreValue);
                return next();
                break;
            case 'minutes_since_pending':
                filterUtils.buildCond(query, 'status', {
                    operator: 'is',
                    value: enumsTicket.TicketStatus.Pending
                });
                condition.operator = 'minutes';
                filterUtils.buildCond(query, 'stats.last_time_status_pending', condition, moreValue);
                return next();
                break;
            case 'minutes_since_solved':
                filterUtils.buildCond(query, 'status', {
                    operator: 'is',
                    value: enumsTicket.TicketStatus.Solved
                });
                condition.operator = 'minutes';
                filterUtils.buildCond(query, 'stats.last_time_status_solved', condition, moreValue);
                return next();
                break;
            case 'minutes_since_suspended':
                filterUtils.buildCond(query, 'status', {
                    operator: 'is',
                    value: enumsTicket.TicketStatus.Suspended
                });
                condition.operator = 'minutes';
                filterUtils.buildCond(query, 'stats.last_time_status_suspended', condition, moreValue);
                return next();
                break;
            case 'minutes_since_closed':
                filterUtils.buildCond(query, 'status', {
                    operator: 'is',
                    value: enumsTicket.TicketStatus.Closed
                });
                condition.operator = 'minutes';
                filterUtils.buildCond(query, 'stats.last_time_status_closed', condition, moreValue);
                return next();
                break;
            case 'minutes_since_assigned':
                condition.operator = 'minutes';
                filterUtils.buildCond(query, 'stats.last_time_assigned', condition, moreValue);
                return next();
                break;
            case 'minutes_since_update':
                condition.operator = 'minutes';
                filterUtils.buildCond(query, 'upd_time', condition, moreValue);
                return next();
                break;
            case 'minutes_since_requester_update':
                condition.operator = 'minutes';
                filterUtils.buildCond(query, 'stats.last_time_requester_updated', condition, moreValue);
                return next();
                break;
            case 'minutes_since_agent_update':
                condition.operator = 'minutes';
                filterUtils.buildCond(query, 'stats.last_time_agent_updated', condition, moreValue);
                return next();
                break;
            case 'minutes_since_duedate':
                condition.operator = 'minutes';
                filterUtils.buildCond(query, 'deadline', condition, moreValue);
                return next();
                break;
            case 'minutes_until_duedate':
                condition.operator = 'until_minutes';
                filterUtils.buildCond(query, 'deadline', condition, moreValue);
                return next();
                break;
            default:
                return next();
        }
    }
    // if there are other conditions
    else if(condition.cond_type == enums.BizRuleType.Others){
        switch(condition.field_key) {
            case 'izi_comment_domain':
                filterUtils.buildCond(query, 'data.izi_comment_uri.domain', condition);
                return next();
                break;
            case 'izi_chat_domain':
                condition.term = 'match';
                condition.operator = (condition.operator == 'not_includes'? 'is_not': 'is');
                condition.value = (condition.value || []).join(' ');
                
                filterUtils.buildCond(query, 'data.izi_chat_url_key.text', condition);
                return next();
                break;
            default:
                return next();
                break;
        }
    } else if(condition.cond_type == enums.BizRuleType.TicketField){
        filterUtils.detectCustomSettingType(condition);
        filterUtils.buildCond(query, `field.${condition.field_id}`, condition);
        return next();
    }
    // if there are org fields in the conditions
    else if(condition.cond_type == enums.BizRuleType.OrgField){
        filterUtils.detectCustomSettingType(condition);
        filterUtils.buildCond(query, `org_id.field.${condition.field_id}`, condition);
        return next();
    }
    // if there are agent fields in the conditions
    else if(condition.cond_type == enums.BizRuleType.UserField){
        filterUtils.detectCustomSettingType(condition);
        filterUtils.buildCond(query, `agent_id.field.${condition.field_id}`, condition);
        return next();
    }
    // if there are requester fields in the conditions
    else if(condition.cond_type == enums.BizRuleType.RequesterField){
        filterUtils.detectCustomSettingType(condition);
        filterUtils.buildCond(query, `requester_id.field.${condition.field_id}`, condition);
        return next();
    }
    else {
        return next();
    }
}
