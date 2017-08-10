'use strict';
//
//  report event.js
//  filter ticket for report
//
//  Created by khanhpq on 2017-03-01.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    mongoose = require('mongoose'),
    moment = require('moment'),
    config = require(path.resolve('./config/config')),
    utils = require('../../core/resources/utils'),
    filterCondV2 = require('../resources/filter.cond.v2'),
    es = require(path.resolve('./config/lib/elasticsearch')),
    enums_report = require('../../report/resources/enums'),
    translation = require('../resources/translate.res'),
    sanitizeHtml = require('sanitize-html'),
    Report = mongoose.model('Report'),
    //socketIO = require(path.resolve('./config/lib/socket.io')),
    filterUtils = require(path.resolve('./modules/filter/resources/utils.v2')),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq')),
    enumsTicket = require(path.resolve('./modules/ticket/resources/enums')),
    User = mongoose.model('User');

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========

var transferData = function(columns, ticket_data, user, next){
    var ticket = {};
    var lang = translation[user.language || "en"],
        doc = ticket_data._source;

    getTicketComment(ticket_data._id, doc.ed_user_id, (err, ticket_cmt_result) => {
        if(err){
            return next(err);
        }

        var getFieldData = function(index){
            if(index >= columns.length){
                return next(null, ticket);
            }

            var o = columns[index];
            index += 1;
            if(o.is_cs){
                o.key = isNaN(o.key) ? o.key : (" " + o.key);
                
                if(!doc.field || !doc.field[o._id] ){
                    ticket[o.text] = "";
                    return getFieldData(index);
                }
                
                var field = doc.field[o._id].value || "";
                if(Array.isArray(field)){
                    ticket[o.text] = _.join(field, ', ') || "";
                    return getFieldData(index);
                }else{
                    switch(o.cs_type){
                        case "date":
                            ticket[o.text] = field != "" ? convert_time(field, user.time_zone.value, user.language) : "";
                            getFieldData(index);
                            break;
                        case "switch":
                            ticket[o.text] = field == 1 ? "1" : "0";
                            getFieldData(index);
                            break;
                        case "dropdown":
                            ticket[o.text] = doc.field[o._id].text || "";
                            getFieldData(index);
                            break;
                        default:
                            ticket[o.text] = field || "";
                            getFieldData(index);
                            break;
                    }
                }
            }else{
                ticket[o.key] = '';
                switch(o.key){
                    case "_id":
                        ticket._id = ticket_data._id;
                        getFieldData(index);
                        break;
                        
                    case "subject":
                        ticket.subject = doc.subject;
                        getFieldData(index);
                        break;
                        
                    case "status":
                        ticket.status = (lang.status[doc.status] || "");
                        getFieldData(index);
                        break;
                        
                    case "description":
                        if(ticket_cmt_result.hits.hits.length > 0){
                            ticket.description = sanitizeHtml(`<div>${ticket_cmt_result.hits.hits[0]._source.content}</div>`, {
                                allowedTags: [],
                                allowedAttributes: []
                            });
                        }
                        getFieldData(index);
                        break;
                        
                    case "add_time":
                        ticket.add_time = convert_time(doc.add_time, user.time_zone.value, user.language);
                        getFieldData(index);
                        break;
                        
                    case "solved_time":
                        if(doc.stats && doc.stats.last_time_status_solved){
                            ticket.solved_time = convert_time(doc.stats.last_time_status_solved, user.time_zone.value, user.language);
                        }
                        getFieldData(index);
                        break;
                        
                    case "is_agent_last_reply":
                        if(ticket_cmt_result.hits.hits.length > 0){
                            
                            var last_cmt = ticket_cmt_result.hits.hits.slice(-1)[0]._source;
                            ticket.is_agent_last_reply = last_cmt.user_id.is_requester ? "" : "1";
                            
                        }
                        getFieldData(index);
                        break;
                        
                    case "sla":
                        ticket.sla = slaTime(doc);
                        //ticket.sla = convert_time(doc.stats.last_time_sla, user.time_zone.value, user.language);
                        getFieldData(index);
                        break;
                        
                    case "assignee":
                        ticket.assignee = (doc.agent_id && doc.agent_id.name) ? doc.agent_id.name : "";
                        getFieldData(index);
                        break;
                        
                    case "requester":
                        ticket.requester = (doc.requester_id && doc.requester_id.name) ? doc.requester_id.name : "";
                        getFieldData(index);
                        break;
                        
                    case "group":
                        ticket.group = (doc.group_id && doc.group_id.name) ? doc.group_id.name : "";
                        getFieldData(index);
                        break;
                        
                    case "channel":
                        ticket.channel = lang.channel[ticket_data._type] || ticket_data._type;
                        getFieldData(index);
                        break;
                        
                    case "rating":
                        ticket.rating = lang.rating['unoffered'];
                        if(doc.rating && doc.rating.value){
                            ticket.rating = lang.rating[utils.getEnumKeyByValue(enumsTicket.TicketRating, doc.rating.value)];
                        }
                        getFieldData(index);
                        break;
                        
                    case "rate_comment":
                        if(doc.rating && doc.rating.comment){
                            ticket.rate_comment = doc.rating.comment;
                        }
                        getFieldData(index);
                        break;
                        
                    case "first_reply_time":
                        if(ticket_cmt_result.hits.hits.length >= 2){
                            var first_reply = ticket_cmt_result.hits.hits.slice(-1)[0]._source;
                            
                            if(first_reply && first_reply.user_id.is_requester == false){
                                ticket.first_reply_time = convert_time(first_reply.add_time, user.time_zone.value, user.language);
                            }
                        }
                        getFieldData(index);
                        break;
                        
                    case "agent_comment_count":
                        ticket.agent_comment_count = 0;
                        
                        ticket_cmt_result.hits.hits.forEach(cmt => {
                            if(cmt._source.user_id.is_requester === false){
                                ticket.agent_comment_count += 1;
                            }
                        });
                        ticket.agent_comment_count = ticket.agent_comment_count > 0 ? ticket.agent_comment_count : "";
                        getFieldData(index);
                        break;
                        
                    case "agent_comment_name":
                        var tmp = [],
                            agent_arr = [];
                        ticket_cmt_result.hits.hits.forEach(cmt => {
                            if(cmt._source.user_id.is_requester == false){
                                var index_agent = _.findIndex(agent_arr, (agent) => {return agent._id == cmt._source.user_id._id});
                                if(index_agent != -1){
                                    agent_arr[index_agent].count += 1;
                                }else{
                                    agent_arr.push({_id: cmt._source.user_id._id, name: cmt._source.user_id.name, count: 1});
                                }
                            }
                        });
                        
                        agent_arr.forEach(item => { 
                            if(item.count > 1){
                                tmp.push(`${item.name}(${item.count})`);
                            }else{
                                tmp.push(`${item.name}`);
                            }
                        });
                        
                        ticket.agent_comment_name = _.join(tmp, ', ');
                        getFieldData(index);
                        break;
                        
                    case "cc_agents":
                        User.find({
                            _id: {$in: doc.cc_agents}
                        })
                        .select("_id name")
                        .exec((err, result_agents) => {
                            if (err) {
                                return next(err);
                            }
                            ticket.cc_agents = _.join(_.map(result_agents, function(o){return o.name;}), ', ');
                            getFieldData(index);
                        });
                        break;
                    default:
                        getFieldData(index);
                        break;
                }
            }
        };
        getFieldData(0);
    });
}

var convert_time = function (value, time_zone, lang){
    return value != "" ? moment(value).utcOffset(time_zone).format( lang == "vi"? "DD/MM/YYYY H:mm": "MM/DD/YYYY H:mm"): "";
};

var slaTime = function (doc){
    if(doc.sla && doc.sla.deadline && doc.sla.deadline.agent_working_time){
        var tmp = doc.sla.deadline.agent_working_time;
        switch(doc.status){
            case enumsTicket.TicketStatus.Solved:
                tmp -= doc.stats.last_time_status_solved;
                break;
            case enumsTicket.TicketStatus.Pending:
                tmp -= doc.stats.last_time_status_pending;
                break;
            case enumsTicket.TicketStatus.Suspended:
                tmp -= doc.stats.last_time_status_suspended;
                break;
            case enumsTicket.TicketStatus.Closed:
                tmp -= (doc.stats.last_time_status_solved || doc.stats.last_time_status_closed);
                break;
            default:
                tmp -= +moment.utc();
                break;
        }
        tmp = Math.round(tmp/1000);
        return tmp;
    }else{
        return "";
    }
};

var getFilterCondV2 = (user, serier, callback) => {
    filterCondV2(user, serier, (is_break, result_filter) =>{
        /*if(result_filter[1].bool && Array.isArray(result_filter[1].bool.must_not)){
            result_filter[1].bool.must_not.push({
                term: {
                    "_type": "fb-post"
                }
            });
        }*/
        return callback(is_break, result_filter);
    });
};



var getTicketComment = function(ticket_id, idOwner, next){
   var query = {
        index: `cmt-ticket-${idOwner}`,
        body: {
            _source: true,
            query: {
                bool: {
                    filter: [{
                        term: {
                            ticket_id: ticket_id
                        }
                    },{
                        term: {
                            ed_user_id: idOwner
                        }
                    }]
                }
            }
        }
    };

    es.search(query, (err, ticket_cmnt)=>{
        if(err){
            return next(err);
        }
        return next(null, ticket_cmnt);
    });
}

var getOrderBy = function(state){
    switch(state){
        case 1:
            return "add_time";
            break;
        case 2:
            return "stats.last_time_cmt";
            break;
        case 3:
            return "stats.last_time_status_solved";
            break;
        default:
            return "add_time";
            break;
    }
}
/*
 * Remove or update some conditions invalid
*/
var preProcessCond = function(conds){
    var new_cond = [];
    (conds || []).forEach(cond => {
        switch(cond.field_key){
            case "status":
                if(cond.value != '-'){
                    new_cond.push(cond);
                }
                break;
            default:
                new_cond.push(cond);
                break;
        }
    });
    return new_cond;
};

var getRangeTime = function(report, timezone, callback){
    var start = null, end = null, now = +moment.utc(),
        time_zone_value = timezone*60*60*1000;

    if(report.is_fixed_date){
        start = report.from_date || now;
        end = report.to_date || now;
    }else{
        if(report.relative_day === 1){ // 24h
            var start_tmp = moment.utc().add(-24, 'hours').utcOffset(timezone),
                end_tmp = moment.utc().utcOffset(timezone);
            
            start = +moment.utc().add(-24, 'hours');
            end = +moment.utc();
            
            if(start_tmp.hours() < report.report_time_from){
                start = +start_tmp.hours(report.report_time_from).minutes(0).seconds(0).utc();
            }
            
            if(end_tmp.hours() > report.report_time_to){
                end = +end_tmp.hours(report.report_time_to).minutes(59).seconds(59).utc();
            }
        } else {
            start = (+moment.utc().startOf('day').subtract(report.relative_day, 'day')) - time_zone_value;
            end = (+moment.utc().endOf('day').subtract(1, 'day')) - time_zone_value;
        }
    }
//    start = start - start % 1000;
//    end = end - end % 1000;
    return callback({start: start, end: end});
}

/*
    value: utc,
    time_zone_value: number,
    hour_from: number // time of user not utc, 
    hour_to: number // time of user not utc
*/
var getRangeTime24h = function(value, time_zone_value, from_hour, to_hour){
    var tmp_time = moment(value).utcOffset(time_zone_value),
        now = moment().utcOffset(time_zone_value),
        start = null, end = null;

    if(tmp_time.date() < now.date()){//yesterday
        if(tmp_time.hours() > to_hour){ //out of date range
           return {start: -1, end: -1};
        }

        start = moment(value).utcOffset(time_zone_value).hours(now.hours()).minutes(now.minutes()).seconds(now.seconds());
        end = moment(value).utcOffset(time_zone_value).hours(23).minutes(59).seconds(59);
        
        if(start.hours() < from_hour){
            start.hours(from_hour).minutes(0).seconds(0);
        }

        if(end.hours() > to_hour){
            end.hours(to_hour).minutes(59).seconds(59);
        }

    }else{//today
        if(tmp_time.hours() < from_hour){ //out of date range
           return {
               start: -1, 
               end: -1
           };
        }
        
        start = moment(value).utcOffset(time_zone_value).hours(0).minutes(0).seconds(0);
        end = moment(value).utcOffset(time_zone_value).hours(now.hours()).minutes(now.minutes()).seconds(now.seconds());

        if(start.hours() < from_hour){
            start.hours(from_hour).minutes(0).seconds(0);
        }

        if(end.hours() > to_hour){
            end.hours(to_hour).minutes(59).seconds(59);
        }
    }
    return {
        start: +start.utc(), 
        end: +end.utc()
    };
}


var createExportQuery = function(options){
    var payload = {
        idOwner: options.idOwner,
        report_id: options.report_id,
        user_id: options.user_id,
        lang: options.lang,
        now:  options.now,
        time_zone: options.time_zone,
        time_socket: options.time_socket,
        cols: options.columns,
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
                },{
                    bool: {
                        should: options.should_series
                    }
                }]
            }
        }
    };
    
    if(options.query){
        payload.query = options.query;
    }

    rbSender(config.rabbit.sender.exchange.report, {topic: 'izi-report-export-xlsx', payload: payload });
}
/*
 *  COUNT TICKET
*/
var groupByAgent = function(options, next){
    var query = {
        index: `ticket-${options.idOwner}`,
        body: {
            _source: false,
            size: 0, // remove "hits" on results
            query: {
                bool: {
                    filter: options.filter
                    /*must: {
                        script: {
                            script: {
                                lang: "groovy",
                                file: "reportByTime",
                                params: {
                                    timeZone: options.timeZone,
                                    date_field: "add_time",
                                    report_time_from: options.report_time_from,
                                    report_time_to: options.report_time_to   
                                }
                            }
                        }
                    }*/
                }
            },
            aggs: {
                group_by_agent: {
                    terms: {
                        field: "agent_id._id",
                        order: {
                            _count: "desc"
                            //_term": "asc"
                        }
                    },
                    aggs: {
                        tops: {
                            top_hits: {
                                size: 1,
                                _source: {include: ["agent_id.name"]}
                            }
                        }
                    }
                }
            }
        }
    };

    es.search(query, (err, data)=>{
        if(err){
            console.error(err, JSON.stringify(query));
            return next(err);
        }
        if(!Array.isArray(data.aggregations.group_by_agent.buckets) || data.aggregations.group_by_agent.buckets.length == 0){
            data.aggregations.group_by_agent.buckets = [];
            data.aggregations.group_by_agent.buckets.push({
                key: "no_agent",
                doc_count: data.hits.total
            });
        }else{
            var sum = 0;
            data.aggregations.group_by_agent.buckets.forEach(item => {
                sum += item.doc_count;
            });
            data.aggregations.group_by_agent.buckets.push({
                key: "no_agent",
                doc_count: data.hits.total - sum
            });
        }
        return next(null, {total: data.hits.total, results: data.aggregations.group_by_agent.buckets});
    });
}

var groupByDate = function(options, next){
    var query = {
        index: `ticket-${options.idOwner}`,
        body: {
            _source: false,
            size: 0, // remove "hits" on results
            query: {
                bool: {
                    filter: options.filter
                    /*must: {
                        script: {
                            script: {
                                lang: "groovy",
                                file: "reportByTime",
                                params: {
                                    timeZone: options.timeZone,
                                    date_field: "add_time",
                                    report_time_from: options.report_time_from,
                                    report_time_to: options.report_time_to   
                                }
                            }
                        }
                    }*/
                }
            },
            aggs: {
                group_by_date: {
                    date_histogram : {
                        field : options.order_by,
                        interval : "1d",
                        format : options.user.language == 'vi'? 'dd-MM-yyyy': 'MM-dd-yyyy',
                        time_zone: options.timeZone_value,
                        min_doc_count: 0,
                        extended_bounds: {
                            min: options.start,
                            max: options.end
                        }
                    }
                }
            }
        }
    };
    
    es.search(query, (err, data)=>{
        if(err){
            console.error(err, JSON.stringify(query));
            return next(err);
        }
        if(!Array.isArray(data.aggregations.group_by_date.buckets) || data.aggregations.group_by_date.buckets.length == 0){
            //console.error("Not found data es: " + JSON.stringify(query));
            return next(null, null);
        }
        return next(null, {total: data.hits.total, results: data.aggregations.group_by_date.buckets});
    });
}

var groupByTime = function(options, next){
    var type = "minutes",
        step = 5;
    if(options.group_by_time < 60){
        step = options.group_by_time;
    }else if(options.group_by_time > 60 && options.group_by_time < 120){
        step = 30;
    }else{
        type = "hours";
        step = options.group_by_time / 60;
    }
    
    var query = {
        index: `ticket-${options.idOwner}`,
        body: {
            _source: false,
            size: 0, // remove "hits" on results
            query: {
                bool: {
                    filter: options.filter
                    /*must: {
                        script: {
                            script: {
                                lang: "groovy",
                                file: "reportByTime",
                                params: {
                                    timeZone: options.timeZone,
                                    date_field: "add_time",
                                    report_time_from: options.report_time_from,
                                    report_time_to: options.report_time_to   
                                }
                            }
                        }
                    }*/
                }
            },
            aggs: {
                group_by_time: {
                    terms: {
                        order: {
                            _term: "asc"
                        },
                        script: {
                            lang: "groovy",
                            file: "dateConversion",
                            params: {
                                timeZone: options.timeZone,
                                date_field: "add_time",
                                type: type,
                                step: step
                            }
                        },
                        size: type == "minutes" ? 1440 : 24
                    }
                }
            }
        }
    };

    es.search(query, (err, data)=>{
        if(err){
            console.error(err, JSON.stringify(query));
            return next(err);
        }
        var result_buckets = data.aggregations.group_by_time.buckets;
        if(!Array.isArray(result_buckets) || result_buckets == 0){

            var tmp_time = options.report_time_from * 60;

            while(tmp_time <= options.report_time_to * 60){
                var tmp = {
                    from: tmp_time,
                    hour_from: Math.floor(tmp_time / 60),
                    minute_from: tmp_time % 60,
                    to: tmp_time + options.group_by_time - 1
                };

                tmp.hour_to = Math.floor(tmp.to / 60);
                tmp.hour_to = tmp.hour_to < 24 ? tmp.hour_to : 23;

                tmp.minute_to = tmp.to % 60 ;
                tmp.minute_to = tmp.minute_to >= 60 ? 59 : tmp.minute_to;

                tmp_time += options.group_by_time;

                result_buckets.push({
                    key: `${tmp.hour_from}:${tmp.minute_from}`,
                    doc_count: 0
                });
            }
        }

        return next(null, {total: data.hits.total, results: result_buckets});
    });
}

/*
 * Array query date range
 * @params: {
        start: start,
        end: end,
        timeZone_value: timeZone, // int
        from_hour: report.report_time_from, // int 0-23
        to_hour: report.report_time_to // int 0-23,
        order_by: ""
    }
*/
var arrDateRange = function(options){
    var now = +moment.utc(),
        start = moment(options.start).utcOffset(options.timeZone_value),
        end = moment(options.end).utcOffset(options.timeZone_value),
        relative_day = options.relative_day,
        time_day = 24*3600*1000;

    var tmp_start = options.start,
        arr_result = [];
    
    if(options.relative_day === 1){ //24h
        var date_now = getRangeTime24h(options.start, options.timeZone_value, options.from_hour, options.to_hour);
        var date_yesterday = getRangeTime24h(options.end, options.timeZone_value, options.from_hour, options.to_hour);
        
        arr_result = [
            {
                range: {
                    [options.order_by]: {           
                        gte: date_yesterday.start,
                        lte: date_yesterday.end
                    }
                }
            },{
                range: {
                    [options.order_by]: {                         
                        gte: date_now.start,
                        lte: date_now.end
                    }
                }
            }
        ];
    }else{
        while(tmp_start < options.end){
            arr_result.push({
                range: {
                    [options.order_by]: { 
                        gte:moment(tmp_start).utcOffset(options.timeZone_value).hours(options.from_hour).minutes(options.from_minutes || 0).seconds(0).format(), 
                         lte:moment(tmp_start).utcOffset(options.timeZone_value).hours(options.to_hour).minutes(options.to_minutes || 59).seconds(59).format()
                    }
                }
            });
            tmp_start += time_day;
        }
    }
    return arr_result;
}


var getDataSeries = function(options, index, result_report, callback){

    if(index >= options.report.data_series.length){
        return callback(null, result_report);
    }
    
    var serier = options.report.data_series[index],
        timeZone = `${(options.user.time_zone.value >= 0 ? "+" : "-")}${(options.user.time_zone.value < 10 ? "0" : "")}${options.user.time_zone.value}:00`,
        order_by = "",
        aggs = null;

    serier.all_conditions = preProcessCond(serier.all_conditions);

    getFilterCondV2(options.user, serier, (is_break, result_filter) =>{
        if(is_break){
            return callback(null, null);
        }
        
        order_by = getOrderBy(serier.state);

        var ranges = arrDateRange({
            start: options.start,
            end: options.end,
            relative_day: options.report.relative_day,
            timeZone_value: options.user.time_zone.value, // int
            from_hour: options.report.report_time_from,
            to_hour: options.report.report_time_to,
            order_by: order_by
        });
        
        var filter = [].concat(result_filter);
        filter.unshift({
            range: {
                [order_by]: {
                    gte: options.start,
                    lte: options.end
                }
            }
        });
        
        filter.push({
            bool: {
                should: ranges
            }
        });
        
        var data = {
                idOwner: options.report.ed_user_id,
                order_by: order_by,
                timeZone: options.user.time_zone.id,
                timeZone_value: timeZone,
                user: options.user,
                filter: filter,
                start: options.start,
                end: options.end,
                report_time_from: options.report.report_time_from,
                report_time_to: options.report.report_time_to
            },
            group_by_function = null;

        switch(options.report.group_by){
            case enums_report.GroupBy.agent:
                group_by_function = groupByAgent;
                break;
            case enums_report.GroupBy.date:
                group_by_function = groupByDate;
                break;
            case enums_report.GroupBy.time:
                data.group_by_time = options.report.group_by_time;
                group_by_function = groupByTime;
                break;
            default:
                break;
        }

        group_by_function(data, (err, result_series) => {
            if(err){
                return callback(err);
            }
            result_report.push({
                series_id: serier._id,
                series_name: serier.legend,
                results: result_series
            });
            getDataSeries(options, index+=1, result_report, callback);
        });
    });
}

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

exports.getDetail = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user),
        report = req.report,
        now = +moment.utc(),
        start = report.from_date || now,
        end = report.to_date || now;
    
    getRangeTime(report, req.user.time_zone.value, (range) => {
        start = range.start;
        end = range.end;
    });
    
    getDataSeries( {
        idOwner: idOwner,
        report: report,
        user: req.user,
        start: start,
        end: end,
    }, 0, [], (err, results) =>{
        if(err){
            return next(err);
        }

        res.json({
            report_id: report._id,
            results: results
        });
    });
}

exports.getTickets = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user),
        report = req.report,
        now = +moment.utc(),
        start = null,
        end = null,
        from_minutes = 0,
        to_minutes = 59,
        from_hour = report.report_time_from,
        to_hour = report.report_time_to,
        timeZone = req.user.time_zone.value * 60 * 60 * 1000,
        is_export = req.query.export == '1',
        lang = req.user.language,
        columns = [],
        tickets = [];
    
        if(req.query.columns){
            columns = JSON.parse( req.query.columns || '{}');
        }else{
            columns = filterUtils.getColsReport(translation[req.user.language || "en"]);
        }

    var convertTickets = (data, index) => {
        if (!data.hits.hits && data.hits.hits.length == 0) {
            return res.json({tickets: tickets});
        }

        if(index >= data.hits.hits.length){
             return res.json({
                 scroll_id: data._scroll_id,
                 tickets: tickets
             });
        }

        transferData(columns, data.hits.hits[index], req.user, (err, ticket)=> {
            if(err){
                console.error(err, "Fail to transferData");
                return next(err);
            }

            tickets.push(ticket);
            convertTickets(data, index+=1);
        });
    };
    
    if(req.query.scroll_id){
        //Get next page with scroll_id
        es.scroll({
            scrollId: req.query.scroll_id,
            scroll: '5m'
        }, (err, results) => {
            if(err){
                return next(err);
            }
            convertTickets(results, 0);
        });

    }else{
        //Get frist page
        var size = config.paging.limit,
        from = req.params.page * size,
        serier = null;
    
        report.data_series.forEach(item => {
            if(item._id == req.params.serier_id){
                serier = item;
            }
        });
        serier.all_conditions = preProcessCond(serier.all_conditions);

        if(!req.query.is_total){
            if(report.group_by == enums_report.GroupBy.date){
                var m_start = +moment(req.query.date, req.query.format).utcOffset(req.user.time_zone.value).startOf('day').utc(),
                    m_end = +moment(req.query.date, req.query.format).utcOffset(req.user.time_zone.value).endOf('day').utc();

                if(report.relative_day == 1){//24h
                    var tmp_time = +moment(req.query.date, req.query.format).utcOffset(req.user.time_zone.value).utc();
                    var date_24h = getRangeTime24h(tmp_time, req.user.time_zone.value, report.report_time_from, report.report_time_to);

                    m_start = date_24h.start;
                    m_end = date_24h.end;
                }

                report = {
                    is_fixed_date: true,
                    relative_day: report.relative_day,
                    from_date: Number(m_start || report.from_date),
                    to_date: Number(m_end || report.to_date)
                };
            }else if(report.group_by == enums_report.GroupBy.time){
                from_minutes = Number(req.query.from_minutes || 0);
                to_minutes = Number(req.query.to_minutes || 59);
                from_hour = Number(req.query.from_hour || from_hour);
                to_hour = Number(req.query.to_hour || to_hour);
            }
        }

        getRangeTime(report, req.user.time_zone.value, (range) => {
            start = range.start;
            end = range.end;
        });

        if(req.params.page == undefined || req.params.page < 0 || !req.params.serier_id || req.params.serier_id == ''){
            return next("Paging not found data");
        }

        var order_by = getOrderBy(serier.state);

        var ranges = arrDateRange({
            start: start,
            end: end,
            relative_day: report.relative_day,
            timeZone_value: req.user.time_zone.value, // int
            order_by: order_by,
            from_hour: from_hour,
            to_hour: to_hour,
            from_minutes: from_minutes,
            to_minutes: to_minutes
        });

        getFilterCondV2(req.user, serier, (is_break, result_filter) =>{
            if(is_break){
                return next(null, null);
            }

            var filter = [].concat(result_filter),
                options = {
                    idOwner: idOwner,
                    size: size,
                    from: from
                };

            filter.unshift({
                range: {
                    [order_by]: {
                        gte: start,
                        lte: end
                    }
                }
            });

            if(report.group_by == enums_report.GroupBy.agent && req.query.agent_id && !req.query.is_total){
                if(req.query.agent_id != 'no_agent'){
                    filter.push({
                        term: {
                            "agent_id._id": req.query.agent_id
                        }
                    });
                }else{
                    filter.push({
                        bool: {
                            must_not: {
                                exists: {
                                    field: "agent_id._id"
                                }
                            }
                        }
                    });
                }
            }

            filter.push({
                bool: {
                    should: ranges
                }
            });

            options.filter = filter;

            var query_es = {
                index: `ticket-${options.idOwner}`,
                scroll: '5m',
                body: {
                    size : options.size,
                    _source: true,
                    query: {
                        bool: {
                            filter: options.filter
                        }
                    }
                }
            };

            if(is_export){
                createExportQuery({
                    idOwner: idOwner,
                    report_id: req.params.report_filter_id,
                    user_id: req.user._id,
                    lang: lang,
                    now: +moment(),
                    time_zone: req.user.time_zone.value,
                    columns: columns,
                    time_socket: req.query.time_socket,
                    query: query_es.body.query
                });
                res.json({});
            }else{
                es.search(query_es, function getMoreUntilDone(err, response) {
                    if(err){
                        return next(err);
                    }
                    convertTickets(response, 0);
                });
            }
        });
    }
};


exports.getExport = (req, res, next) =>{
    var idOwner = utils.getParentUserId(req.user),
        report = req.report,
        now = +moment.utc(),
        start = Number(req.query.start || NaN),
        end = Number(req.query.end || NaN),
        timeZone = req.user.time_zone.value * 60 * 60 * 1000,
        columns = JSON.parse(req.query.columns);

    if(!columns){
        columns = [{key: '_id'}, {key:'subject'}, {key:'description'}, {key:'status'}, {key:'add_time'}, {key:'solved_time'}, {key:'is_agent_last_reply'}, {key:'sla'}, {key:'assignee'}, {key:'group'}, {key:'requester'}, {key:'channel'}, {key:'rating'}, {key:'rate_comment'}, {key:'first_reply_time'}, {key:'agent_comment_count'}];
    }
    
    getRangeTime(report, req.user.time_zone.value, (range) => {
        start = range.start;
        end = range.end;
    });
    
    var getFilterSeries = function(index, should_series, callback){
        
        if(index >= report.data_series.length){
            return callback(should_series);
        }
        var serier = report.data_series[index];
        serier.all_conditions = preProcessCond(serier.all_conditions);
        
        getFilterCondV2(req.user, serier, (is_break, result_filter) =>{
            if(is_break){
                return next(null, null);
            }
            
            var order_by = getOrderBy(serier.state);
            var ranges = arrDateRange({
                start: start,
                end: end,
                relative_day: report.relative_day,
                timeZone_value: req.user.time_zone.value, // int
                from_hour: report.report_time_from,
                to_hour: report.report_time_to,
                order_by: order_by
            });
            
            var must = [
                { //filter
                    range: {
                        [order_by]: {
                            gte: start,
                            lte: end
                        }
                    }
                },{
                    bool: {
                        should: ranges
                    }
                }
            ];
            
            if(result_filter.slice(2).length != 0){
                must.push({
                    bool: {
                        must: result_filter.slice(2)
                    }
                });
            }
            
            should_series.push({
                bool:{
                    must: must
                }
            });

            getFilterSeries(index+=1, should_series, callback);
        });
    };

    getFilterSeries(0, [], (should_series) => {
        createExportQuery({
            report_id: report._id,
            idOwner: idOwner,
            lang: req.user.language,
            now: +moment(),
            user_id: req.user._id,
            time_zone: req.user.time_zone.value,
            columns: columns,
            time_socket: req.query.time_socket,
            should_series: should_series
        });
    });
    
    res.json({});
}
   

exports.reportFilterById = (req, res, next, id) => {
    // check the validity of report idf
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError('report.id.objectId'));
    }
    var idOwner = utils.getParentUserId(req.user);
    Report.findOne({
        _id: mongoose.Types.ObjectId(id),
        is_active: true,
        ed_user_id: idOwner
    }).exec((err, report) =>{
        if(err){
            return next(err);
        }
        if(!report){
            return next(new TypeError('report.not_found'));
        }
        req.report = report.toObject();
        next();
    });
};
