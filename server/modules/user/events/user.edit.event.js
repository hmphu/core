'use strict';
//
//  user.setting.event.js
//  handle user.setting events
//
//  Created by khanhpq on 2015-01-04.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    translation = require('../resources/translation'),
    User = mongoose.model('User'),
    path = require('path'),
    fs = require('fs'),
    config = require(path.resolve('./config/config')),
    senderRabbitMq = require(path.resolve("./config/lib/emitters/sender.rabbitmq")),
    sendmail = require('../../core/resources/sendmail'),
    isp = require('../../core/resources/isp'),
    userController = require('../controllers/user.controller'),
    cache = require(path.resolve('./config/lib/redis.cache')),
    utils = require('../../core/resources/utils');

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========


var sendMailChangeSubDomain = ( idOwner, current_domain, new_domain, lang )=>{
    var htmlPath = path.join( "modules/user/templates", lang, "change_subdomain.html" );
    if ( !fs.existsSync( htmlPath ) ) {
        htmlPath = path.join( "modules/user/templates", "en", "change_subdomain.html" );
    }

    var url = `${config.izi.protocal}://${new_domain}.${config.izi.domain}`;
    if(config.izi.port != 80 && config.izi.port != 443){
        url += `:${config.izi.port}`;
    }

    var data = {
        sub_domain: new_domain,
        url: url
    };
    var optionsSendMail = {
        from : config.mailer.from,
        template : htmlPath,
        subject : translation[lang|| "en"].mail.subject.change_subdomain
    };

    userController.userByOwnerIdInternal(idOwner, (err, results)=>{
        if(err){
            console.error(err, `send mail change subdomain[${idOwner}]`);
            return ;
        }

        var ownerUser =  _.find(results, (o) =>{ return _.isEqual(o._id.toString(), idOwner.toString()); });
        var listEmail = _.reduce(results, (result, value, key) =>{
            (!_.isEqual(value._id, idOwner))?  result.push(value.email): null;
            return result;
        }, []);

        if( !ownerUser ){
           console.error(`not found user by owner id[${idOwner}]`);
            return ;
        }

        optionsSendMail.to = ownerUser.email,
        optionsSendMail.cc =  listEmail;
        sendmail(data, optionsSendMail, (errSendMail, result)=>{
            if (errSendMail) {
                console.error(errSendMail, `send mail change submomain failure by owner id[${idOwner}]`);
                return;
            }
        });
    });
};

//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

module.exports = (emitter) => {
    emitter.on('evt.user.edit.edit_mail', (options) => {
        User.findById(options.user_id, (err, user) => {
            if (err) {
                console.error(err, "user.edit.mail.fail");
                return;
            }

            if (!user) {
                console.error("user.not_found");
                return;
            }

            //update email
            user.email = options.email;
            cache.saveAndUpdateCache(utils.getParentUserId(user), user._id, user, (err) => {
            //user.save((err) => {
                if (err) {
                    console.error(err, "user.mail.update_fail");
                    return;
                }

                //send mail
                var data = {
                    display_name: user.name,
                    email: options.email,
                    url: utils.getFullUrl( options.req.user)
                };

                var options_ = {
                    template: `modules/user/templates/${user.language || "en"}/mail_change_email.html`,
                    from: config.mailer.from,
                    to: user.email,
                    subject: translation[user.language || "en"].mail.subject
                };

                sendmail(data, options_, function(err, result){
                    if (err) {
                        console.error(err, "user.mail.send_fail");
                    }
                });

                if(options.is_logout){
                    options.req.logout();
                }
            });
        });
    });

    emitter.on('evt.user.edit.subdomain', (idOwner, current_domain, new_domain, lang) => {
        // change subdomain
        userController.changeSubdomain(idOwner, new_domain, err=>{
            if(err){
                console.log(err, 'failed to change subdomain');
            }
        });

        sendMailChangeSubDomain(idOwner, current_domain, new_domain, lang);

        // changed isp config
        var sub_domain = `${new_domain}.${config.izi.domain}`;
        var src = `support@${sub_domain}`;
        var dest = config.isp.dest_mails;
        var dest_length = dest.length - 1 < 0 ? 0 : dest.length - 1;
        dest = dest[ utils.getRandomInt( 0, dest_length ) ];
        var options = {
            "action": "renew",
            "current_domain" : `${current_domain}.${config.izi.domain}`,
            "mail_domain" : sub_domain,
            "mail_src" : src,
            "mail_dest" : dest
        };
        isp( options, (err, result)=>{
            if(err){
                console.error(err, 'failed to change subdomain in isp config')
            }
            return;
        } );

        var data = {
            izi_account_id : idOwner,
            sub_domain : new_domain
        };
        senderRabbitMq(config.rabbit.sender.exchange.comment, {topic: 'izicore-comment-subdomain', payload: data});
        senderRabbitMq(config.rabbit.sender.exchange.chat, {topic: 'izicore-chat-subdomain', payload: data});
    });
};
