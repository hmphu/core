'use strict';
//
//  sla.js
//  build sla matrix to render layout
//
//  Created by thanhdh on 2016-01-13.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var automation = require('./automation'),
    enums = require('../../core/resources/enums.res');

/**
 * define trigger operator list
 * author : thanhdh
 */
var operators = {
    group: [
        { key: 'is', text: 'br.opt.is' },
        { key: 'is_not', text: 'br.opt.is_not' },
        { key: 'present', text: 'br.opt.present', is_show_value: false },
        { key: 'not_present', text: 'br.opt.not_present', is_show_value: false }
    ],
    created: [
        { key: 'before', text: 'br.opt.before' },
        { key: 'before_on', text: 'br.opt.before_on' },
        { key: 'after', text: 'br.opt.after' },
        { key: 'after_on', text: 'br.opt.after_on' },
    ]
};

/**
 * define sla value list
 * author : thanhdh
 */
var values = {
    requester: {
        value: '{{db}}',
        pre_value: [
            { key: '', text: 'br.val.empty'},
            { key: 'current_user', text: 'br.val.current_user'}
        ],
        type: enums.CustomType.Drop_down
    },
    created: {
        type: enums.CustomType.Date
    }
};

/**
 * define sla condition list
 * author : thanhdh
 */
exports.condition = {
    type: automation.condition.type,
    group: {
        text: 'br.cond.group',
        operator: operators.group,
        value: automation.condition.group.value
    },
    agent: {
        text: 'br.cond.agent',
        operator: operators.group,
        value: automation.condition.agent.value
    },
    requester: {
        text: 'br.cond.requester',
        operator: automation.condition.type.operator,
        value: values.requester
    },
    org: {
        text: 'br.cond.org',
        operator: operators.group,
        value: automation.condition.org.value
    },
    tag: automation.condition.tag,
    channel: automation.condition.channel,
    update_via: {
        text: 'br.cond.update_via',
        operator: automation.condition.channel.operator,
        value: automation.condition.channel.value
    },
    received_at: automation.condition.received_at,
    created: {
        text: 'br.cond.created',
        operator: operators.created,
        value: values.created
    }
};
