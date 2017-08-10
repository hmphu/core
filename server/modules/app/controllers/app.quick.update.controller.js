'use strict';
//
// app.quick.update.controller.js
// handle apps data
//
// Created by dientn on 2016-09-20.
// Copyright 2016 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash');
var fs = require('fs');
var fs_extra = require('fs-extra');
var swig = require("swig");
var path = require("path");
var moment = require('moment');
var utils = require('../../core/resources/utils');
var file = require('../../core/resources/file');
var config = require(path.resolve('./config/config'));
var http = require("../../core/resources/http");
var mongoose = require('mongoose');
var Ticket = mongoose.model('Ticket');
var validate = require('../validator/app.quick.update.validator');
var enums = require('../resources/enums.res');
var customEnums = require('../../custom.setting/resources/enums.res');
var ticketEnums = require('../../ticket/resources/enums');
var peopleEnums = require('../../people/resources/enums.res');
var ticketController = require('../../ticket/controllers/ticket.controller');


var removeSpecialChars = (str)=> {
    if (!str) {
        return str;
    }

    var specialChars = [
        "&#10;"
    ];

    specialChars.forEach(function (sc) {
        str = str.replace(sc, "");
    });

    return str;
}

exports.listTicket = [
    (req, res, next)=>{
        validate.query_ticket(req.query, next);
    },
    (req, res, next)=>{
        var idOwner = utils.getParentUserId(req.user);
        var query = {
            ed_user_id: mongoose.Types.ObjectId(idOwner),
        };
        var from_date = +moment(Number(req.query.from_date)).startOf('day');
        var to_date = +moment(Number(req.query.to_date)).endOf('day');
        if (req.query.type == "view") {
            var date_query = {};
            
            query.is_delete = { $ne : true};
            
            if(req.query.from_date || req.query.to_date){
                if (req.query.from_date) {
                    date_query.$gte = from_date;
                }
                if (req.query.to_date) {
                    date_query.$lte = to_date;
                }
                
                query[req.query.date_type] = date_query;
            }
            // filter status
            if(req.query.status){
                query.status = req.query.status? Number(req.query.status) : 0;
            }
            if (req.query.requester && mongoose.Types.ObjectId.isValid(req.query.requester)) {
//                var requester = mongoose.Types.ObjectId(req.query.requester);
                query.requester_id =  mongoose.Types.ObjectId(req.query.requester);
            }

            if (req.query.organization == "no-organization") {
                query.organization = null;
            } else if (mongoose.Types.ObjectId.isValid(req.query.organization)) {
                query.organization = mongoose.Types.ObjectId(req.query.organization);
            }

            if (req.query.assignee == "no-agent") {
                query.agent_id = null;
            } else if (mongoose.Types.ObjectId.isValid(req.query.agent)) {
                query.agent_id = mongoose.Types.ObjectId(req.query.agent);
            }
            
            if (req.query.group == "no-group") {
                query.group_id = null;
                query.agent_id = null;
            } else if (mongoose.Types.ObjectId.isValid(req.query.group)) {
                query.group_id = mongoose.Types.ObjectId(req.query.group);
            }
        }
        else if (req.query.type == "overdue"){
            var mdate = moment().utc(),
//                time = mdate.hours() * 60 + mdate.minutes() + req.user.time_zone.value * 60,
                date = +mdate.seconds(0).milliseconds(0).utcOffset(req.user.time_zone.value);
    
            query.status = {
                $lt: ticketEnums.TicketStatus.Solved
            };
            query.deadline = {
                $exists: true,
                $lt: date
            };
        }
        else{
             return res.json([]);
        }
        var stage = [],
            stage15 = {};
        var stage1 = {
            $match: query
        };
        var stage2 ={
            $sort: {
                [req.query.date_type]: 1
            }
        };
        var stage6 = {
            $lookup: {
                "from": config.dbTablePrefix.concat("user"),
                "localField": "requester_id",
                "foreignField": "_id",
                "as": "requester_docs"
            }
        };
        var stage7 = {
            $lookup: {
                "from": config.dbTablePrefix.concat("user"),
                "localField": "agent_id",
                "foreignField": "_id",
                "as": "agent_docs"
            }
        };
        var stage8 = {
            $lookup: {
                "from": config.dbTablePrefix.concat("group"),
                "localField": "group_id",
                "foreignField": "_id",
                "as": "group_docs"
            }
        };
        var stage9 = {
            $lookup: {
                "from": config.dbTablePrefix.concat("organization"),
                "localField": "organization",
                "foreignField": "_id",
                "as": "org_docs"
            }
        };

        var stage10 = {
            $unwind: {
                "path": "$requester_docs",
                "preserveNullAndEmptyArrays": true
            }
        };

        var stage11 = {
            $unwind: {
                "path": "$agent_docs",
                "preserveNullAndEmptyArrays": true
            }
        }

        var stage12 = {
            $unwind: {
                "path": "$group_docs",
                "preserveNullAndEmptyArrays": true
            }
        }
        
        var stage13 = {
            $unwind: {
                "path": "$org_docs",
                "preserveNullAndEmptyArrays": true
            }
        }

        var stage14 = {
            $project: {
                "_id": "$_id",
                "status": "$status",
                "subject": "$subject",
                "requester":{
                    "_id":  "$requester_docs._id",
                    "name":  "$requester_docs.name"
                },
                "agent": {
                    "_id": "$agent_docs._id",
                    "name": "$agent_docs.name"
                },
                "group": {
                    "_id": "$group_docs._id",
                    "name": "$group_docs.name"
                },
                "organization":{
                    "_id": "$org_docs._id",
                    "name": "$org_docs.name"
                },
                "add_time": "$add_time",
            }
        };
        var stage16 = {
            $limit: isNaN(req.query.limit) ? config.paging.limit: Number(req.query.limit)
        };
        if(req.query.skip){
            if(req.query.date_type){
                if(req.query.from_date && req.query.to_date){
                    stage15 = {
                        $match:{
                            [req.query.date_type]: {
                                $gt: Number(req.query.skip),
                                $lte: to_date,
                            }
                        }
                    }
                } else {
                    stage15 = {
                        $match:{
                            [req.query.date_type]: {
                                $gt: Number(req.query.skip)
                            }
                        }
                    }
                }
            }
            else {
                stage15 = {
                    $match: {
                        add_time: {
                            $lt: Number(req.query.skip)
                        }
                    }
                }
            }
            stage = [stage1, stage15, stage2, stage6, stage7, stage8, stage9, stage10, stage11, stage12, stage13, stage14, stage16];
        } else {
            stage = [stage1, stage2, stage6, stage7, stage8, stage9, stage10, stage11, stage12, stage13, stage14, stage16];
        }
    
        Ticket.aggregate(stage).allowDiskUse(true).exec((err, result) =>{
            if(err){
                console.error(err);
                return next(err);
            }
            res.json(result);
        });
    }
];

exports.countTicket = [
    (req, res, next)=>{
        validate.query_ticket(req.query,next);
    },
    (req, res, next)=>{
        var idOwner = utils.getParentUserId(req.user);
        var query = {
            ed_user_id: mongoose.Types.ObjectId(idOwner),
        };
        var from_date = Number(req.query.from_date);
        var to_date = Number(req.query.to_date);
        if (req.query.type == "view") {
            var date_query = {};
            
            query.is_delete = { $ne : true};
            
            if(req.query.status){
                query.status = req.query.status? Number(req.query.status) : 0;
            }
            if(req.query.from_date || req.query.to_date){
                if (req.query.from_date) {
                    date_query.$gte = from_date;
                    
                }
                if (req.query.to_date) {
                    date_query.$lte = to_date;
                }
                
                query[req.query.date_type] = date_query;
            }
            if (req.query.requester && mongoose.Types.ObjectId.isValid(req.query.requester)) {
//                var requester = mongoose.Types.ObjectId(req.query.requester);
                query.requester_id =  mongoose.Types.ObjectId(req.query.requester);
            }

            if (req.query.organization == "no-organization") {
                query.organization = null;
            } else if (mongoose.Types.ObjectId.isValid(req.query.organization)) {
                query.organization = mongoose.Types.ObjectId(req.query.organization);
            }

            if (req.query.assignee == "no-agent") {
                query.agent_id = null;
            } else if (mongoose.Types.ObjectId.isValid(req.query.agent)) {
                query.agent_id = mongoose.Types.ObjectId(req.query.agent);
            }

            if (req.query.group == "no-group") {
                query.group_id = null;
                query.agent_id = null;
            } else if (mongoose.Types.ObjectId.isValid(req.query.group)) {
                query.group_id = mongoose.Types.ObjectId(req.query.group);
            }
        }
        else if (req.query.type == "overdue"){
            var mdate = moment().utc(),
//                time = mdate.hours() * 60 + mdate.minutes() + req.user.time_zone.value * 60,
                date = +mdate.seconds(0).milliseconds(0).utcOffset(req.user.time_zone.value);
    
            query.status = {
                $lt: ticketEnums.TicketStatus.Solved
            };
            query.deadline = {
                $exists: true,
                $lt: date
            };
                        
//            query.$or = [{
//                deadline: {
//                    $lt: date
//                }
//            }, {
//                deadline: date,
//                due_time: {
//                    $lt: time
//                }
//            }];
        }
        else{
             return res.json([]);
        }
        
        var stage = [],
            stage3 = {};
        var stage1 = {
            $match: query
        };
        
        var stage4 = {
            $group: {
                _id: null,
                count: {$sum: 1}
            }
        }
//        if(req.query.skip){
//            if(req.query.date_type){
//                if(req.query.from_date && req.query.to_date){
//                    stage3 = {
//                        $match:{
//                            [req.query.date_type]: {
//                                $gt: Number(req.query.skip),
//                                $lte: Number(req.query.to_date)
//                            }
//                        }
//                    }
//                } else {
//                    stage3 = {
//                        $match:{
//                            [req.query.date_type]: {
//                                $gt: Number(req.query.skip)
//                            }
//                        }
//                    }
//                }
//            }
//            else {
//                stage3 = {
//                    $match: {
//                        add_time: {
//                            $lt: Number(req.query.skip)
//                        }
//                    }
//                }
//            }
//            stage = [stage1, stage3, stage4];
//        } else {
            stage = [stage1, stage4];
//        }
        Ticket.aggregate(stage).exec((err, result) =>{
            if(err){
                console.error(err);
                return next(err);
            }
            res.json(result[0] ? result[0].count : 0);
        });
    }
];

exports.reportTickets = (req, res, next)=> {
    var idOwner = utils.getParentUserId(req.user);
    var custom_settings = req.body.custom_settings || {},
        ticket_type = req.body.ticket_type,
//            month = moment.utc(req.body.month),
        from_date = moment.utc(req.body.month).startOf('month'),
        to_date = moment.utc(req.body.month).endOf('month'),
        date_type = req.body.date_type;
        //only for phone
//        ticket_type = libs.Enums.ContactType.Phone;


        var match = {
            $match: {
                ed_user_id: mongoose.Types.ObjectId(idOwner),
                provider:ticket_type
//                contact_type: ticket_type
            }
        };

        match.$match[date_type] = {
            $gte: +from_date,
            $lte: +to_date
        };
        
        if (Object.keys(custom_settings).length > 0) {
            _.forEach(custom_settings, (field, key)=>{
                if(_.isArray(field.value)){
                    match.$match[`fields.${key}`] = {$in: value};
                }
                else if(field.cs_type == 'switch' && field.value == 0){
                    match.$match[`fields.${key}`] = {$ne: 1};
//                    if(field.value == 0){
//                        match.$match[`field.${key}`] = {$ne: 1};
//                    }else{
//                        match.$match[`field.${key}`] = 1;
//                    }
                }
                else{
                    match.$match[`fields.${key}`] = field.value;
                }
            });
            console.log(match);
//            match.$match.fields = custom_settings;
        }
        var states = [match, {
            $project: {
                dayOfYear: {
                    $dayOfYear:{
                        "$add": [
                            new Date(0),
                            "$" + date_type
                        ]
                    }
                },
                day: {
                    $dayOfMonth: {
                        "$add": [
                            new Date(0),
                            "$" + date_type
                        ]
                    }
                },
                month: {
                    $month: {
                        "$add": [
                            new Date(0),
                            "$" + date_type
                        ]
                    }
                },
                year: {
                    $year: {
                        "$add": [
                            new Date(0),
                            "$" + date_type
                        ]
                    }
                },
                //                ticket_id : "$_id"
            }
        }, {
            $group: {
                _id: "$dayOfYear",
                count: {
                    $sum: 1
                },
                day: {
                    $first: "$day"
                },
                month: {
                    $first: "$month"
                },
                year: {
                    $first: "$year"
                },
                ticket_id: {
                    $first: "$_id"
                }
            }
        },{
            $sort: {
                day: 1
            }
        }];
        function processData(data) {
            var res_data = [];
            for (var i = 0, length = from_date.daysInMonth(); i < length; i++) {
                if(_.findIndex(data, ['day', i+1]) == -1){
                    data.push({
                        day: i+1,
                        month: Number(from_date.format('M')),
                        count:0,
                        day_name: 'N '+(i+1)
                    });
                }
            }
            data.forEach(function (item, index) {
                data[index].day_name ='N '+item.day;
            });
            data = _.orderBy(data, ['day', 'asc']);
            res.json( {
                report: data,
                max: _.orderBy(data, ['count', 'desc']).pop().count,
                date: {
                    year: from_date.year(),
                    month: Number(from_date.format('M')),
                    day_of_month: from_date.daysInMonth()
                }
            });
        }
        Ticket.aggregate(states).exec((err, result)=>{
            if (err) {
                console.log(err);
                return next(err);
            }
            processData(result || []);
        });
    };

exports.replyTickets = [
    (req, res, next)=>{
        var ids = req.body.ids;
        var idOwner = utils.getParentUserId(req.user);
        if(_.isEmpty(ids)){
            return next(new TypeError('quick_update.ids.empty'));
        }
        var query = {
            _id: {$in: ids.map(id=>{return mongoose.Types.ObjectId(id)})}
        };
        
        var errors = [];
        
//        var stream = Ticket.aggregate([{$match: query}]).cursor({batchSize: 1000}).allowDiskUse(true).exec();
        var stream = Ticket.find(query).cursor();
        stream.on('data', row=>{
            if(!row){
                return;
            }
            
            let oldTicket = new Ticket(row);
            let ticket = row;
            let body = {
                ed_user_id:idOwner,
                status: req.body.status,
                comment_time: +moment.utc(),
//                agent: req.body.agent,
                comment:{
                    content: removeSpecialChars(req.body.comment),
                    user_id: req.user._id,
                    is_requester : false,
                    provider : ticketEnums.Provider.web,
                }
            };
            if(req.body.group){
                body.group_id = req.body.group;
            }
            if(req.body.agent){
                body.agent_id = req.body.agent;
            }
//            delete body.ids;
            // Merge existing ticket
            if(utils.isEmpty(ticket.submitter_id)){
                body.submitter_id = req.user._id;
            } else {
                body.submitter_id = ticket.submitter_id;
            }
            ticket = _.assign(ticket, body);
            if(oldTicket.status == ticketEnums.TicketStatus.Suppended){
                ticket.status = ticketEnums.TicketStatus.Open;
            }
            if(oldTicket.status == ticketEnums.TicketStatus.New){
                if(utils.isEmpty(req.body.agent_id)){
                    if(_.indexOf([ticketEnums.TicketStatus.Open, ticketEnums.TicketStatus.Pending], body.status)){
                        ticket.status = body.status;
                    } else {
                        ticket.status = ticketEnums.TicketStatus.Open;
                    }
                }
            }
            if(oldTicket.status != ticketEnums.TicketStatus.Closed){
                console.log(body);
                ticketController.editInternal(body, ticket, oldTicket, req.user, (err, result) =>{
                    if(err){
                        console.log(err);
                        console.error(`update ticket by id[${ticket._id}] error`, error);
                        errors.push(error);
                        return;
                    }
                    console.log(`Update ticket by id[${ticket._id}] success`);
                });
            }
        });
        res.json({success: true});
    }
];

// export ticket to pdf form file
exports.exportForm = [
    (req, res, next)=> {
        var id_tickets = (req.body.id_tickets || []).filter(function(item) {
            return mongoose.Types.ObjectId.isValid(item);
        });
        var type = req.body.type || "single";
        var app_id = req.body.app_id;
        var idOwner = utils.getParentUserId(req.user);
        var ticketStatus = ticketEnums.TicketStatus;
        var stages = [];
        
        // first match
        stages.push({
            $match:{
                _id : {
                    $in : id_tickets.map(id=> {return mongoose.Types.ObjectId(id)})
                },
                is_delete : false,
                status : {
                    $gte : ticketStatus.New,
                    $lte : ticketStatus.Solved,
                }
            }
        });
        
        // lookup
        stages.push({
            $lookup:{
                "from": config.dbTablePrefix.concat("user"),
                "localField": "requester_id",
                "foreignField": "_id",
                "as": "requester_docs"
            }
        });
        stages.push({
            $lookup: {
                "from": config.dbTablePrefix.concat("organization"),
                "localField": "organization",
                "foreignField": "_id",
                "as": "org_docs"
            }
        });
        stages.push({
            $lookup: {
                "from": config.dbTablePrefix.concat("ticket_comment"),
                "localField": "_id",
                "foreignField": "ticket_id",
                "as": "comment_docs"
            }
        });
        stages.push({
            $lookup: {
                "from": config.dbTablePrefix.concat("user_contact"),
                "localField": "requester_id",
                "foreignField": "user_id",
                "as": "contact_docs"
            }
        });
        
        stages.push({
            $unwind: {
                "path": "$org_docs",
                "preserveNullAndEmptyArrays": true
            }
        });
        stages.push({
            $unwind: {
                "path": "$requester_docs",
                "preserveNullAndEmptyArrays": true
            }
        });
        
        stages.push({
            $project: {
                id: "$_id",
                subject: "$subject",
                requester: {
                    id:"$requester_docs._id",
                    display_name: "$requester_docs.name",
                    address:"$requester_docs.provider_data.address",
                },
                fields: "$fields",
                organization:{
                    id: "$org_docs._id",
                    name: "$org_docs.name"
                },
//                contact: "$contact_docs",
//                comment: "$comment_docs",
                contact: {
                    $filter: {
                       input: "$contact_docs",
                       as: "contact",
                       cond: { 
                            $eq: [ "$$contact.type", peopleEnums.UserContactType.phone ],
                            $eq: [ "$$contact.is_primary", true]
                       }
                    }
                },
                comment: {
                    $filter: {
                       input: "$comment_docs",
                       as: "cmt",
                       cond: { $eq: [ "$$cmt.is_first", true ] }
                    }
                }
//                comment: {$slice: ["$comment_docs",1]}
            }
        });
        
        stages.push({
            $unwind: {
                "path": "$comment",
                "preserveNullAndEmptyArrays": true
            }
        });
        stages.push({
            $unwind: {
                "path":"$contact",
                "preserveNullAndEmptyArrays": true
            }
        });
        
        // second match
        stages.push({
            $match:{
                "contact.type": peopleEnums.UserContactType.phone
            }
        });
        
        Ticket.aggregate(stages).exec((err, results)=> {
            if(err){
//                console.log(err);
                console.error(err);
                return next(err);
            }
            var tickets = results.map(function(item) {
                var res = {
                    id : item._id,
                    desc : (item.comment || {}).content || '',
                    subject : item.subject,
                    requester: {
                        display_name : "",
                        address : "",
                        phone : ""
                    },
                    organization : {
                        name : ""
                    }
                };

                if (item.requester) {
                    res.requester = item.requester;
                    if(item.contact){
                        res.requester.phone = item.contact.value;
                    }
                }
                
                if(item.fields){
                    res.ticket_code = item.fields['madonhang'];
                    res.reciever_name = item.fields['nguoinhan'];
                    res.reciever_address = item.fields['dcnhan'];
                    res.reciever_phone = item.fields['dtnhan'];
                    res.code_id = item.fields['sohieu'];
                    res.note = item.fields['note'];
                }
                return res;
            });
            fs_extra.ensureDirSync(`assets/uploads/${idOwner}/quick_update`);
            if (type == "single") {
                var render_pdf = {
                    data: {
                        tickets : tickets,
                        current_date : moment().utcOffset(req.user.time_zone.value).format("DD-MM-YYYY"),
                        current_user_name : req.user.name
                    },
                    user_id : idOwner,
                    page_size: "A4",
                    file_name: `quick_update/${+moment().utc()}`,
                    path_template: `assets/uploads/${idOwner}/apps/${app_id}/templates/export/single/vi/view_export.html`
                };

                file.createPDFFile(render_pdf, (err, result_pdf)=> {
                    if (err || !result_pdf) {
                        return next(err, null);
                    }
                    res.json({url:`/api/files/quick_update/${result_pdf.filename}`});
                });

            } else {
                var tasks = [];
                var zip_folder_name = `${Date.now().toString()}`;
                var path_user = `assets/uploads/${idOwner}`;
                var path_folder_zip = path_user + '/quick_update/' + zip_folder_name;
                fs_extra.ensureDirSync(path_folder_zip);
                
                // loop promise function
                var Promise = require('bluebird');
                var promiseWhile = (condition, action)=> {
                    var resolver = Promise.defer();
                    var loop = ()=> {
                        if (!condition()) return resolver.resolve();
                        return Promise.resolve(action())
                            .then(loop)
                            .catch(resolver.reject);
                    };

                    process.nextTick(loop);

                    return resolver.promise;
                };

                var sum = 0;
                var stop = tickets.length;
                promiseWhile(()=>{
                    return sum < stop;
                },()=>{
                    var item = tickets[sum];
                    return new Promise((resolve, reject)=> {
                        var render_pdf = {
                            data: {
                                ticket : item,
                                current_date : moment().format("DD-MM-YYYY"),
                                current_user_name : req.user.name
                            },
                            user_id : idOwner,
//                            folder_zip : zip_folder_name,
                            page_size: "A4",
                            file_name: `quick_update/${zip_folder_name}/${item.id.toString()}`,
                            path_template: `assets/uploads/${idOwner}/apps/${app_id}/templates/export/multi/vi/view_export.html`
                        };

                        file.createPDFFile(render_pdf, (err, result_pdf)=> {
                            console.log(err);
                            sum++;
                            console.log(result_pdf);
                            resolve();
                        });
                    });
                }).then(result=>{
                    var output = fs.createWriteStream(path_folder_zip + '.zip');
                    var archiver = require('archiver');
                    var archive = archiver('zip');

                    output.on('close', function () {
                        //Response data
                        res.json({url:`/api/files/quick_update/${zip_folder_name}.zip`});

                        //Delelte folder
                        var deleteFolderRecursive = function (path) {
                            if (fs.existsSync(path)) {
                                fs.readdirSync(path).forEach(function (file, index) {
                                    var curPath = path + "/" + file;
                                    if (fs.lstatSync(curPath).isDirectory()) { // recurse
                                        deleteFolderRecursive(curPath);
                                    } else { // delete file
                                        fs.unlinkSync(curPath);
                                    }
                                });
                                fs.rmdirSync(path);
                            }
                        };
                        deleteFolderRecursive(path_folder_zip);
                    });

                    archive.on('error', function (err) {
                        logger.error("error", err);
                        return next(err);
                    });
                    archive.pipe(output);

                    archive.bulk([
                        {
                            expand: true,
                            cwd: path_folder_zip,
                            src: ['**/*']
                        }
                    ]).finalize();
                }).catch(ex=>{
                    console.log(ex);
                });
            }
        });
    }
];
