'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    sendmail = require('../../../core/resources/sendmail'),
    translation = require('../../resources/translation'),
    moment = require('moment'),
    crypto = require('crypto');


/**
 * Forgot for reset password (forgot GET)
 */
exports.resetPass = (req, res, next) => {
    var userId = req.params.userId;
    if(!userId){
        // username field must not be blank
        return next(new TypeError('user.id.required'));
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return next(new TypeError('user.id.objectId'));
    }
    
    User.findById(userId, (err, user) =>{
        if(err){
            return next(err);
        }
        if(!user){
            return next(new TypeError('user.id.not_found'));
        }
        User.generateRandomPassphrase().then((new_password) => {
            var t = user.language || "en";
            user.password = new_password;
            user.save((err) =>{
                if(err){
                    return next(err);
                }
                var data = {
                    name: user.name,
                    appName: config.app.title,
                    new_password: new_password
                };
                var options = {
                    template : `modules/user/templates/${t}/reset-password-confirm-email.html`,
                    from : config.mailer.from,
                    to : user.email,
                    subject : translation[t].mail.subject.reset_password,
                    messageId: `izi.${+moment.utc()}-notify@izihelp.com`
                };
                sendmail(data,options);
                res.json({success: true, message:"user.reset_pass_success"});
            });
        }).catch((reason) => {
            return next(reason);
        });
    });
};

/**
 * Forgot for reset password (forgot POST)
 */
exports.forgot = (req, res, next) => {
    // Generate random token
    var gemerateToken = new Promise ((resolve, reject) => {
        crypto.randomBytes(20, (err, buffer) => {
            if(err){
                return reject(err);
            }
            var token = buffer.toString('hex');
            return resolve(token);
        });
    });

    // Lookup user by email
    var findUserByEmail = (token) => {
        return new Promise ((resolve, reject) => {
            if(!req.body.email){
                //TODO username field must not be blank
                return reject(new TypeError('user.user_name.not_be_blank'));
            }
            User.findOne({
                email: req.body.email,
                sub_domain: res.locals.sub_domain,
                is_suspended: false
            },'-salt -password', (err, user) =>{
                if(err){
                    return reject(err);
                }
                if(!user){
                    //TODO no account with that email has been found
                    return reject(new TypeError('user.account.no_account_been_found'));
                }
                if (user.provider !== 'local'){
                    //TODO provider signed up using your provider account
                    return reject(new TypeError('user.provider.using_your_' + user.provider + '_account'));
                }
                user.reset_password_token = token;
                user.reset_password_expires = moment.utc().add(1, 'h'); // 1 hour
                user.save((err) => {
                    if(err){
                        return reject(err);
                    }
                    return resolve({
                        token: token,
                        user: user
                    });
                });
            });
        });
    };

    // If valid email, send reset email using service
    var sendEmailResetPassword = ((token, user) => {
        return new Promise ((resolve, reject) => {
            var t = user.language || "en";
            var data = {
                name: user.name,
                appName: config.app.title,
                url_reset: res.locals.short_url + '/api/auth/reset/' + token,
                url: res.locals.short_url
            };
            var options = {
                template : `modules/user/templates/${t}/reset-password-email.html`,
                from : config.mailer.from,
                to : user.email,
                subject : translation[t].mail.subject.forgot_password,
                messageId: `izi.${+moment.utc()}-notify@izihelp.com`
            };
            sendmail(data,options,(err, result) =>{
                if(err){
                    console.error(err, 'failed to send reset password mail');
                    return reject(new TypeError('email.send.failure_sending_email'));
                }
                //TODO send an email has been sent to the provided email with further instructions
                return resolve({message: 'email.send.further_instructions'});
            });
        });
    });
    gemerateToken.then((dataToken) => {
        return findUserByEmail(dataToken);
    }).then((dataUser) =>{
        return sendEmailResetPassword(dataUser.token, dataUser.user);
    }).then((data) => {
        res.send(data);
    }).catch((reason) => {
        return next(reason);
    });
};

/**
 * Reset password GET from email token
 */
exports.resetPasswordByToken = (req, res, next) =>{
    if(!req.params.token){
        return res.redirect('/#/login?reset=0&msg=user.profile.token_no_blank');
//        return next(new TypeError('user.profile.token_no_blank'));
    }
    User.findOne({
        reset_password_token: req.params.token,
        reset_password_expires: {
            $gt: moment.utc()
        }
    }, (err, user) =>{
        if(err){
            return next(err);
        }
        if(!user){
            return res.redirect('/#/login?reset=0&msg=user.profile.reset_failured');
//            return next(new TypeError('user.reset_password.reset_failed'));
        }
        User.generateRandomPassphrase().then((new_password) => {
            var t = user.language || "en";
            user.password = new_password;
            user.reset_password_expires = undefined;
            user.reset_password_token = undefined;
            user.save((err) =>{
                if(err){
                    return next(err);
                }
                var data = {
                    name: user.name,
                    appName: config.app.title,
                    new_password: new_password
                };
                var options = {
                    template : `modules/user/templates/${t}/reset-password-confirm-email.html`,
                    from : config.mailer.from,
                    to : user.email,
                    subject : translation[t].mail.subject.reset_password,
                    messageId: `izi.${+moment.utc()}-notify@izihelp.com`
                };
                sendmail(data,options);
                res.redirect('/#/login?reset=1&msg=user.profile.reset_successfully');
            });
        }).catch((reason) => {
            return next(reason);
        });
    });
};

/**
 * Change Password
 */
exports.changePassword = (req, res, next) =>{
    // Init Variables
    var reg_password = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[a-z]).{6,50}$/;
    if(!req.body.newPassword){
        return next(new TypeError('validator.user.password_required'));
    }
    if(!reg_password.test(req.body.newPassword)){
        return next(new TypeError('validator.user.password_format'));
    }
    User.findById(req.user.id, (err, user) =>{
        if(err || !user){
            return next(new TypeError('user.profile.user_not_found'));
        }
        if(!user.authenticate(req.body.currentPassword)){
            return next(new TypeError('user.profile.curren_password'));
        }
        if(req.body.newPassword !== req.body.verifyPassword){
            return next(new TypeError('validator.user.confirm_password_match'));
        }
        user.password = req.body.newPassword;

        user.save((err) => {
            if(err){
                return next(err);
            }
            req.login(user, (err) => {
                if(err){
                    return next(new TypeError('common.users.unauthenticated'));
                }
                res.send({message: 'user.profile.change_password_success'});
            });
        });
    });
};

exports.checkPermisionReset = (req, res, next) =>{
    var resetUser = req.profile;

    if(req.user.roles[0] == 'owner'){
        return next();
    }else if(req.user.roles[0] == 'admin' && (resetUser.roles[0] == 'agent' || resetUser.is_requester)){
        return next();
    }else if(req.user.roles[0] == 'agent' && resetUser.roles[0] == 'requester'){
        return next();
    }else{
       return next(new TypeError('common.users.notgranted'));
    }
};
