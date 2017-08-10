var path = require('path');
var nodemailer = require('nodemailer');
var mongoose = require('mongoose');
var htmlParser = require('./html.parser.pool');
var config = require('./config');
var models = require('./models');

var transporter = nodemailer.createTransport(config.mailer.options);

mongoose.set('debug', false);

mongoose.connect(config.db.uri, config.db.options, (err) => {
    if (err) {
        console.error(`Could not connect to MongoDB!.`);
        console.error(err);
        return;
    }
        
    var Ticket = mongoose.model('Ticket');
    var TicketComment = mongoose.model('TicketComment');
    
    var startTime = Date.now();
    console.log(`Running at ${startTime}...`);
    
    var cursor = Ticket.aggregate({
        $match: {
            sys_sync_fixed : null
        }
    }, {
        $limit : 10
    }).allowDiskUse(true).cursor({ batchSize : 1000 }).exec();
    
    var ticketTasks = [];
    
    cursor.each((err, doc) => {
        if (err) { // handle error
            if (ticketTasks.length === 0) {
                console.log(`${ticketTasks.length} tasks finished in ${(Date.now() - startTime)/1000}s. Process exits in 10s...`);
                
                setTimeout(() => {
                    process.exit(0);
                }, 10000);
            }
            
            return;
        }
        
        if (!doc) { // handle close
            Promise.all(ticketTasks).then(results => {
                console.log(`${ticketTasks.length} tasks finished in ${(Date.now() - startTime)/1000}s. Process exits in 10s...`);
                
                setTimeout(() => {
                    process.exit(0);
                }, 10000);
            }).catch(ex => {
                console.log(`${ticketTasks.length} tasks finished in ${(Date.now() - startTime)/1000}s. Process exits in 10s...`);
                
                setTimeout(() => {
                    process.exit(0);
                }, 10000);
            });
            
            return;
        }
        
        // handle ticket
        ticketTasks.push(new Promise((finalResolve, finalReject) => {
            TicketComment.findOne({
                ticket_id : doc._id,
                is_first : true
            }, {
                content : 1
            }, (fErr, commentObj) => {
                if (fErr) {
                    console.error(fErr);
                    return finalResolve();
                }
                
                if (commentObj) {
                    var comment = commentObj.toJSON();
                    
                    htmlParser.getParser((err, parser) => {
                        if (err) {
                            doc.description = (comment.content || '').trim();
                            return;
                        }
                        
                        parser.on('message', (data) => {
                            doc.description = data.trim();
                            doc.sys_sync_fixed = true;
                            
                            Ticket.findOneAndUpdate({ _id : doc._id }, doc, (sErr, sResult) => {
                                if (sErr) {
                                    console.error(sErr);
                                }

                                finalResolve(sResult);
                            });
                        });
                        
                        parser.send(comment.content || '');  // TODO: check performance
                    });
                    
                    return;
                }
                
                doc.sys_sync_fixed_missing_first_comment = true;
                doc.sys_sync_fixed = true;
                
                Ticket.findOneAndUpdate({ _id : doc._id }, doc, (sErr, sResult) => {
                    if (sErr) {
                        console.error(sErr);
                    }

                    finalResolve(sResult);
                });
            });
        }));
    });
});
