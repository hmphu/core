'use strict';

var path = require('path');
var config = require(path.resolve('./config/config'));

exports.Settings = {
    MAX_LIMIT : 50,
    FIELD_KEY_PREFIX : 'cs.'
};

exports.SearchType = {
    TICKETS : 0,
    AGENTS : 1,
    REQUESTERS : 2,
    ORGANIZATIONS : 3
};

exports.RefCollection = {
    TICKET : config.dbTablePrefix.concat('ticket'),
    TICKET_COMMENT : config.dbTablePrefix.concat('ticket_comment'),
    TICKET_STATS : config.dbTablePrefix.concat('ticket_stats'),
    USER : config.dbTablePrefix.concat('user'),
    ORGANIZATION : config.dbTablePrefix.concat('organization'),
    GROUP : config.dbTablePrefix.concat('group'),
    GROUP_USER : config.dbTablePrefix.concat('group_user'),
    CONTACT_USER : config.dbTablePrefix.concat('user_contact')
};

exports.UserContactType = {
    email : 1,
    phone : 2,
    facebook : 3,
    chat : 4,
    extension : 5
};

exports.SearchEnumKeyword = {
    'TICKETS' : {
        'status' : {
            'new' : 0,
            'open' : 1,
            'pending' : 2,
            'solved' : 3,
            'closed' : 4,
            'on-hold' : 5,
            'suspended' : 6
        },
        'satisfaction' : {
            'bad' : 0,
            'good' : 1
        },
        'type' : {
            'questions' : 1,
            'incidents' : 2,
            'problems' : 3,
            'tasks' : 4
        },
        'priority' : {
            'low' : 1,
            'normal' : 2,
            'high' : 3,
            'urgent' : 4
        }
    }
};

exports.ValidSearchKeyword = {
    'TICKETS' : {
        'id' : true,
        'created' : true,
        'updated' : true,
        'solved' : true,
        'due_date' : true,
        'commented' : true,
        'assignee' : true,
        'submitter' : true,
        'requester' : true,
        'commenter' : true,
        'via' : true,
        'satisfaction' : true,
        'subject' : true,
        'description' : true,
        'comment' : true,
        'status' : true,
        'type' : true,
        'priority' : true,
        'group' : true,
        'organization' : true,
        'tags' : true,
        'cc' : true,
        'sort' : true
    },
    'AGENTS' : {
        'id' : true,
        'roles' : true,
        'name' : true,
        'phone' : true,
        'email' : true,
        'group' : true,
        'tags' : true,
        'created' : true,
        'updated' : true,
    },
    'REQUESTERS' : {
        'id' : true,
        'name' : true,
        'phone' : true,
        'email' : true,
        'organization' : true,
        'tags' : true,
        'created' : true,
        'updated' : true,
    },
    'ORGANIZATIONS' : {
        'id' : true,
        'name' : true,
        'tags' : true,
        'notes' : true,
        'created' : true,
        'updated' : true,
    }
};
