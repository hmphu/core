'use strict';
//
//  enums.js
//  define ticket enums
//
//  Created by thanhdh on 2016-01-18.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

exports.Provider = {
    web: 'web',
    voip: 'voip',
    sms: 'sms',
    api: 'api',
    fbComment: 'fbComment',
    fbMessage: 'fbMessage',
    iziChat: 'iziChat',
    iziComment: 'iziComment',
    iziMail: 'iziMail',
    gmail: 'gmail',
    youtube: 'youtube',
    zaloMessage: 'zaloMessage'
};

exports.TicketStatus = {
    New : 0,
    Open : 1,
    Pending : 2,
    Solved : 3,
    Closed : 4,
    On_hold : 5,
    Suspended : 6
};

exports.TicketType = {
    Questions : 1,
    Incidents : 2,
    Problems : 3,
    Tasks : 4
};

exports.TicketPriority = {
    Low : 1,
    Normal : 2,
    High : 3,
    Urgent : 4
};

exports.TicketChanged = {
    Subject: "subject",
    Requester: "requester",
    Status: "status",
    Agent: "agent",
    Group: "group",
    Org: "org",
    Type: "type",
    Fields: "fields",
    Tags: "tags",
    Macro: "macro",
    Priority: "priority"
};

exports.TicketRating = {
    bad: 0,
    good: 1
};

exports.SearchTicketBy = {
    id: 'id',
    requester: 'requester',
    subject: 'subject'
};
