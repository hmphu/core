'use strict';
//
//  trigger.js
//  build trigger matrix to render layout
//
//  Created by thanhdh on 2016-01-13.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var enums = require('../../core/resources/enums.res');

/**
 * define trigger operator list
 * author : thanhdh
 */
var operators = {
    status: [
        { key: 'is', text: 'br.opt.is' },
        { key: 'is_not', text: 'br.opt.is_not' },
        { key: 'less_than', text: 'br.opt.less_than' },
        { key: 'greater_than', text: 'br.opt.greater_than' },
        { key: 'changed', text: 'br.opt.changed', is_show_value: false },
        { key: 'changed_from', text: 'br.opt.changed_from' },
        { key: 'not_changed', text: 'br.opt.not_changed' },
        { key: 'not_changed_from', text: 'br.opt.not_changed_from' }
    ],
    tag: [
        { key: 'includes', text: 'br.opt.includes' },
        { key: 'not_includes', text: 'br.opt.not_includes' }
    ],
    channel: [
        { key: 'is', text: 'br.opt.is' },
        { key: 'is_not', text: 'br.opt.is_not' }
    ],
    comment_text: [
        { key: 'includes', text: 'br.opt.includes' },
        { key: 'not_includes', text: 'br.opt.not_includes' },
        { key: 'is', text: 'br.opt.is' },
        { key: 'is_not', text: 'br.opt.is_not' }
    ],
    reopen: [
        { key: 'is', text: 'br.opt.is' },
        { key: 'less_than', text: 'br.opt.less_than' },
        { key: 'greater_than', text: 'br.opt.greater_than' }
    ],
    current_user: [
        { key: 'is', text: 'br.opt.is' },
        { key: 'is_not', text: 'br.opt.is_not' }
    ]
};

/**
 * define trigger value list
 * author : thanhdh
 */
var values = {
    status: {
        value: [
            { key: 0, text: 'br.val.new' },
            { key: 1, text: 'br.val.open' },
            { key: 2, text: 'br.val.pending' },
            { key: 3, text: 'br.val.solved' },
            { key: 4, text: 'br.val.closed' }
        ],
        type: enums.CustomType.Drop_down
    },
    type: {
        value: [
            { key: 0, text: 'br.val.none' },
            { key: 1, text: 'br.val.question' },
            { key: 2, text: 'br.val.incident' },
            { key: 3, text: 'br.val.problem' },
            { key: 4, text: 'br.val.task' }
        ],
        type: enums.CustomType.Drop_down
    },
    priority: {
        value: [
            { key: 0, text: 'br.val.none' },
            { key: 1, text: 'br.val.low' },
            { key: 2, text: 'br.val.normal' },
            { key: 3, text: 'br.val.high' },
            { key: 4, text: 'br.val.urgent' }
        ],
        type: enums.CustomType.Drop_down
    },
    group: {
        value: '{{db}}',
        pre_value: [{
            key: '',
            text: 'br.val.empty'
        }],
        type: enums.CustomType.Drop_down
    },
    agent: {
        value: '{{db}}',
        pre_value: [
            { key: '', text: 'br.val.empty' },
            { key: 'random', text: 'br.val.random' },
            { key: 'random_offline', text: 'br.val.random_offline' },
            { key: 'random_online', text: 'br.val.random_online' },
            { key: 'in_turn', text: 'br.val.in_turn' },
            { key: 'current_user', text: 'br.val.current_user' }
        ],
        type: enums.CustomType.Drop_down
    },
    agent_cond: {
        value: '{{db}}',
        pre_value: [
            { key: '', text: 'br.val.empty' },
            { key: 'current_user', text: 'br.val.current_user' }
        ],
        type: enums.CustomType.Drop_down
    },
    requester: {
        value: '{{db}}',
        pre_value: [{
            key: '',
            text: 'br.val.empty'
        }],
        type: enums.CustomType.Drop_down
    },
    org: {
        value: '{{db}}',
        pre_value: [
            { key: '', text: 'br.val.empty' }
        ],
        type: enums.CustomType.Drop_down
    },
    tag: {
        type: enums.CustomType.Text
    },
    reopen: {
        type: enums.CustomType.Numeric
    },
    channel: {
        value: [
            { key: 'local', text: 'br.val.web' },
            { key: 'voip', text: 'br.val.voip' },
            { key: 'sms', text: 'br.val.sms' },
            { key: 'api', text: 'br.val.api' },
            { key: 'fbComment', text: 'br.val.fbComment' },
            { key: 'fbMessage', text: 'br.val.fbMessage' },
            { key: 'iziChat', text: 'br.val.iziChat' },
            { key: 'iziComment', text: 'br.val.iziComment' },
            { key: 'iziMail', text: 'br.val.iziMail' },
            { key: 'gmail', text: 'br.val.gmail' }
        ],
        type: enums.CustomType.Drop_down
    },
    received_at: {
        value: '{{db}}',
        type: enums.CustomType.Drop_down
    },
    ticket_is: {
        value: [
            { key: 'created', text: 'br.val.created' },
            { key: 'updated', text: 'br.val.updated' }
        ],
        type: enums.CustomType.Drop_down
    },
    sla: {
        value: [
            { key: 'reset', text: 'br.val.resetsla' }
        ],
        type: enums.CustomType.Drop_down
    },
    comment_is: {
        value: [
            { key: 'public', text: 'br.val.public' },
            { key: 'private', text: 'br.val.private' }
        ],
        type: enums.CustomType.Drop_down
    },
    in_business_hours: {
        value: [
            { key: 0, text: 'br.val.no' },
            { key: 1, text: 'br.val.yes' }
        ],
        type: enums.CustomType.Drop_down
    },
    due_date: {
        value: [
            { key: 0, text: 'br.val.not_present' },
            { key: 1, text: 'br.val.present' }
        ],
        type: enums.CustomType.Drop_down
    },
    current_user: {
        value: '{{db}}',
        pre_value: [
            { key: 'all_agents', text: 'br.val.all_agents'},
            { key: 'current_loggedin_user', text: 'br.val.current_loggedin_user'},
            { key: 'ticket_agent', text: 'br.val.ticket_agent'},
            { key: 'ticket_requester', text: 'br.val.ticket_requester'}
        ],
        type: enums.CustomType.Drop_down
    },
    email_group: {
        value: '{{db}}',
        pre_value: [{
            key: 'assigned_group',
            text: 'br.val.assigned_group'
        }],
        type: enums.CustomType.Drop_down
    },
    fb_page: {
        value: '{{db}}',
        pre_value: [
            { key: '', text: 'br.val.empty' }
        ],
        type: enums.CustomType.Drop_down
    },
    external_api: {
        value: [
            { key: 0, text: 'br.val.get' },
            { key: 1, text: 'br.val.post' },
            { key: 2, text: 'br.val.put' }
        ],
        type: enums.CustomType.Drop_down
    },
    sms: {
        value: [
            { key: 'all_agents', text: 'br.val.all_agents'},
            { key: 'current_loggedin_user', text: 'br.val.current_loggedin_user'},
            { key: 'ticket_agent', text: 'br.val.ticket_agent'},
            { key: 'ticket_requester', text: 'br.val.ticket_requester'}
        ],
        type: enums.CustomType.Drop_down
    }
};

/**
 * define trigger condition list
 * author : thanhdh
 */
exports.condition = {
    status: {
        text: 'br.cond.status',
        operator: operators.status,
        value: values.status
    },
    type: {
        text: 'br.cond.type',
        operator: operators.status,
        value: values.type
    },
    priority: {
        text: 'br.cond.priority',
        operator: operators.status,
        value: values.priority
    },
    group: {
        text: 'br.cond.group',
        operator: operators.status,
        value: values.group
    },
    agent: {
        text: 'br.cond.agent',
        operator: operators.status,
        value: values.agent_cond
    },
    requester: {
        text: 'br.cond.requester',
        operator: operators.status,
        value: values.requester
    },
    org: {
        text: 'br.cond.org',
        operator: operators.status,
        value: values.org
    },
    tag: {
        text: 'br.cond.tag',
        operator: operators.tag,
        value: values.tag
    },
    channel: {
        text: 'br.cond.channel',
        operator: operators.channel,
        value: values.channel
    },
    comment_via: {
        text: 'br.cond.comment_via',
        operator: operators.channel,
        value: values.channel
    },
    received_at: {
        text: 'br.cond.received_at',
        value: values.received_at
    },
    ticket_is: {
        text: 'br.cond.ticket_is',
        value: values.ticket_is
    },
    subject_text: {
        text: 'br.cond.subject_text',
        operator: operators.comment_text,
        value: values.tag
    },
    comment_is: {
        text: 'br.cond.comment_is',
        value: values.comment_is
    },
    comment_text: {
        text: 'br.cond.comment_text',
        operator: operators.comment_text,
        value: values.tag
    },
    fb_page: {
        text: 'br.cond.fb_page',
        operator: operators.channel,
        value: values.fb_page
    },
    reopen: {
        text: 'br.cond.reopen',
        operator: operators.reopen,
        value: values.reopen
    },
    agent_reply: {
        text: 'br.cond.agent_reply',
        operator: operators.reopen,
        value: values.reopen
    },
    agent_station: {
        text: 'br.cond.agent_station',
        operator: operators.reopen,
        value: values.reopen
    },
    group_station: {
        text: 'br.cond.group_station',
        operator: operators.reopen,
        value: values.reopen
    },
    in_business_hours: {
        text: 'br.cond.in_business_hours',
        value: values.in_business_hours
    },
    on_holiday: {
        text: 'br.cond.on_holiday',
        value: values.in_business_hours
    },
    due_date: {
        text: 'br.cond.due_date',
        value: values.due_date
    },
    current_user: {
        text: 'br.cond.current_user',
        operator: operators.current_user,
        value: values.current_user
    },
    izi_comment_domain: {
        text: 'br.cond.izi_comment_domain',
        operator: operators.channel,
        value: values.tag
    }
};

/**
 * define trigger action list
 * author : thanhdh
 */
exports.action = {
    status: {
        text: 'br.action.status',
        value: values.status
    },
    type: {
        text: 'br.action.type',
        value: values.type
    },
    priority: {
        text: 'br.action.priority',
        value: values.priority
    },
    group: {
        text: 'br.action.group',
        value: values.group
    },
    agent: {
        text: 'br.action.agent',
        value: values.agent
    },
    sla: {
        text: 'br.action.sla',
        value: values.sla
    },
    set_tag: {
        text: 'br.action.set_tag.text',
        desc: 'br.action.set_tag.desc',
        value: values.tag
    },
    add_tag: {
        text: 'br.action.add_tag.text',
        desc: 'br.action.add_tag.desc',
        value: values.tag
    },
    remove_tag: {
        text: 'br.action.remove_tag.text',
        desc: 'br.action.remove_tag.desc',
        value: values.tag
    },
    add_cc: {
        text: 'br.action.add_cc',
        value: values.current_user
    },
    dash: {},
    external_api: {
        text: 'br.action.external_api',
        value: values.external_api,
        fields: {
            url: {
                text: 'br.action.external_api.url',
                type: enums.CustomType.Text
            },
            header: {
                text: 'br.action.external_api.header.text',
                type: enums.CustomType.Text_area,
                desc: 'br.action.external_api.header.desc'
            }
        }
    },
    email_user: {
        text: 'br.action.email_user',
        value: values.current_user,
        fields: {
            subject: {
                text: 'br.action.email_user.subject',
                type: enums.CustomType.Text
            },
            body: {
                text: 'br.action.email_user.body.text',
                type: enums.CustomType.Text_area,
                desc: 'br.action.email_user.body.desc'
            }
        }
    },
    email_group: {
        text: 'br.action.email_group',
        value: values.email_group,
        fields: {
            subject: {
                text: 'br.action.email_group.subject',
                type: enums.CustomType.Text
            },
            body: {
                text: 'br.action.email_group.body.text',
                type: enums.CustomType.Text_area,
                desc: 'br.action.email_group.body.desc'
            }
        }
    },
    sms: {
        text: 'br.action.sms',
        value: values.sms,
        fields: {
            body: {
                text: 'br.action.sms.body.text',
                type: enums.CustomType.Text_area,
                desc: 'br.action.sms.body.desc'
            }
        }
    },
    fb_message: {
        text: 'br.action.fb_message',
        fields: {
            body: {
                text: 'br.action.fb_message.body.text',
                type: enums.CustomType.Text_area,
                desc: 'br.action.fb_message.body.desc'
            }
        }
    }
};
