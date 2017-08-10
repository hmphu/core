'use strict';
//
//  automation.js
//  build automation matrix to render layout
//
//  Created by thanhdh on 2016-01-13.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var trigger = require('./trigger');
var enums = require('../../core/resources/enums.res');
/**
 * define automation operator list
 * author : thanhdh
 */
var operators = {
    status: [
        { key: 'is', text: 'br.opt.is' },
        { key: 'is_not', text: 'br.opt.is_not' },
        { key: 'less_than', text: 'br.opt.less_than' },
        { key: 'greater_than', text: 'br.opt.greater_than' }
    ],
    type: [
        { key: 'is', text: 'br.opt.is' },
        { key: 'is_not', text: 'br.opt.is_not' }
    ],
    hours_since_new: [
        { key: 'calendar_is', text: 'br.opt.calendar_is' },
        { key: 'calendar_less_than', text: 'br.opt.calendar_less_than' },
        { key: 'calendar_greater_than', text: 'br.opt.calendar_greater_than' },
        { key: 'biz_is', text: 'br.opt.biz_is' },
        { key: 'biz_less_than', text: 'br.opt.biz_less_than' },
        { key: 'biz_greater_than', text: 'br.opt.biz_greater_than' }
    ]
};

/**
 * define automation value list
 * author : thanhdh
 */
var values = {
    agent: {
        value: '{{db}}',
        pre_value: [
            { key: '', text: 'br.val.empty' }
        ],
        type: enums.CustomType.Drop_down
    },
    requester: {
        value: '{{db}}',
        type: enums.CustomType.Drop_down
    }
};

/**
 * define automation condition list
 * author : thanhdh
 */
exports.condition = {
    status: {
        text: 'br.cond.status',
        operator: operators.status,
        value: trigger.condition.status.value
    },
    type: {
        text: 'br.cond.type',
        operator: operators.type,
        value: trigger.condition.type.value
    },
    priority: {
        text: 'br.cond.priority',
        operator: operators.status,
        value: trigger.condition.priority.value
    },
    group: {
        text: 'br.cond.group',
        operator: operators.type,
        value: trigger.condition.group.value
    },
    agent: {
        text: 'br.cond.agent',
        operator: operators.type,
        value: values.agent
    },
    requester: {
        text: 'br.cond.requester',
        operator: operators.type,
        value: values.requester
    },
    org: {
        text: 'br.cond.org',
        operator: operators.type,
        value: trigger.condition.org.value
    },
    tag: trigger.condition.tag,
    desc: {
        text: 'br.cond.desc',
        operator: trigger.condition.comment_text.operator,
        value: trigger.condition.comment_text.value
    },
    channel: trigger.condition.channel,
    received_at: trigger.condition.received_at,
    hours_since_new: {
        text: 'br.cond.hours_since_new',
        operator: operators.hours_since_new,
        value: trigger.condition.reopen.value
    },
    hours_since_open: {
        text: 'br.cond.hours_since_open',
        operator: operators.hours_since_new,
        value: trigger.condition.reopen.value
    },
    hours_since_pending: {
        text: 'br.cond.hours_since_pending',
        operator: operators.hours_since_new,
        value: trigger.condition.reopen.value
    },
    hours_since_onhold: {
        text: 'br.cond.hours_since_onhold',
        operator: operators.hours_since_new,
        value: trigger.condition.reopen.value
    },
    hours_since_solved: {
        text: 'br.cond.hours_since_solved',
        operator: operators.hours_since_new,
        value: trigger.condition.reopen.value
    },
    hours_since_closed: {
        text: 'br.cond.hours_since_closed',
        operator: operators.hours_since_new,
        value: trigger.condition.reopen.value
    },
    hours_since_assigned: {
        text: 'br.cond.hours_since_assigned',
        operator: operators.hours_since_new,
        value: trigger.condition.reopen.value
    },
    hours_since_update: {
        text: 'br.cond.hours_since_update',
        operator: operators.hours_since_new,
        value: trigger.condition.reopen.value
    },
    hours_since_requester_update: {
        text: 'br.cond.hours_since_requester_update',
        operator: operators.hours_since_new,
        value: trigger.condition.reopen.value
    },
    hours_since_agent_update: {
        text: 'br.cond.hours_since_agent_update',
        operator: operators.hours_since_new,
        value: trigger.condition.reopen.value
    },
    minutes_since_duedate: {
        text: 'br.cond.minutes_since_duedate',
        operator: operators.hours_since_new,
        value: trigger.condition.reopen.value
    },
    minutes_until_duedate: {
        text: 'br.cond.minutes_until_duedate',
        operator: operators.hours_since_new,
        value: trigger.condition.reopen.value
    },
    hours_since_last_sla: {
        text: 'br.cond.hours_since_last_sla',
        operator: operators.hours_since_new,
        value: trigger.condition.reopen.value
    },
    hours_since_next_sla: {
        text: 'br.cond.hours_since_next_sla',
        operator: operators.hours_since_new,
        value: trigger.condition.reopen.value
    }
};

/**
 * define automation action list
 * author : thanhdh
 */
exports.action = trigger.action;
