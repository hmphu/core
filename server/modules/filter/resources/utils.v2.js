'use strict';
//
//  utils.v2.js
//  util file for matching
//
//  Created by thanhdh on 2016-01-13.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var path = require('path'),
    enums = require(path.resolve('./modules/biz.rule/resources/enums')),
    moment = require('moment'),
    enumsTicket = require(path.resolve('./modules/ticket/resources/enums'));

/**
 * mapping operators
 * author: thanhdh
 */
exports.buildCond = (query, column, condition, moreValue) =>{
    var filter = '';
    if(condition.term){
        filter = condition.term;
    } else {
        filter = condition.isFullText? 'match_phrase_prefix': 'term';
    }
    
    // handle minutes op
    if(condition.operator == 'minutes') {
        condition.value = `now-${condition.value || 0}m/s`;
        if(moreValue.operator == 'greater_than'){
            condition.operator = 'less_than';
        }
        else if(moreValue.operator == 'less_than'){
            condition.operator = 'range';
            condition.value = {
                lte: 'now/s',
                gt: condition.value || 0
            };
        }
    } else if(condition.operator == 'until_minutes'){
        condition.value = `now+${condition.value || 0}m/s`;
        if(moreValue.operator == 'less_than'){
            condition.operator = 'range';
            condition.value = {
                lte: condition.value || 0,
                gt: 'now/s'
            };
        } else {
            condition.operator = 'greater_than';
        }
    }
    
    switch(condition.operator) {
        case 'is':
            // null value
            if(!condition.value && condition.value !== 0 && condition.value !== false){
                return query.push({
                    bool: {
                        must_not: {
                            exists: {field: column}
                        }
                    }
                });
            }
            return query.push({
                [filter]: {[column]: condition.value}
            });
            break;
        case 'is_not':
            // null value
            if(!condition.value && condition.value !== 0 && condition.value !== false){
                return query.push({
                    exists: {field: column}
                });
            }
            return query.push({
                bool: {
                    must_not: {
                        [filter]: {[column]: condition.value}
                    }
                }
            });
            break;
        case 'less_than':
            return query.push({
                range: {
                    [column]: {
                        lt: condition.value || 0
                    }
                }
            });
            break;
        case 'less_than_equal':
            return query.push({
                range: {
                    [column]: {
                        lte: condition.value || 0
                    }
                }
            });
            break;
        case 'greater_than':
            return query.push({
                range: {
                    [column]: {
                        gt: condition.value || 0
                    }
                }
            });
            break;
        case 'greater_than_equal':
            return query.push({
                range: {
                    [column]: {
                        gte: condition.value || 0
                    }
                }
            });
            break;
        case 'range':
            return query.push({
                range: {
                    [column]: condition.value
                }
            });
            break;
        case 'includes':
            // null value
            if(!Array.isArray(condition.value) || !condition.value.length){
                return query.push({
                    bool: {
                        must_not: {
                            exists: {field: column}
                        }
                    }
                });
            }
            return query.push({
                terms: {
                    [column]: condition.value || []
                }
            });
            break;
        case 'not_includes':
            // null value
            if(!Array.isArray(condition.value) || !condition.value.length){
                return query.push({
                    exists: {field: column}
                });
            }
            return query.push({
                bool: {
                    must_not: {
                        terms: {
                            [column]: condition.value || []
                        }
                    }
                }
            });
            break;
        case 'before':
            return query.push({
                range: {
                    [column]: {
                        lt: condition.value || 0
                    }
                }
            });
            break;
        case 'after':
            return query.push({
                range: {
                    [column]: {
                        gt: condition.value || 0
                    }
                }
            });
            break;
        case 'before_or_on':
            return query.push({
                range: {
                    [column]: {
                        lte: condition.value || 0
                    }
                }
            });
            break;
        case 'after_or_on':
            return query.push({
                range: {
                    [column]: {
                        gte: condition.value || 0
                    }
                }
            });
            break;
        case 'is_within_the_previous':
            return query.push({
                range: {
                    [column]: {
                        gt: condition.value || 0,
                        lte: 'now/s'
                    }
                }
            });
            break;
        case 'is_within_the_next':
            return query.push({
                range: {
                    [column]: {
                        lt: condition.value || 0,
                        gte: 'now/s'
                    }
                }
            });
            break;
        case 'processing':
            query.push({
                exists: {field: 'sla.deadline.agent_working_time'}
            });

            if(condition.value == 'all'){
                return query.push({range: {status: { lt: enumsTicket.TicketStatus.Solved}}});
            }

            var operator_sla = "", is_overdue = false;

            if(condition.value == 'overdue'){
                operator_sla = 'lt';
                is_overdue = true;
            }else if(condition.value == 'not_overdue'){
                operator_sla = 'gte';
                is_overdue = false;
            }

            return query.push({
                bool: {
                    should: [
                        {
                            bool : {
                                must : [
                                    { range: { status: { lt: enumsTicket.TicketStatus.Pending}}},
                                    { range: { 'sla.deadline.agent_working_time': { [operator_sla]: 'now/s' }}}
                                ]
                            }
                        },{
                            bool : {
                                must : [
                                    { term: { status: enumsTicket.TicketStatus.Pending}},
                                    { term: { 'sla.deadline.is_overdue': is_overdue}}
                                ]
                            }
                        }
                    ]
                }
            });
            break;
        case 'processed':
            //exists: {field: 'stats.last_time_status_solved'}
            query.push({
                exists: {field: 'sla.deadline.agent_working_time'}
            });

            if(condition.value == 'all'){
                return query.push({range: {status: { gte: enumsTicket.TicketStatus.Solved}}});
            }

            return query.push({
                range: {
                    status: {
                        gte: enumsTicket.TicketStatus.Solved,
                        lt: enumsTicket.TicketStatus.Suspended,
                    }
                }
            },{
                term: {
                    'sla.deadline.is_overdue': condition.value == 'overdue'
                }
            });
            break;
            
        default:
            break;
    }
}

/**
 * map izi channel to elastic type
 * author: thanhdh
 */
exports.channelMapping = (channel) =>{
    switch(channel){
        case enumsTicket.Provider.fbMessage:
            return 'fb-chat';
            break;
        case enumsTicket.Provider.fbComment:
            return 'fb-comment';
            break;
        case enumsTicket.Provider.iziComment:
            return 'izi-comment';
            break;
        case enumsTicket.Provider.iziChat:
            return 'izi-chat';
            break;
        case enumsTicket.Provider.api:
            return 'izi-api';
            break;
        case enumsTicket.Provider.web:
            return 'web';
            break;
        case enumsTicket.Provider.voip:
            return 'voip';
            break;
        case enumsTicket.Provider.sms:
            return 'sms';
            break;
        case enumsTicket.Provider.iziMail:
            return 'izi-mail';
            break;
        case enumsTicket.Provider.gmail:
            return 'gmail';
            break;
        case enumsTicket.Provider.youtube:
            return 'youtube';
            break;
        case enumsTicket.Provider.zaloMessage:
            return 'zalo-chat';
            break;
        default:
            return 'undefined';
            break;
    }
}

/**
 * detect type for custom settings
 * author: thanhdh
 */
exports.detectCustomSettingType = (condition) =>{
    switch(condition.ticket_field_type){
        case 'text':
        case 'textarea':
            if(condition.operator == 'is' || condition.operator == 'is_not'){
                condition.field_id = `${condition.field_id}.value.keyword`;
            } else {
                condition.field_id = `${condition.field_id}.value`;
                condition.isFullText = true;
                condition.operator = (condition.operator == 'not_includes'? 'is_not': 'is');
            }
            break;
        case 'dropdown':
        case 'autocomplete':
        case 'multichoice':
            condition.field_id = `${condition.field_id}.value.keyword`;
            break;
        case 'switch':
            // if cond is off, switch to cond is not on
            if(!condition.value && condition.operator == 'is'){
                condition.operator = 'is_not';
                condition.value = 1;
            }
            // if cond is not off, switch to cond is on
            if(!condition.value && condition.operator == 'is_not'){
                condition.operator = 'is';
                condition.value = 1;
            }
            condition.field_id = `${condition.field_id}.value`;
            break;
        default:
            // this is number type area
            //if(Number.parseInt(condition.value)){
            if(!isNaN(condition.value)){
                condition.value = Number(condition.value);
            }
            condition.field_id = `${condition.field_id}.value`;
            break;
    }
}


exports.getColsReport = (trans) => {
    return [
      {
        "key": "_id",
        "text": trans._id
      },
      {
        "key": "subject",
        "text": trans.subject
      },
      {
        "key": "status",
        "text": trans.status_text
      },
      {
        "key": "description",
        "text": trans.description
      },
      {
        "key": "add_time",
        "text": trans.add_time
      },
      {
        "key": "solved_time",
        "text": trans.solved_time
      },
      {
        "key": "is_agent_last_reply",
        "text": trans.is_agent_last_reply
      },
      {
        "key": "sla",
        "text": trans.sla
      },
      {
        "key": "assignee",
        "text": trans.assignee
      },
      {
        "key": "requester",
        "text": trans.requester
      },
      {
        "key": "group",
        "text": trans.group
      },
      {
        "key": "channel",
        "text": trans.channel_text
      },
      {
        "key": "rating",
        "text": trans.rating_text
      },
      {
        "key": "rate_comment",
        "text": trans.rate_comment
      },
      {
        "key": "first_reply_time",
        "text": trans.first_reply_time
      },
      {
        "key": "agent_comment_count",
        "text": trans.agent_comment_count
      }
    ];
};
