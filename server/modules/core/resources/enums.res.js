'use strict';
//
//  enums.res.js
//  define sys enums
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

exports.UserRoles = {
    owner: 'owner',
    admin: 'admin',
    agent: 'agent',
    requester: 'requester',
    guest: 'guest'
};

exports.UserStatus = {
    online: 0,
    offline: 1,
    invisible: 2
};

exports.CustomType = {
    Drop_down: 0,
    Text: 1,
    Text_area: 2,
    Numeric: 3,
    Decimal: 4,
    Checkbox: 5,
    Regular_expression: 6,
    Date: 7
};

exports.CalendarType = {
    calendar_hours: 1,
    business_hours: 2
};

exports.TicketPriority = {
    Low: 1,
    Normal: 2,
    High: 3,
    Urgent: 4
};

exports.Availability = {
    All: 0,
    Group: 1,
    Only_me: 2
};

exports.TagCloud = {
    Ticket: 0,
    User: 1,
    Org: 2
};

exports.FilterTicket = {
    automation: 'automation',
    report_insight: 'report_insight',
    view: 'view'
}

exports.LegendSlaType = {
    not_sla: 0,
    processing_overdue: 1,
    processing_not_overdue: 2,
    processing_all: 3,
    processed_overdue: 4,
    processed_not_overdue: 5,
    processed_all: 6
};
