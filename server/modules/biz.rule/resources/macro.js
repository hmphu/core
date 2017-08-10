'use strict';
//
//  macro.js
//  build macro matrix to render layout
//
//  Created by thanhdh on 2016-01-13.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var enums = require('../../core/resources/enums.res');

/**
 * define macro value list
 * author : thanhdh
 */
var values = {
    status: {
        value: [
            { key: 1, text: 'br.val.open' },
            { key: 2, text: 'br.val.pending' },
            { key: 3, text: 'br.val.solved' }
        ],
        type: enums.CustomType.Drop_down
    },
    type: {
        value: [
            { key: 1, text: 'br.val.question' },
            { key: 2, text: 'br.val.incident' },
            { key: 3, text: 'br.val.problem' },
            { key: 4, text: 'br.val.task' }
        ],
        type: enums.CustomType.Drop_down
    },
    priority: {
        value: [
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
            { key: 'current_user', text: 'br.val.current_user' }
        ],
        type: enums.CustomType.Drop_down
    },
    tag: {
        type: enums.CustomType.Text
    },
    comment: {
        type: enums.CustomType.Text_area
    },
    comment_mode: {
        value: [
            { key: 1, text: 'br.val.public' },
            { key: 0, text: 'br.val.private' }
        ],
        type: enums.CustomType.Drop_down
    }
};

/**
 * define macro action list
 * author : thanhdh
 */
exports.action = {
    subject: {
        text: 'br.action.subject',
        value: values.tag
    },
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
        value: values.agent
    },
    comment: {
        text: 'br.action.comment',
        value: values.comment,
        desc: 'br.action.desc'
    },
    comment_mode: {
        text: 'br.action.comment_mode',
        value: values.comment_mode
    }
};
