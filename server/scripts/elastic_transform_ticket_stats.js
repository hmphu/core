var path = require('path');
var nodemailer = require('nodemailer');
var mongoose = require('mongoose');
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
        
    var TicketStats = mongoose.model('TicketStats');
    var TicketComment = mongoose.model('TicketComment');
    var User = mongoose.model('User');
    
    var globalAgentList = {};
    
    var startTime = Date.now();
    console.log(`Running at ${startTime}...`);
    
    var cursor = TicketStats.aggregate({
        $match: {
            sys_sync_fixed : null
        }
    }/*, {
        $limit : 10
    }*/).allowDiskUse(true).cursor({ batchSize : 1000 }).exec();
    
    var statsTasks = [];
    
    cursor.each((err, doc) => {
        if (err) { // handle error
            if (statsTasks.length === 0) {
                console.log(`${statsTasks.length} tasks finished in ${(Date.now() - startTime)/1000}s. Process exits in 10s...`);
                
                setTimeout(() => {
                    process.exit(0);
                }, 10000);
            }
            
            return;
        }
        
        if (!doc) { // handle close
            Promise.all(statsTasks).then(results => {
                console.log(`${statsTasks.length} tasks finished in ${(Date.now() - startTime)/1000}s. Process exits in 10s...`);
                
                setTimeout(() => {
                    process.exit(0);
                }, 10000);
            }).catch(ex => {
                console.log(`${statsTasks.length} tasks finished in ${(Date.now() - startTime)/1000}s. Process exits in 10s...`);
                
                setTimeout(() => {
                    process.exit(0);
                }, 10000);
            });
            
            return;
        }
        
        // handle ticket stats
        statsTasks.push(new Promise((finalResolve, finalReject) => {
            var cmtTasks = [];
            
            var stream = TicketComment.find({
                ticket_id : doc.ticket_id
            }, {
                user_id : 1,
                is_requester : 1
            }).cursor();
            
            stream.on('data', (commentObj) => {
                // handle comment
                var comment = commentObj.toJSON();
                
                cmtTasks.push(new Promise((resolve, reject)=> {
                    // do something with the mongoose document
                    if (comment.is_requester) {
                        return resolve(); // not interested in requester
                    }
                    
                    if (!comment.user_id) {
                        return resolve(); // invalid user_id
                    }
                    
                    // look up agent from temporary memory
                    var agent = globalAgentList[comment.user_id];
                    
                    if (agent) {
                        return resolve({ user_id : comment.user_id, agent : JSON.parse(JSON.stringify(agent)) });
                    }
                    
                    // look up agent from database
                    User.findOne({ _id : comment.user_id }, { _id : 1, name : 1 }, (fErr, fAgent) => {
                        if (fAgent) {
                            globalAgentList[comment.user_id] = fAgent.toJSON();
                        }
                        
                        resolve({ user_id : comment.user_id,  agent : fAgent ? fAgent.toJSON() : null });
                    });
                }));
            }).on('error', (error) => {
                console.error(error);
                
                if (cmtTasks.length === 0) {
                    finalResolve();
                }
            }).on('end', () => {
                var agentList = {};
                var missingAgentList = {};
                
                Promise.all(cmtTasks).then(results => {
//                    console.log(`${cmtTasks.length} cmtTasks finished.`);
                    results.forEach((result) => {
                        if (!result) {
                            return;
                        }
                        
                        if (result.agent) {
                            var existingAgent = agentList[result.user_id];
                            
                            if (existingAgent) {
                                existingAgent = existingAgent.counter = existingAgent.counter + 1;
                            } else {
                                result.agent.counter = 1;
                                agentList[result.user_id] = result.agent;
                            }
                        } else {
                            missingAgentList[result.user_id] = result.user_id;
                        }
                    });
                    
                    var agentIds = Object.keys(agentList).map((agentId) => {
                        return agentList[agentId];
                    });
                   
                    if (Object.keys(missingAgentList).length > 0) {
                        var missingAgentIds = Object.keys(missingAgentList).map((missingAgentId) => {
                            return missingAgentList[missingAgentId];
                        });
                        
                        doc.sys_sync_fixed_missing_agent_ids = missingAgentIds;
                    }
                    
                    doc.sys_sync_fixed = true;
                    doc.agent_cmt_ids = agentIds;
                    
                    TicketStats.findOneAndUpdate({ _id : doc._id }, doc, (sErr, sResult) => {
                        if (sErr) {
                            console.error(sErr);
                        }

                        finalResolve(sResult);
                    });
                }).catch(ex => {
                    console.error(ex);
                    finalResolve();
                });
            });
        }));
    });
});
