'use strict';

/**
 * Module dependencies.
 */

var path            = require('path'),
    moment          = require('moment'),
    mongoose        = require('mongoose'),
    _               = require('lodash'),
    config          = require(path.resolve('./config/config')),
    enums_report    = require('../resources/enums'),
    enums_ticket    = require('../../ticket/resources/enums'),
    es              = require(path.resolve('./config/lib/elasticsearch')),
    utils           = require(path.resolve('./modules/core/resources/utils'));

////  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========

var execute = (options, callback) => {
    var query = {
        index: `ticket-${options.idOwner}`,
        body: {
            _source: false,
            size: 0,
            query: {
                bool: {
                    filter: [{
                        term: {
                            ed_user_id: options.idOwner
                        }
                    },{
                        bool: {
                            must_not: [{
                                term: {
                                    "stats.is_delete": true
                                }
                            },{
                                term: {
                                    "_type": "fb-post"
                                }
                            }]
                        }
                    }]
                }
            }
        }
    };
    
    if(option.filter){
        query.body.query.bool.filter = query.body.query.bool.filter.concat(option.filter);
    }
    
    if(options.should){
        query.body.query.bool.filter.push({
            bool: {
                should: options.should
            }
        });
    }
    
    if(options.aggs){
        query.body.aggs = options.aggs;
    }
    
    es.search(query, callback);
}

var getCSR = (data, handler) => {
    var filter = [{
        exists: {
            field: "rating.upd_time"
        }
    },{
        range: {
            "rating.upd_time": {
                gte: data.start,
                lte: data.end
            }
        }
    }];

    new Promise(function(resolve, reject) {
        //get total        
        execute({ 
            idOwner: data.idOwner, 
            filter: filter, 
            aggs: data.aggs
        }, (err, result) => {
            if(err){
                return reject(err);
            }
            resolve(result);
        });
        
    }).then(function(data) {
        return new Promise(function(resolve, reject) {
            //get total good comment
            filter.push({
                term: {
                    "rating.value": enums_ticket.TicketRating.good
                }
            });
            
            execute({ 
                idOwner: data.idOwner,
                filter: filter, 
                aggs: data.aggs
            }, (err, result) => {
                if(err){
                    return reject(err);
                }
                resolve({all: data, good: result});
            });
        });

    }).then(result => {
        console.log('=====csrByDates=======');
        console.log(JSON.stringify(result));
        return handler();
    }).catch(error => {
        return handler(error);
    });
}
/**
 * Customer satisfaction raring by dates.
 */
var csrByDates = (data, handler) => {
    var idOwner = data.ed_user_id;
        timezone = parseFloat(data.timezone) * 60 * 60 * 1000,
        start = parseInt(data.start),
        end = parseInt(data.end);

    getCSR({
        start: start - timezone,
        end: end - timezone,
        idOwner: idOwner,
        aggs: {
            group_by_time:{
                date_histogram : {
                    field: "rating.upd_time",
                    interval: "1d",
                    format: "dd/MM/yyyy",
                    time_zone: "+07:00"
                }
            }
        }
    }, handler);
};

/**
 * Customer satisfaction raring by agents.
 */
var csrByAgents = (data, handler) => {
    var idOwner = data.ed_user_id;
        userId = data.user_id,
        timezone = parseFloat(data.timezone) * 60 * 60 * 1000,
        start = parseInt(data.start),
        end = parseInt(data.end);
    
    getCSR({
        start: start - timezone,
        end: end - timezone,
        idOwner: idOwner,
        aggs: {
            group_by_agent: {
                terms: {
                    field: "rating.agent_id",
                    order: {
                        _count: "desc"
                    }
                },
                aggs: {
                    tops: {
                        top_hits: {
                            size: 1,
                            _source: {include: ["rating.agent_name"]}
                        }
                    }
                }
            }
        }
    }, handler);
};

/**
 * Customer satisfaction raring by groups.
 */
var csrByGroups = (data, handler) => {
    var idOwner = data.ed_user_id;
        userId = data.user_id,
        timezone = parseFloat(data.timezone) * 60 * 60 * 1000,
        start = parseInt(data.start),
        end = parseInt(data.end);
    
    getCSR({
        start: start - timezone,
        end: end - timezone,
        idOwner: idOwner,
        aggs: {
            group_by_group: {
                terms: {
                    field: "rating.group_id",
                    order: {
                        _count: "desc"
                    }
                },
                aggs: {
                    tops: {
                        top_hits: {
                            size: 1,
                            _source: {include: ["rating.group_name"]}
                        }
                    }
                }
            }
        }
    }, handler);
};

/**
 * Satisfaction Rating is the average customer satisfaction rating given during the reporting period.
 */
var statsByCustomerSatisfactionRating = (data, handler) => {
    var reportType = data.report_type;
    
    switch (reportType) {
        case enums_report.ReportType.DATES:
            csrByDates(data, handler);
            break;
        case enums_report.ReportType.AGENTS:
            csrByAgents(data, handler);
            break;
        case enums_report.ReportType.GROUPS:
            csrByGroups(data, handler);
            break;
        default:
            handler(null, []);
            break;
    }
};

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========
/**
 * Ticket statistic.
 */
exports.ticketStats = (req, res, next) => {
    var stats       = (req.params.stats || '').toUpperCase(),
        type        = (req.query.type || '').toUpperCase(),
        now         = Date.now(),
        start       = req.query.start || now,
        end         = req.query.end || now,
        idOwner     = utils.getParentUserId(req.user),
        user_id     = req.user._id,
        only_me     = req.query.me,
        timezone    = req.user.time_zone.value;
    
    if (typeof enums_report.ReportType[type] === 'undefined') {
        return next(new TypeError('report.ticket.stats.unsupported'));
    }

    if (typeof enums_report.Stats[stats] === 'undefined') {
        return next(new TypeError('report.ticket.stats.unsupported'));
    }
    
    if (end - start > 90 * 24 * 60 * 60 * 1000) { // date range must be in 90 days
        return next(new TypeError('report.ticket.stats.date.range.over'));
    }

    if (end < start) { // start must be less than end
        return next(new TypeError('report.ticket.stats.date.range.invalid'));
    }

    var data = {
        report_type : enums_report.ReportType[type],
        report_stats : enums_report.Stats[stats],
        ed_user_id : idOwner,
        user_id : user_id,
        only_me : only_me,
        timezone : timezone,
        start : start,
        end : end
    };
    
    switch (stats) {
        case enums_report.Stats.CSR:
            statsByCustomerSatisfactionRating(data, next);
            break;
        /*case enums_report.Stats.AGENT_TOUCHES:
            statsAgentTouches(data, next);
            break;*/
        case enums_report.Stats.NEW_COUNT:
            statsByCreated(data, next);
            break;
        case enums_report.Stats.SOLVED_COUNT:
            statsBySolved(data, next);
            break;
        case enums_report.Stats.SOLVED_AVG_COUNT:
            statsByAvgSolved(data, next);
            break;
        case enums_report.Stats.BACKLOG_COUNT:
            statsBacklog(data, next);
            break;
        case enums_report.Stats.FIRST_REPLY_TIME_COUNT:
            statsFirstReplyTime(data, next);
            break;
        case enums_report.Stats.FIRST_REPLY_TIME_BY_SEGMENT:
            var segment1 = 1 * 60 * 60 * 1000; // 1 hour
            var segment2 = 8 * 60 * 60 * 1000; // 8 hours
            var segment3 = 24 * 60 * 60 * 1000; // 24 hours
            data.segments = [segment1, segment2, segment3];
            statsFirstReplyTimeBySegments(data, next);
            break;
        case enums_report.Stats.CHANNEL_COUNT:
            statsByChannels(data, next);
            break;
        case enums_report.Stats.ASSIGNED_TICKET_COUNT:
            statsAssignedTickets(data, next);
            break;
        default:
            next(null, []);
        break;
    }
};












/**
 * Ticket statistic.
 */
exports.stats = (payload) => {
    var stats = payload.report_stats;
    var type = payload.report_type;
    var userId = payload.user_id;
    
    var topic = util.format('izi-core-client-ticket-report-%s-%s', stats, type);

    var handler = (err, results) => {
        if (err) {
            console.error(new Error(JSON.stringify(err)));
        }

        socketIO({
            namespace : '/core',
            targetId : `agent-${userId}`,
            data : {
                topic : topic,
                payload : results
            }
        });
    };
    
    switch (stats) {
        case enums_report.Stats.CSR:
            statsByCustomerSatisfactionRating(payload, handler);
            break;
        case enums_report.Stats.AGENT_TOUCHES:
            statsAgentTouches(payload, handler);
            break;
        case enums_report.Stats.NEW_COUNT:
            statsByCreated(payload, handler);
            break;
        case enums_report.Stats.SOLVED_COUNT:
            statsBySolved(payload, handler);
            break;
        case enums_report.Stats.SOLVED_AVG_COUNT:
            statsByAvgSolved(payload, handler);
            break;
        case enums_report.Stats.BACKLOG_COUNT:
            statsBacklog(payload, handler);
            break;
        case enums_report.Stats.FIRST_REPLY_TIME_COUNT:
            statsFirstReplyTime(payload, handler);
            break;
        case enums_report.Stats.FIRST_REPLY_TIME_BY_SEGMENT:
            var segment1 = 1 * 60 * 60 * 1000; // 1 hour
            var segment2 = 8 * 60 * 60 * 1000; // 8 hours
            var segment3 = 24 * 60 * 60 * 1000; // 24 hours
            payload.segments = [segment1, segment2, segment3];
            statsFirstReplyTimeBySegments(payload, handler);
            break;
        case enums_report.Stats.CHANNEL_COUNT:
            statsByChannels(payload, handler);
            break;
        case enums_report.Stats.ASSIGNED_TICKET_COUNT:
            statsAssignedTickets(payload, handler);
            break;
        default:
            handler(null, []);
        break;
    }
};

    


var mongoose = require('mongoose');
var moment = require('moment');
var path = require('path');
var sanitizeHtml = require('sanitize-html');
var enums = require('../resources/enums');
var rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq'));
var socketIO = require(path.resolve('./config/lib/socket.io'));
var utils = require(path.resolve('./modules/core/resources/utils'));
var config = require(path.resolve('./config/config'));
var _ = require('lodash');
var enums_report = require('../resources/enums');
var enums_ticket = require('../../ticket/resources/enums');
var enums_res = require('../../core/resources/enums.res');
var Utils_report = require('../resources/utils');
var Utils = require('../../core/resources/utils');
var Report = mongoose.model('Report');
var translation = require('../resources/translate.res');


var getLegendCond = function (report, series_id){
    var serier = _.find(report.data_series, function(o) { return o._id == series_id; });
    var now = +moment.utc();
    if(!serier){
        return null;
    };
    
    var sla_type_processing = _.groupBy(serier.all_conditions, function(o){return o.field_key == 'sla' && o.operator=='processing'}),
        sla_type_processed = _.groupBy(serier.all_conditions, function(o){return o.field_key == 'sla' && o.operator=='processed'});
    
    if(sla_type_processing.true && sla_type_processed.true){
        return {
            legend_sla_type: {$eq : 9999 } //break this case
        };
    }
    
    if(!sla_type_processing.true && !sla_type_processed.true){
        return {
            legend_sla_type: {$eq : enums_res.LegendSlaType.not_sla }
        };
    }

    if(sla_type_processing.true){
        var processing_overdue = _.groupBy(serier.all_conditions, function(o){return o.operator=='processing' && o.value=='overdue'}),
            processing_not_overdue = _.groupBy(serier.all_conditions, function(o){return o.operator=='processing' && o.value=='not_overdue'});

        if(processing_overdue.true){
            return {
                series_id: mongoose.Types.ObjectId(series_id),
                legend_sla_type: {$eq : enums_res.LegendSlaType.processing_overdue },
                "sla.solved_date": {$eq : 0 },
                "sla.agent_working_time": {$lt: now}
            };
            
        }else if(processing_not_overdue.true){
            return {
                series_id: mongoose.Types.ObjectId(series_id),
                legend_sla_type: {$eq : enums_res.LegendSlaType.processing_not_overdue },
                "sla.solved_date": {$eq : 0 },
                "sla.agent_working_time": {$gte: now}
            };
        }else{
            return {
                series_id: mongoose.Types.ObjectId(series_id),
                legend_sla_type: {$eq : enums_res.LegendSlaType.processing_all },
                "sla.solved_date": {$eq : 0 }
            };
        }

    }else if(sla_type_processed.true){
        var processed_overdue = _.groupBy(serier.all_conditions, function(o){return o.operator=='processed' && o.value=='overdue'}),
            processed_not_overdue = _.groupBy(serier.all_conditions, function(o){return o.operator=='processed' && o.value=='not_overdue'});
        
        if(processed_overdue.true){
            return {
                series_id: mongoose.Types.ObjectId(series_id),
                legend_sla_type: {$eq : enums_res.LegendSlaType.processed_overdue },
                "sla.solved_date": {$gt : 0 },
                "sla.work_time_vs_solved_date": {$lt: 0}
            };

        }else if(processed_not_overdue.true){
            return {
                series_id: mongoose.Types.ObjectId(series_id),
                legend_sla_type: {$eq : enums_res.LegendSlaType.processed_not_overdue },
                "sla.solved_date": {$gt : 0 },
                "sla.work_time_vs_solved_date": {$gte: 0}
            };
        }else{
            return {
                series_id: mongoose.Types.ObjectId(series_id),
                legend_sla_type: {$eq : enums_res.LegendSlaType.processed_all },
                "sla.solved_date": {$gt : 0 }
            };
        }
    }
};

var convert_time = function (value, time_zone, lang){
    return value != "" ? moment(value).utcOffset(time_zone).format( lang == "vi"? "DD/MM/YYYY H:mm": "MM/DD/YYYY H:mm"): "";
};
//lang == "vi"? "DD/MM/YYYY H:mm": "MM/DD/YYYY H:mm"
var slaTime = function (doc){
    if(doc.ticket_infor.sla != undefined && doc.ticket_infor.sla.deadline){
        var tmp = doc.ticket_infor.sla.deadline.agent_working_time;
        if(doc.ticket_stats.date.status != undefined && doc.ticket_stats.date.status.Solved){
            tmp -= doc.ticket_stats.date.status.Solved;
        }else{
            tmp -= +moment.utc();
        }
        
        tmp = Math.round(tmp/1000);
        
        if(doc.ticket_stats.counter.status != undefined && doc.ticket_stats.counter.status.Pending){
            tmp += doc.ticket_stats.counter.status.Pending;
        }
        
        return tmp;
    }else{
        return "";
    }
};

var convertTicket = function(columns, doc, req){
    var ticket = {};
    var lang = translation[req.user.language || "en"];
    columns.forEach(function(o){
        if(o.is_cs){
            o.key = isNaN(o.key) ? o.key : (" " + o.key);
            if(!doc.ticket_infor.fields){
                doc.ticket_infor.fields = [];
            }
            
            var field = doc.ticket_infor.fields[o.key] || "";
            if(Array.isArray(field)){
                ticket[o.key] = _.join(field, ', ') || "";
            }else{
                switch(o.cs_type){
                    case "date":
                        ticket[o.key] = field != "" ? convert_time(field, req.user.time_zone.value, req.user.language) : "";
                        break;
                    case "switch":
                        ticket[o.key] = field == 1 ? "1" : "0";
                        break;
                    default:
                        ticket[o.key] = field || "";
                        break;
                }
            }
        }else{
            switch(o.key){
                case "_id":
                    ticket._id = doc.ticket_infor ? doc.ticket_infor._id : "";
                    break;
                case "subject":
                    ticket.subject = doc.ticket_infor ? doc.ticket_infor.subject : "";
                    break;
                case "status":
                    ticket.status = doc.ticket_infor ? (lang.status[doc.ticket_infor.status] || "") : "";
                    break;
                case "description":
                    if(!doc.comment_infor || doc.comment_infor.length == 0){
                        ticket.description = "";
                        console.error("TICKET NOT COMMENT(DESCRIPTION): " + JSON.stringify(doc));
                        break;
                    }
                    
                    var description = _.sortBy(doc.comment_infor, ['add_time'])[0].content;
                    ticket.description =  sanitizeHtml(`<div>${description}</div>`, {
                        allowedTags: [],
                        allowedAttributes: []
                    });
                    break;
                case "add_time":
                    ticket.add_time = convert_time(doc.ticket_infor.add_time, req.user.time_zone.value, req.user.language);
                    break;
                case "solved_time":
                    if(!doc.ticket_stats){
                        ticket.solved_time = "";
                        break;
                    }
                    
                    ticket.solved_time = (doc.ticket_stats.date.status != undefined && doc.ticket_stats.date.status.Solved) ? convert_time(doc.ticket_stats.date.status.Solved, req.user.time_zone.value, req.user.language) : '';
                    break;
                case "is_agent_last_reply":
                    if(!doc.ticket_stats){
                        ticket.is_agent_last_reply = "";
                        break;
                    }
                    
                    ticket.is_agent_last_reply = doc.ticket_stats.is_agent_unanswered ? "" : "1";
                    break;
                case "sla":
                    ticket.sla = slaTime(doc);
                    break;
                case "assignee":
                    if(!doc.agent_infor){
                        ticket.assignee = "";
                        break;
                    }
                    
                    ticket.assignee = (doc.agent_infor && doc.agent_infor[0] != undefined) ? doc.agent_infor[0].name : '';
                    break;
                case "requester":
                    ticket.requester = (doc.requester_infor && doc.requester_infor[0] != undefined) ? doc.requester_infor[0].name : '';
                    break;
                case "group":
                    ticket.group = (doc.group_infor && doc.group_infor[0] != undefined) ? doc.group_infor[0].name : '';
                    break;
                case "channel":
                    if(!doc.ticket_stats){
                        ticket.channel = "";
                        break;
                    }
                    
                    ticket.channel = lang.channel[doc.ticket_stats.provider];
                    break;
                case "rating":
                    if(!doc.ticket_stats){
                        ticket.rate = "";
                        break;
                    }
                    
                    ticket.rate = doc.ticket_stats.rating != undefined ? lang.rating[utils.getEnumKeyByValue(enums_ticket.TicketRating, doc.ticket_stats.rating.value)] : lang.rating['unoffered'];
                    break;
                case "rate_comment":
                    if(!doc.ticket_stats){
                        ticket.rate_comment = "";
                        break;
                    }
                    
                    ticket.rate_comment = doc.ticket_stats.rating != undefined ? (doc.ticket_stats.rating.comment || '') : '';
                    break;
                case "first_reply_time":
                    if(!doc.ticket_stats || !doc.ticket_stats.agent_first_replied || !doc.ticket_stats.agent_first_replied.upd_time){
                        ticket.first_reply_time = "";
                        break;
                    }
                    ticket.first_reply_time = convert_time(doc.ticket_stats.agent_first_replied.upd_time, req.user.time_zone.value, req.user.language);
                    break;
                case "agent_comment_count":
                    if(!doc.ticket_stats){
                        ticket.agent_comment_count = "";
                        break;
                    }

                    ticket.agent_comment_count = doc.ticket_stats.counter.agent_cmt.value || '';
                    break;
                case "agent_comment_name":
                    if(!doc.provider_data || !doc.provider_data.agents_comment_name){
                        ticket.agent_comment_name = "";
                        break;
                    }
                    ticket.agent_comment_name = _.join(doc.provider_data.agents_comment_name, ', ');
                    break;
                case "cc_agents":
                    if(!doc.provider_data || !doc.provider_data.cc_agents_value){
                        ticket.cc_agents = "";
                        break;
                    }
                    ticket.cc_agents = _.join(_.map(doc.provider_data.cc_agents_value, function(o){return o.name;}), ', ');
                    break;
            }
        }
    });
    return ticket;
}

/**
 * Ticket statistic.
 */
exports.ticketStats = (req, res, next) => {
    var stats = (req.params.stats || '').toUpperCase();
    var type = (req.query.type || '').toUpperCase();
    var now = Date.now();
    var start = req.query.start || now;
    var end = req.query.end || now;
    var cached = req.query.cached || true;
    
    if (typeof enums.ReportType[type] === 'undefined') {
        return next(new TypeError('report.ticket.stats.unsupported'));
    }

    if (typeof enums.Stats[stats] === 'undefined') {
        return next(new TypeError('report.ticket.stats.unsupported'));
    }
    
    if (end - start > 90 * 24 * 60 * 60 * 1000) { // date range must be in 90 days
        return next(new TypeError('report.ticket.stats.date.range.over'));
    }

    if (end < start) { // start must be less than end
        return next(new TypeError('report.ticket.stats.date.range.invalid'));
    }

    var payload = {
        report_type : enums.ReportType[type],
        report_stats : enums.Stats[stats],
        ed_user_id : utils.getParentUserId(req.user),
        user_id : req.user._id,
        only_me : req.query.me,
        timezone : req.user.time_zone.value,
        start : start,
        end : end,
        cached : cached
    };
    res.json({ is_success: true });
};

/**
 * Ticket insights.
 */
exports.ticketInsights = (req, res, next) => {
    var now = Date.now();
    var report = req.report;
    var reportId = (req.params.reportId || '').toUpperCase();
    var cached = req.query.cached == '1';
    var start = null;
    var end = null;
    var time_user = req.user.time_zone.value*60*60*1000;

    if(report.is_fixed_date){
        start = report.from_date || now;
        end = report.to_date || now;

        if (end - start > 90 * 24 * 60 * 60 * 1000) { // date range must be in 90 days
            return next(new TypeError('report.ticket.stats.date.range.over'));
        }

        if (end < start) { // start must be less than end
            return next(new TypeError('report.ticket.stats.date.range.invalid'));
        }
    }else{
        start = req.query.start || now;
        end = req.query.end || now;

        if(report.relative_day === 1){ // 24h
            start = +moment.utc().startOf('day').subtract(1, 'day') - time_user;
            end = +moment.utc().endOf('day') - time_user;
        } else {
            start = +moment.utc().startOf('day').subtract(report.relative_day, 'day') - time_user;
            end = +moment.utc().endOf('day').subtract(1, 'day') - time_user;
        }
    }

    var payload = {
        report_id :reportId,
        user_id: req.user._id,
        ed_user_id : utils.getParentUserId(req.user),
        timezone : req.user.time_zone.value,
        group_by: report.group_by,
        start : start,
        end : end,
        report_time_from: report.report_time_from,
        report_time_to: report.report_time_to,
        cached : cached
    };
    // send data to queue to execute report
    rbSender(config.rabbit.sender.exchange.report, { topic : 'izi-core-ticket-report-insights', payload : payload });
    
    res.json({ is_success: true });
};

exports.getTickets = (req, res, next) => {
    var data = JSON.parse(req.query.q),
        skip = parseInt(req.query.skip) || 0,
        timezone = req.user.time_zone.value * 60 * 60 * 1000,
        now = Date.now(),
        start = null,
        end = null,
        m = null,
        query = {
            series_id: mongoose.Types.ObjectId(data.series_id),
            report_id: mongoose.Types.ObjectId(data.report_id),
            ed_user_id: utils.getParentUserId(req.user),
            //"sla.sla_date" : {$gte : +moment.utc() }
        },
        is_export = req.query.export == '1' ? true : false,
        lang = translation[req.user.language || "en"],
        columns = [{key: '_id'}, {key:'subject'}, {key:'description'}, {key:'status'}, {key:'add_time'}, {key:'solved_time'}, {key:'is_agent_last_reply'}, {key:'sla'}, {key:'assignee'}, {key:'group'}, {key:'requester'}, {key:'channel'}, {key:'rating'}, {key:'rate_comment'}, {key:'first_reply_time'}, {key:'agent_comment_count'}];
    
    if(req.query.columns){
        columns = JSON.parse(req.query.columns) || [];
    }

    Report.findById(data.report_id).exec((err, report_result) => {
        if (err) {
            return next(err);
        }
        
        query = _.assign(query, getLegendCond(report_result, data.series_id));

        if(!data.is_total){
            if(data.group_by == "date"){
                m = moment(data.date, data.format).utcOffset(req.user.time_zone.value);
                query.date = {
                    $gte: +m.startOf('day'),
                    $lte: +m.endOf('day')
                };
            }else{
                if(data.group_by == "agent"){
                    query.is_agent_suspended = false;
                    query.agent_id = data.agent_id == null ? null : mongoose.Types.ObjectId(data.agent_id);
                }

                if(data.is_fixed_date){
                    start = data.from_date || now;
                    end = data.to_date || now;

                    if (end - start > 90 * 24 * 60 * 60 * 1000) {
                        return next(new TypeError('report.ticket.stats.date.range.over'));
                    }

                    if (end < start) {
                        return next(new TypeError('report.ticket.stats.date.range.invalid'));
                    }
                }else{
                    if(data.relative_day === 1){ // 24h
                        start = +moment.utc().startOf('day').subtract(1, 'day') - timezone;
                        end = +moment.utc().endOf('day') - timezone;
                    } else {
                        start = +moment.utc().startOf('day').subtract(data.relative_day, 'day') - timezone;
                        end = +moment.utc().endOf('day').subtract(1, 'day') - timezone;
                    }

                }
                query['date'] =  { $gte : start, $lte : end };
            }
        }else{
            if(data.is_fixed_date){
                start = data.from_date || now;
                end = data.to_date || now;

                if (end - start > 90 * 24 * 60 * 60 * 1000) {
                    return next(new TypeError('report.ticket.stats.date.range.over'));
                }

                if (end < start) {
                    return next(new TypeError('report.ticket.stats.date.range.invalid'));
                }
            }else{
                if(data.relative_day === 1){ // 24h
                    start = +moment.utc().startOf('day').subtract(1, 'day') - timezone;
                    end = +moment.utc().endOf('day')  - timezone;
                } else {
                    start = +moment.utc().startOf('day').subtract(data.relative_day, 'day') - timezone;
                    end = +moment.utc().endOf('day').subtract(1, 'day') - timezone;
                }
            }
            query['date'] =  { $gte : start, $lte : end };
        }


        if(data.is_date){
            delete query.series_id;
        }

        var state_sort = {
            $sort: {
                add_time : -1
            }
        };

        var state_limit = {
            $limit: 50
        };

        var state_skip = {
            $skip: skip
        };

        var state1 = {
            $match: query
        };

        var state1_1 = {
            $project : {
                report_id : 1,
                series_id : 1,
                legend : 1,
                ticket_id : 1,
                agent_id: 1,
                provider_data: 1,
                add_time: 1,
                date : {
                    $add : ['$date', timezone]
                }
            }
        };

        var state1_2 = {
            $project : {
                report_id : 1,
                series_id : 1,
                legend : 1,
                ticket_id : 1,
                agent_id: 1,
                provider_data: 1,
                add_time: 1,
                date : { 
                    $add : [new Date(0), '$date']
                }
            }
        };

        var state2 = {
            $project : {
                report_id : 1,
                series_id : 1,
                legend : 1,
                ticket_id : 1,
                agent_id: 1,
                provider_data: 1,
                add_time: 1,
                date : 1,
                hour: {
                    $hour : '$date'
                },
                minute: {
                    $minute : '$date'
                }
            }
        };

        var state3 = {
            $match: {
                hour : {
                    $gte : data.report_time_from,
                    $lte : data.report_time_to
                }
            }
        };

        var state3_time = {
            $match: {
                hour : {
                    $gte : data.hour_from,
                    $lte : data.hour_to
                },
                minute: {
                    $gte : data.minute_from,
                    $lte : data.minute_to
                }
            }
        };

        var state4 = {
            $lookup: {
                "from": config.dbTablePrefix.concat('ticket_stats'),
                "localField": "ticket_id",
                "foreignField": "ticket_id",
                "as": "ticket_stats"
            }
        };

        var state6 = {
            $lookup: {
                "from": config.dbTablePrefix.concat('ticket'),
                "localField": "ticket_id",
                "foreignField": "_id",
                "as": "ticket_infor"
            }
        };

        var state7 = {
            $project : {
                report_id : 1,
                series_id : 1,
                legend : 1,
                ticket_id : 1,
                agent_id: 1,
                provider_data: 1,
                add_time: 1,
                date : 1,
                hour: 1,
                minute: 1,
                ticket_stats: {
                    $arrayElemAt: ["$ticket_stats", 0]
                },
                ticket_infor: {
                    $arrayElemAt: ["$ticket_infor", 0]
                },
            }  
        };

        var state8 = {
            $lookup: {
                "from": config.dbTablePrefix.concat('user'),
                "localField": "ticket_infor.agent_id",
                "foreignField": "_id",
                "as": "agent_infor"
            }
        };

        var state9 = {
            $lookup: {
                "from": config.dbTablePrefix.concat('user'),
                "localField": "ticket_infor.requester_id",
                "foreignField": "_id",
                "as": "requester_infor"
            }
        };
        var state10 = {
            $lookup: {
                "from": config.dbTablePrefix.concat('ticket_comment'),
                "localField": "ticket_infor._id",
                "foreignField": "ticket_id",
                "as": "comment_infor"
            }
        };
        var state11 = {
            $lookup: {
                "from": config.dbTablePrefix.concat('group'),
                "localField": "ticket_infor.group_id",
                "foreignField": "_id",
                "as": "group_infor"
            }
        }

        var tickets = [];
        var states = [state1, state1_1, state1_2, state2, state3, state_sort, state_skip, state_limit, state4, state6, state7, state8, state9, state10, state11];

        if(is_export){
            states = [state1, state1_1, state1_2, state2, state3, state4, state6, state7, state8, state9, state10, state11];
        }

        if(!data.is_total && data.group_by == "time"){
            states = [state1, state1_1, state1_2, state2, state3, state3_time, state_sort, state_skip, state_limit, state4, state6, state7, state8, state9, state10, state11];

            if(is_export){
                states = [state1, state1_1, state1_2, state2, state3, state3_time, state4, state6, state7, state8, state9, state10, state11];
            }
        }

        var cursor = TicketInsight.aggregate(states).allowDiskUse(true).cursor({ batchSize : 500 }).exec();
        cursor.each((err, doc) => {

            if (err) {
                return console.error(new Error(JSON.stringify(err)));
            }

            if (doc) {
                doc = convertTicket(columns, doc, req);
                tickets.push(doc);
            } else {
                if(!is_export){
                    res.json({tickets: tickets});
                }
            }

            if(is_export){
                socketIO.emit('/worker', req.user._id, {
                    topic : 'izi-core-client-ticket-export-insights',
                    payload :  {
                        data : doc,
                        is_end: doc == null
                    }
                });
            }
        }); 

        if(is_export){
            res.json(null);
        }  
    });
};

exports.getExcelFile = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user),
        time_zone = req.user.time_zone.value * 60 * 60 * 1000,
        columns_select = JSON.parse(req.query.columns) || [];

    Report.findById(req.report._id).exec((err, report_result) => {
        if (err) {
            return next(err);
        }
        
        var arr_or = [];
        report_result.data_series.forEach(function(o){
            arr_or.push(getLegendCond(report_result, o._id));
        });

        var state1 = {
            $match: {
                report_id: mongoose.Types.ObjectId(req.report._id),
                ed_user_id: mongoose.Types.ObjectId(idOwner),
                date : {
                    $gte : parseInt(req.query.start),
                    $lte : parseInt(req.query.end)
                },
                $or: arr_or
            }
        };

        if(report_result.group_by == "agent"){
            state1['$match'].is_agent_suspended = false;
        }

        var states = [
            state1,
            {
                $project : {
                    report_id : 1,
                    series_id : 1,
                    legend : 1,
                    ticket_id : 1,
                    agent_id: 1,
                    provider_data: 1,
                    add_time: 1,
                    date : {
                        $add : ['$date', time_zone]
                    }
                }
            },{
                $project : {
                    report_id : 1,
                    series_id : 1,
                    legend : 1,
                    ticket_id : 1,
                    agent_id: 1,
                    provider_data: 1,
                    add_time: 1,
                    date : {
                        $add : [new Date(0), '$date']
                    }
                }
            },{
                $project : {
                    report_id : 1,
                    series_id : 1,
                    legend : 1,
                    ticket_id : 1,
                    agent_id: 1,
                    provider_data: 1,
                    add_time: 1,
                    date : 1,
                    hour: {
                        $hour : '$date'
                    }
                }
            },{
                $match: {
                    hour : {
                        $gte : parseInt(req.query.time_from),
                        $lte : parseInt(req.query.time_to)
                    }
                }
            },{
                $group: {
                    _id: '$ticket_id',
                    report_id : { $first: '$report_id'},
                    series_id : { $first: '$series_id'},
                    legend : { $first: '$legend'},
                    ticket_id : { $first: '$ticket_id'},
                    agent_id: { $first: '$agent_id'},
                    provider_data: { $first: '$provider_data'},
                    add_time: { $first: '$add_time'},
                    date : { $first: '$date'},
                    hour: { $first: '$hour'}
                }
            },{
                $lookup: {
                    "from": config.dbTablePrefix.concat('ticket_stats'),
                    "localField": "ticket_id",
                    "foreignField": "ticket_id",
                    "as": "ticket_stats"
                }
            },{
                $lookup: {
                    "from": config.dbTablePrefix.concat('ticket'),
                    "localField": "ticket_id",
                    "foreignField": "_id",
                    "as": "ticket_infor"
                }
            },{
                $project : {
                    report_id : 1,
                    series_id : 1,
                    legend : 1,
                    ticket_id : 1,
                    agent_id: 1,
                    provider_data: 1,
                    add_time: 1,
                    date : 1,
                    hour: 1,
                    ticket_stats: {
                        $arrayElemAt: ["$ticket_stats", 0]
                    },
                    ticket_infor: {
                        $arrayElemAt: ["$ticket_infor", 0]
                    },
                }
            },{
                $lookup: {
                    "from": config.dbTablePrefix.concat('user'),
                    "localField": "ticket_infor.agent_id",
                    "foreignField": "_id",
                    "as": "agent_infor"
                }
            },{
                $lookup: {
                    "from": config.dbTablePrefix.concat('user'),
                    "localField": "ticket_infor.requester_id",
                    "foreignField": "_id",
                    "as": "requester_infor"
                }
            },{
                $lookup: {
                    "from": config.dbTablePrefix.concat('ticket_comment'),
                    "localField": "ticket_infor._id",
                    "foreignField": "ticket_id",
                    "as": "comment_infor"
                }
            },{
                $lookup: {
                    "from": config.dbTablePrefix.concat('group'),
                    "localField": "ticket_infor.group_id",
                    "foreignField": "_id",
                    "as": "group_infor"
                }
            }
            /*,{
                $unwind: {
                    "path": "$ticket_stats",
                    "preserveNullAndEmptyArrays": true
                }
            },{
                $unwind: {
                    "path": "$ticket_infor",
                    "preserveNullAndEmptyArrays": true
                }
            }*/
        ];

        var cursor = TicketInsight.aggregate(states).allowDiskUse(true).cursor({ batchSize : 500 }).exec();
        cursor.each((err, doc) => {
            if (err) {
                return console.error(new Error(JSON.stringify(err)));
            }

            if(doc){
                doc = convertTicket(columns_select, doc, req);
            }

            socketIO.emit('/worker', req.user._id, {
                topic : 'izi-core-client-ticket-export-insights',
                payload :  {
                    data : doc,
                    is_end: doc == null
                }
            });
        });
        res.json(null);
    });
};


/**
 * report middleware
 */
exports.reportByID = (req, res, next, id) => {

    // check the validity of report id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('report.insight.id_notfound'));
    }

    var idOwner = utils.getParentUserId(req.user);
    // find report by its id
    Report.findById(id).exec((err, report) => {
        if (err){
            return next(err);
        }
        if (!report || !_.isEqual(report.ed_user_id, idOwner)) {
            return next(new TypeError('report.insight.id_notfound'));
        }
        req.report = report;
        next();
    });
};
