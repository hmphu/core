'use strict';

exports.Stats = {
    NEW_COUNT : 0,
    SOLVED_COUNT : 1,
    BACKLOG_COUNT : 2,
    AGENT_TOUCHES : 3,
    CSR : 4,
    FIRST_REPLY_TIME_COUNT : 5,
    FIRST_REPLY_TIME_BY_SEGMENT : 6,
    CHANNEL_COUNT : 7,
    SOLVED_AVG_COUNT : 8,
    ASSIGNED_TICKET_COUNT : 9
};

exports.ReportType = {
    DATES : 0,
    AGENTS : 1,
    GROUPS : 2
};

exports.ReportState = {
    created_time : 1,
    comment_time : 2,
    solved_time : 3
};

exports.ReportPeriod = {
    last_month : 30,
    last_week : 7,
    last_day : 1,
    three_day : 3
};

exports.GroupBy = {
    agent : 'agent',
    date : 'date',
    time : 'time'
};

exports.ReportGroupByTime = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 480, 720];
