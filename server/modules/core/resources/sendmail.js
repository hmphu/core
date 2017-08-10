'use strict'
//
//  sendmail.js
//  send sys email out
//
//  Created by vupl on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var nodemailer = require('nodemailer'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    swig = require('swig'),
    smtpTransport = nodemailer.createTransport(config.mailer.options);

/**
 * handle callback
 * author vupl
 */
var callback = (err, result, handler) => {
    if(!handler){
        if(err){
            console.error(err);
        }
        return;
    }
    if(err){
        return handler(err,null);
    }
    return handler(null,result);
};

/**
 * handle send mail
 * author vupl
 */
module.exports = (data, options, next) => {
    swig.renderFile(options.template, data, (err, emailHTML) =>{
        if (err) {
            return callback(err, null, next);
        }
        var mailOptions = {
            to: options.to,
            cc: options.cc || [],
            from: options.from,
            subject: options.subject,
            html: emailHTML,
            headers: [{
                key: "Precedence",
                value: 'bulk'
            }]
        };

        if(data.ownerId){
            mailOptions.headers.push({
                key: "Feedback-ID", 
                value: `${data.ownerId}:${data.ownerId}:customer_support:izihelp`
            });
        }
        
        if(options.attachments){
            mailOptions.attachments = options.attachments;
        }
        if(options.messageId){
            mailOptions.messageId = options.messageId;
        }
        if(options.references){
            mailOptions.references = Array.isArray(options.references) ? options.references : [options.references];
        }
        
        smtpTransport.sendMail(mailOptions, (err, result) =>{
            if(err){
                return callback(err, null, next);
            }
            return callback(null, result, next);
        });
    });
};
