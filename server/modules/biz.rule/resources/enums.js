'use strict';
//
//  enums.js
//  define biz rule enums
//
//  Created by thanhdh on 2016-01-18.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

exports.Availability = {
    All: 0,
    Group: 1,
    Only_me: 2
};

exports.BizRuleType = {
    Ticket: 0,
    TicketField: 1,
    OrgField: 2,
    UserField: 3,
    RequesterField: 4,
    Notification: 5,
    Others: 6,
    User: 7
};

exports.SlaTargets = {
    First_reply_time : 0,
    Next_reply_time : 1,
    Agent_work_time : 2
};

exports.ViewOrderBy = {
    add_time: 'add_time',
    comment_time: 'comment_time'
};
