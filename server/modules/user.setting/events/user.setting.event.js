'use strict';
//
//  user.setting.event.js
//  handle user.setting events
//
//  Created by thanhdh on 2015-01-04.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var userAddress = require('../controllers/user.address.controller'),
    userAgent = require('../controllers/user.agent.controller'),
    userApi = require('../controllers/user.api.controller'),
    userBranding = require('../controllers/user.branding.controller'),
    userCalendar = require('../controllers/user.calendar.controller'),
    userLocal = require('../controllers/user.local.controller'),
    userMailAccount = require('../controllers/user.mail.account.controller'),
    userMail = require('../controllers/user.mail.controller'),
    userTicket = require('../controllers/user.ticket.controller'),
    userSetting = require('../controllers/user.setting.controller'),
    referenceAccount = require('../../commission/controllers/commission.controller'),
    fs = require("fs"),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    moment = require("moment"),
    mongoose = require('mongoose'),
    Plan = mongoose.model("Plan"),
    translate = require('../resources/translate.res'),
    utils = require('../../core/resources/utils'),
    _ = require('lodash'),
    isp = require('../../core/resources/isp');

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========

/*
 * Add user setting
 * @author: dientn
 */
var addUserSetting = (user, body, callback) => {
    var locale = user.language;
    var plan_name = body.plan || config.plan.name;
    
    Plan.findOne({'name.seo_uri': plan_name}, (err, plan)=>{
        if(err){
            return callback(err);
        }
        
        if(!plan){
            return callback(new TypeError("Default plan does not exist"));
        }
        var preSave= (features)=>{
            // channels
            if(features.channels){
                _.forEach(features.channels, (channel, key)=>{
                    if(features.channels[key] && _.isNumber(features.channels[key].current_no)){
                        update.features.channels[key].current_no =  features.channels[key].current_no;
                    }
                });
            }
            
            if(features.channels.emails){
                features.channels.emails.current_no = 0
            }
            if(features.channels.facebooks){
                features.channels.facebooks.current_no = 0
            }
            if(features.productivity.triggers){
                features.productivity.triggers.current_no = config.bizRule.masterTrigger;
            }
            if(features.productivity.automations){
                features.productivity.automations.current_no = config.bizRule.masterAuto;
            }
            if(features.productivity.triggers){
                features.productivity.triggers.current_no = config.bizRule.masterTrigger;
            }
        };
        
        var features = plan.features;
        var data = {
            plan_id: plan._id,
            plan_expiration: moment.utc().add(config.plan.trial || 0, "d" ),
            features: plan.features,
            max_agent_no: 1,
            current_agent_no: 1,
//            current_max_support: 0,
//            current_max_support_fb: 0,
//            current_auto_no: config.bizRule.masterAuto,
//            current_trigger_no: config.bizRule.masterTrigger,
//            max_support: plan.features.max_support,
//            max_support_fb: plan.features.max_support_fb,
//            max_auto_no: plan.features.max_auto || config.bizRule.maxItem,
//            max_trigger_no: plan.features.max_trigger || config.bizRule.maxItem,
//            max_sla_no: plan.features.max_sla || config.bizRule.maxItem
        };
        
        userSetting.add(user._id, data, callback);
    });
};

/*
 * Add user address 
 * @author: dientn
 */
var addAddress = (user, body, callback) =>{
    var data = {
        company_name: body.company_name,
        vat_no: "",
        street: "",
        zip_code: "",
        city: "",
        state: "",
        province: "",
        phone:  `(+${body.code})${body.phone.replace(/^0/g, '')}`,
        country: body.country,
    };
    
    userAddress.add(user._id, data, callback);
};

/*
 * Add user agent setting 
 * @author: dientn
 */
var addAgentSetting = (user, callback) =>{
    var data = {
        signature: ""
    };
    
    userAgent.add(user._id, data, callback);
};

/*
 * Add user api setting 
 * @author: dientn
 */
var addApiSetting= (user, callback) =>{
    var data = {
        access_token: []
    };
    
    userApi.add(user._id, data, callback);
};


/*
 * Add user branding
 * @author: dientn
 */
var addBranding = (user, body, callback) =>{
    var data = {
        account_name: body.company_name || user.sub_domain,
        color: config.defaulColor,
        logo: "",
        favicon: "",
        sub_domain: user.sub_domain,
        keyword_black_list: []
    };
    
    userBranding.add(user._id, data, callback);
};

/*
 * Add user calendar
 * @author: dientn
 */
var addCalendar = (user, callback) =>{
    var data = {
        time_zone: user.time_zone.value,
        business_hours: [
            {
                "day_of_week":1,
                "start_time":"08:00",
                "end_time":"17:00",
                "start_h": 8,
                "start_m": 0,
                "start_second": 28800,
                "end_h": 17,
                "end_m": 0,
                "end_second": 61200
            },
            {
                "day_of_week": 2,
                "start_time":"08:00",
                "end_time":"17:00",
                "start_h": 8,
                "start_m": 0,
                "start_second": 28800,
                "end_h": 17,
                "end_m": 0,
                "end_second": 61200
            },
            {
                "day_of_week": 3,
                "start_time":"00:00",
                "end_time":"00:00",
                "start_h": 0,
                "start_m": 0,
                "start_second": 0,
                "end_h": 23,
                "end_m": 59,
                "end_second": 86340
            },
            {
                "day_of_week": 4,
                "start_time":"00:00",
                "end_time":"00:00",
                "start_h": 0,
                "start_m": 0,
                "start_second": 0,
                "end_h": 23,
                "end_m": 59,
                "end_second": 86340
            },
            {
                "day_of_week": 5,
                "start_time":"00:00",
                "end_time":"00:00",
                "start_h": 0,
                "start_m": 0,
                "start_second": 0,
                "end_h": 23,
                "end_m": 59,
                "end_second": 86340
            },
            {
                "day_of_week": 6,
                "start_time":"00:00",
                "end_time":"00:00",
                "start_h": 0,
                "start_m": 0,
                "start_second": 0,
                "end_h": 23,
                "end_m": 59,
                "end_second": 86340
            }
        ],
        holidays: []
    };
    userCalendar.add(user._id, data, callback);
};

/*
 * Add user localization
 * @author: dientn
 */
var addLocalization = (user, body, callback) =>{
    body.time_zone = user.time_zone;
    userLocal.add(user._id, body, callback);
};

/*
 * Add user mail setting
 * @author: dientn
 */
var addMailSetting = (user, callback) =>{
    var data = {
        mail: {
            html: '',
            text: '',
            is_using_html: true,
            delimiter: '{{dc.mail_delimiter}}'
        }
    };
    var html_tpl = new Promise((resolve, reject) =>{
            readMailTemplateContent( "html", (err, html) =>{
                if(err){
                    console.error(err);
                    html = "";
                }
                resolve(html);
            });
        }),
        text_tpl = new Promise((resolve, reject) =>{
            readMailTemplateContent( "txt", (err, text) =>{
                if(err){
                    console.error(err);
                    text = "";
                }
                resolve(text);
            });
        });
    Promise.all([html_tpl,text_tpl]).then((values) =>{
        data.mail.html = values[0];
        data.mail.text = values[1];
        
        userMail.add(user._id, data, callback);
    });
};

/*
 * Add user mail account
 * @author: dientn
 */
var addMailAccount = (user, callback) =>{
    var data = {
        name: user.sub_domain,
        mail: `support@${user.sub_domain}.${config.izi.domain}`,
        is_verified: true,
        is_default: true,
        verified_date: moment.utc(),
        is_valid_spf: true
    };
    userMailAccount.addInternal(user._id, data, callback);
};

/*
 * Add user ticket setting
 * @author: dientn
 */
var addTicketSetting = (user, callback) =>{
    var t = translate[user.language] || translate.en;
    var data = {
        ccs_black_list: [],
        ccs_email_subject: t.mail.ccs.subject,
        ccs_email_text: t.mail.ccs.txt_content,
        suspended_email_list: [],
        suspended_notif_email_list: []
    };
    
    userTicket.add(user._id, data, callback);
};


var addContact = (user, body, emitter)=>{
    var emailContact = {
        idOwner: user._id,
        user_id: user._id,
        is_primary: true,
        email: user.email
    };
   
    emitter.emit('evt.user.contact.add_contact_user', emailContact, function(err, result){
        if(err){
            console.error(err, "save contact user fail");
        }
    });
};
/*
 * get mail template (text or html)
 * @author: dientn
 * param type: - txt
 *              - html
 */
var readMailTemplateContent =  ( type, next ) =>{
    var template_fileName = `modules/user.setting/templates/mail/mail_template_default.${type}`;
    fs.readFile( template_fileName, "utf8", next );
};


//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========
module.exports = (emitter) => {
    emitter.on('evt.user.signup', (user, body) => {
        var idOwner = utils.getParentUserId(user);
        
        addContact(user, body, emitter);
        
        var tasks = [
            // add user setting
            new Promise((resolve, reject) =>{
                addUserSetting(user, body, (err, result)=>{
                    if(err){
                        console.error(err, "user.setting.error");
                    }
                    resolve();
                });
            }),
            // add user address
            new Promise((resolve, reject) =>{
                addAddress(user, body, (err, result)=>{
                    if(err){
                        console.error(err, "user.address.error");
                    }
                    resolve();
                });
            }),
            // add user agent setting
            new Promise((resolve, reject) =>{
                addAgentSetting(user, (err, result)=>{
                    if(err){
                        console.error(err, "user.agent.error");
                    }
                    resolve();
                });
            }),
            // addd user api setting
            new Promise((resolve, reject) =>{
                addApiSetting(user, (err, result) =>{
                    if(err){
                        console.error(err, "user.api.error");
                    }
                    resolve();
                });
            }),
            // add user branding
            new Promise((resolve, reject) =>{
                addBranding(user, body, (err, result) =>{
                    if(err){
                        console.error(err, "user.branding.error");
                    }
                    resolve();
                });
            }),
            // add user calendar
            new Promise((resolve, reject) =>{
                addCalendar(user, (err, result) =>{
                    if(err){
                        console.error(err, "user.calendar.error");
                    }
                    resolve();
                });
            }),
            // add user localization
            new Promise((resolve, reject) =>{
                addLocalization(user, body, (err, result) =>{
                    if(err){
                        console.error(err, "user.local.error");
                    }
                    resolve();
                });
            }),
            // add user mail account
            new Promise((resolve, reject) =>{
                addMailAccount(user, (err, result) =>{
                    if(err){
                        console.error(err, "user.mail.account.error");
                    }
                    resolve();
                });
            }),
            // add user mail
            new Promise((resolve, reject) =>{
                addMailSetting(user, (err, result) =>{
                    if(err){
                        console.error(err, "user.mail.error");
                    }
                    resolve();
                });
            }),
            // add user ticket setting
            new Promise((resolve, reject) =>{
                addTicketSetting(user, (err, result) =>{
                    if(err){
                        console.error(err, "user.ticket.error");
                    }
                    resolve();
                });
            }),
           // add user upload folder
            new Promise((resolve, reject) =>{
                var userPath = `${config.upload.path}${user._id}`;
                var userVoipPath = `${userPath}/voip`;
                var userAppPath = `${userPath}/apps`;
                if (!fs.existsSync(userPath)) {
                    fs.mkdirSync(userPath);
                    fs.mkdirSync(userVoipPath);
                    fs.mkdirSync(userAppPath);
                }
                resolve();
            })
        ];
        Promise.all(tasks).then((value) =>{
            emitter.emit('evt.group.add_group', user);
            // add default support email for this account
            var sub_domain = `${user.sub_domain}.${config.izi.domain}`;
            var src = `support@${sub_domain}`;
            var dest = config.isp.dest_mails;
            var dest_length = dest.length - 1 < 0 ? 0: dest.length - 1;
            dest = dest[ utils.getRandomInt( 0, dest_length ) ];

            var options = {
                "action": "new",
                "mail_domain": sub_domain,
                "mail_src": src,
                "mail_dest": dest
            };
            isp( options, (err, result) => {
                if(err){
                    console.error(err, "added ispconfigmail failed");
                }
                return;
            });
        }, (errors) => {
            console.error(JSON.stringify(errors));
            console.error(new TypeError("Add user settings failed"), "Register new account");
            return;
        });
    });
    
    // event purchase success
    emitter.on('evt.purchase.success', (idOwner , paymentHist ) => {
        var preEdit = (data, update)=>{
            var features = data.features || {};
            // channels
            if(features.channels){
                _.forEach(update.features.channels, (channel, key)=>{
                    if(features.channels[key] && _.isNumber(features.channels[key].current_no)){
                        update.features.channels[key].current_no =  features.channels[key].current_no;
                    }
                });
            }
            
            // productivity
            if(features.productivity){
                 _.forEach(update.features.productivity, (channel, key)=>{
                    if(features.productivity[key] && _.isNumber(features.productivity[key].current_no)){
                        update.features.productivity[key].current_no =  features.productivity[key].current_no;
                    }
                });
            }
           
            // reports
            if(features.reports){
                _.forEach(update.features.reports, (channel, key)=>{
                    if(features.reports[key] && _.isNumber(features.reports[key].current_no)){
                        update.features.reports[key].current_no =  features.reports[key].current_no;
                    }
                });
            }
            
            return;
        };
        // update user plan
        var update = {
            plan_id : paymentHist.plan.id,
            features: paymentHist.plan.features,
            max_agent_no : paymentHist.max_agent_no,
            plan_expiration : paymentHist.plan.expired_date,
            is_trial : false
        };
        
        userSetting.userSettingByOwnerId(idOwner, (err, setting)=>{
            if(!setting.is_trial){
                preEdit(setting, update);
            }
            userSetting.update( idOwner, update, ( err, setting )=>{
                if ( err ) {
                    console.error( err );
                }else{
                    console.info(`Complete update user setting [Purchase success] user id[${idOwner}]`);
                }
            } );
        });
        
    });
};
