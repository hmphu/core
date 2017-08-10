'use strict';
/**
 * Module dependencies.
 */
var _               = require('lodash'),
    path            = require('path'),
    config          = require(path.resolve('./config/config')),
    utils           = require('../../core/resources/utils'),
    moment           = require("moment"),
    socketIO        = require(path.resolve('./config/lib/socket.io')),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq'));

exports.ticket_bulk_import = function (req, res, next) {
    // no file chosen
    if (!req.file) {
        return next(new TypeError('common.upload_file.no_file'));
    }
    // wrong format
    var fs = require("fs");
    var extension = req.file.extension;
    var validate = require("validate.js");
    var csv = require("fast-csv");
    var filePath = req.file.path;
    
    var idOwner = utils.getParentUserId(req.user);
    var tasks = [];
    
    var process_csv_stream = (is_excel, data, end_sheet) =>{
        var count = 0;
        return new Promise((resolve, reject)=>{
            var csv_stream;

            if (is_excel) {
                csv_stream = csv.fromString(data, {
                    headers : true,
                    ignoreEmpty : true,
                    discardUnmappedColumns : true
                });
            } else {
                csv_stream = data;
            }

            csv_stream.on("data", function (data) {
                console.log("read row ", ++count);
                if (!data || !data.subject || data.subject == '' || !data.description || data.description == '') {
                    var failed = JSON.stringify({data: data, index: count});
                    socketIO.emit( '/core', 'agent-'+req.user._id, {
                        topic : 'izi-core-client-import-ticket',
                        payload : {
                            success: false,
                            failed: 'error : '+failed
                        }
                    });
                    return;
                }

                if (data.email && validate({
                    email : data.email
                }, {
                    email : {
                        email : true
                    }
                }) !== undefined) {
                    var failed = JSON.stringify({data: data, index: count});
                    socketIO.emit( '/core', 'agent-'+req.user._id, {
                        topic : 'izi-core-client-import-ticket',
                        payload : {
                            success: false,
                            failed: 'error : '+failed
                        }
                    });
                    return;
                }
                var index = count;
                rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-core-import-ticket', payload: {
                    data: data,
                    user: req.user,
                    index: index
                }});
                
            }).on("end", function () {
                console.log("end reading import file.");
                if(!is_excel){
                    rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-core-import-ticket', payload: {
                        user: req.user,
                        is_end: true
                    }});
                }else if(end_sheet){
                    rbSender(config.rabbit.sender.exchange.batch, {topic: 'izi-core-import-ticket', payload: {
                        user: req.user,
                        is_end: true
                    }});
                }
            });
        });
    };
    // in case of exce file
    if (extension === "xlsx" || extension === "xls") {
        var XLSX = require("xlsx");

        var workbook = XLSX.readFile(filePath);
        workbook.SheetNames.forEach((sheetName, index)=> {
            var sheetData = workbook.Sheets[sheetName];

            // if number, do not use formatted value
            for ( var i in sheetData) {
                if (sheetData[i].t === "n") {
                    sheetData[i].w = sheetData[i].v;
                }
            }

            var data = XLSX.utils.sheet_to_csv(sheetData);
            var is_end = index == workbook.SheetNames.length - 1;
            process_csv_stream(true, data, is_end);
        });
        fs.unlink(filePath, ()=>{});
    } else {
        // in case of csv file
        var stream = fs.createReadStream(filePath);
        stream.on('close', function (err) {
           fs.unlink(filePath,()=>{});
        });
        var csv_stream = csv.fromStream(stream, {
            headers : true,
            ignoreEmpty : true,
            discardUnmappedColumns : true
        });
        process_csv_stream(false, csv_stream);
    }
    res.json({
        is_progress: true
    });
    res.connection.setTimeout(0);
};
