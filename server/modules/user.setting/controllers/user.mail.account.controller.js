'use strict';
//
// user.mail.account.controller.js
// handle user mail account setting routes
//
// Created by dientn on 2015-12-25.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    mongoose = require('mongoose'),
    UserMailAccount = mongoose.model('UserMailAccount'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    path = require('path'),
    validator = require('../validator/user.mail.account.validator'),
    utils = require('../../core/resources/utils'),
    sendmail = require('../../core/resources/sendmail'),
    config = require(path.resolve('./config/config')),
    UserBranding = mongoose.model('UserBranding'),
    moment = require( "moment" ),
    enums = require('../resources/enums'),
    gmail_res = require('../../core/resources/gmail'),
    fs = require("fs");
    


/**
 * Send mail verify
 * 
 * @param options
 * @param callback
 *            callback
 */
var sendMailVerify = ( mailAccount, user ) =>{
    var idOwner = utils.getParentUserId(user);
    UserBranding.findOne({ed_user_id: idOwner}, (err, branding)=>{
        if(err){
            console.error(err);
        }
        
        var htmlPath = `modules/user.setting/templates/${user.language}/verify.html`;
        if ( !fs.existsSync( htmlPath ) ) {
            htmlPath = `modules/user.setting/templates/en/verify.html` ;
        }
        
        var name = mailAccount.name? '('+mailAccount.name+')': '';
        var data = {
            encoding : 'base64',
            url : utils.getFullUrl(user)
        };
        
        let now = +moment.utc();
        var optionsSendMail = {
            from :  `IZIHelp System <${config.mailer.from}>`,
            to : mailAccount.mail,
            template : htmlPath,
            subject : 'Verify email account',
            messageId : `izi.${now}-verify_id+${mailAccount.id}@izihelp.com`,
            references : `izi.${now}-verify_id+${mailAccount.id}@izihelp.com`,
            "In-Reply-To" : `izi.${now}-verify_id+${mailAccount.id}@izihelp.com`
        };

        sendmail(data, optionsSendMail);
    });
    
}
/**
 * add a new mail account
 * 
 * @author : dientn
 */
exports.add = [
    (req, res, next)=>{
        var idOwner = utils.getParentUserId(req.user);
        var quantity = (req.user.settings.features || {channels:{emails: {current_no: 0, quantity: 0}}}).channels.emails.quantity;
        UserMailAccount.count({ed_user_id: idOwner}, (err, counter)=>{
            if(err || counter >= quantity + 1){
                return next(err || new TypeError('validator.user_settings.email.max_support'));
            }
            
            var data = {
                mail: req.body.mail,
                name: req.body.name,
                isNew : true
            };
            if(req.body.account_name){
                data.account_name = req.body.account_name;
            }
            req.body = data;
            validator(req.body , next);
        })  
    },
    (req, res, next)=>{
        UserMailAccount.findOne({mail: req.body.mail},(err, mail_account)=>{
            if(err) 
                return next(err);
            if(mail_account) 
                return next(new TypeError('^validator.user_settings.email.email_exist'));
            next();
        });
    },
    (req, res, next) => {
        var idOwner = utils.getParentUserId(req.user);
        var mailAccount  = new UserMailAccount(req.body);

        mailAccount.ed_user_id = idOwner;
        mailAccount.save((err) => {
            if (err) {
                return next(err);
            }

            sendMailVerify(mailAccount, req.user);
            var current_no = (req.user.settings.features || {channels:{emails: {current_no: 0, quantity: 0}}}).channels.emails.current_no;
            emitter.emit('evt.user.setting.update.max_support', {
                idOwner: idOwner,
                current_max_support: current_no + 1,
                callback: function(err, result){
                    if(err){
                        console.error(err,'validator.user_settings.email.update_max_support_fail');
                        return;
                    }
                    var update = {channels:{emails:{current_no: current_no == 0 ? 0 : (current_no + 1)}}};
                    req.user.settings.features = req.user.settings.features || {};
                    req.user.settings.features = _.assign(req.user.settings.features, update);
                }
            });
            
            res.json(mailAccount); 
        });
    }
];


/**
 * add a new mail account
 * 
 * @author : dientn
 */
exports.addInternal = (idOwner, data, next) => {
    var mailAccount  = new UserMailAccount(data);
    mailAccount.ed_user_id = idOwner;

    mailAccount.save((err) => {
        if (err) {
            return next(err);
        }
        /*
         * emitter.emit('evt.user.setting.update.max_support', { idOwner:
         * idOwner, current_max_support: req.user.settings.current_max_support +
         * 1, callback: function(err, result){
         * req.user.settings.current_max_support =
         * req.user.settings.current_max_support + 1; } });
         */
        
        next(null, mailAccount);
    });
};

/**
 * show all mail account of owner id
 * 
 * @author : dientn
 */
exports.list = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var params = {
        query: {
            ed_user_id : idOwner
        },
        select: '-provider_data.access_token',
        skip: req.query.skip,
        limit: req.query.limit,
        is_count : req.query.is_count == '1'
    };
    
    if(req.query.name){
        params.query.$or = [
            {
                name: new RegExp(decodeURI(req.query.name), "i")
            },{
                mail: new RegExp(decodeURI(req.query.name), "i")
            }
        ];
    }
    if(req.query.provider){
        params.query.provider = req.query.provider;
    }
    utils.findByQuery(UserMailAccount, params).exec((err, mailAccounts) =>{
        if(err){
            return next(err);
        }
        res.json(mailAccounts);
    });
};

/**
 * update mail account
 * 
 * @author : dientn
 */
exports.update = [
    (req, res, next)=>{
        delete req.body.provider;
        delete req.body.provider_data;
        delete req.body.is_default;
        delete req.body.reply_to;
        delete req.body.verified_date;
        delete req.body.is_valid_spf;
        delete req.body.is_verified;
    
        validator(req.body , next);
    },
    (req, res, next) => {
        var mailAccount = req.mailAccount;
        mailAccount.name = req.body.name;
        mailAccount.save((errSave) =>{
            if(errSave){
                return next(errSave);
            }

            res.json(mailAccount);
        });
    }
];

/**
 * remove mail account
 * 
 * @author : dientn
 */
exports.remove = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var mailAccount = req.mailAccount;
    var iziMail = `support@${req.user.sub_domain}.${config.izi.domain}`;

    if(mailAccount.is_default){
        return next(new TypeError("validator.user_settings.email.is_default"));
    }

    if( _.isEqual(iziMail, mailAccount.mail) ){
        return next(new TypeError("validator.user_settings.email.is_izi_mail"));
    }

    new Promise(function(resolve, reject) {
        if(mailAccount.provider == enums.Provider.gmail){
            gmail_res.stop_notification(mailAccount.mail, function(err, result){
                if(err){
                    //return reject({err: 'user_settings.gmail.stop_notification_fail'});
                    //return reject(err);
					console.error(err,`log_err_stop_notification_gmail: ${mailAccount.mail}`);
                }
                emitter.emit('evt.mail.gmail.cache_redis', {
                    key: `gmail_${idOwner}_${mailAccount.mail}`,
                    data: req.mailAccount.provider_data
                });
                resolve();
            });
        }else{
            resolve();
        }
        
    }).then(function(count_active) {
        return new Promise(function(resolve, reject) {
            mailAccount.remove((err)=>{
                if(err){
                    return reject(err);
                }
                var current_no = (req.user.settings.features || {channels:{emails: {current_no: 0, quantity: 0}}}).channels.emails.current_no;
                emitter.emit('evt.user.setting.update.max_support', {
                    idOwner: idOwner,
                    current_max_support: current_no == 0 ? 0 : (current_no - 1),
                    callback: function(err, result){
                        if(err){
                            console.error(err,'validator.user_settins.email.update_max_support_fail');
                            return;
                        }
                        var update = {channels:{emails:{current_no: current_no == 0 ? 0 : (current_no - 1)}}};
                        req.user.settings.features = req.user.settings.features || {};
                        req.user.settings.features = _.assign(req.user.settings.features, update);
                    }
                });

                res.json({success: true,message:"user.mail_account.delete_success"});
            });
        });
    }, function(reason) {
        next(reason);
    });
};

/**
 * make default mail account
 * 
 * @author : dientn
 */
exports.setDefault = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var mailAccount = req.mailAccount;

    if(mailAccount.is_default){
        return next(new TypeError("validator.user_settings.email.is_default"));
    }

    if(!mailAccount.is_verified){
        return next(new TypeError("validator.user_settings.email.not_verified"));
    }

    UserMailAccount.findOneAndUpdate({ed_user_id:idOwner, is_default: true}, {is_default: false}, (errUpdateAll, raw)=>{
        if(errUpdateAll){
            return next(errUpdateAll);
        }
        
        mailAccount.is_default = true;
        mailAccount.save((errSave) =>{
            if(errSave){
                return next(errSave);
            }
            res.json(mailAccount);
        });
    });
};

/**
 * find default mail account
 * 
 * @author : dientn
 */
exports.findDefaultMail = (idOwner, next) =>{
    var query = {
        ed_user_id: idOwner,
        is_default: true
    };
    UserMailAccount.findOne(query, (err, result) =>{
        if(err){
            return next(err);
        }
        return next(null, result);
    })
};

exports.findMail = (query, next) =>{
    UserMailAccount.findOne(query, (err, result) =>{
        if(err){
            return next(err);
        }
        return next(null, result);
    });
};

/**
 * verify email account response
 * 
 * @author : dientn
 */
exports.sendMailVerify = (req, res, next) =>{
    var mailAccount = req.mailAccount;
    if(mailAccount.is_verified){
        return next(new TypeError("validator.user_settings.email.is_verified"));
    }

    sendMailVerify(mailAccount, req.user);
    res.json({success: true,message:"user.mail_account.send_verify_success"});
};

/**
 * Middlewear
 * 
 * @author : dientn
 */
exports.findById = (req, res, next, id) => {
    var idOwner = utils.getParentUserId(req.user);

    if(!mongoose.Types.ObjectId.isValid(id)){
        return next(new TypeError("common.objectId"));
    }

    UserMailAccount.findById(id, (err, mailAccount) => {
        if(err){
            return next(err);
        }

        if(!mailAccount || !_.isEqual(mailAccount.ed_user_id, idOwner)){
            return next(new TypeError("user.mail_account.email_not_found"));
        }

        req.mailAccount = mailAccount;
        next();
    });
};
