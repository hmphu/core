'use strict';
//
//  subscription.controller.js
//  handle core system routes
//
//  Created by dientn on 2016-01-05.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    utils = require('../../core/resources/utils'),
    number = require('../../core/resources/number'),
    file = require('../../core/resources/file'),
    datetime = require('../../core/resources/datetime'),
    path = require( "path" ),
    config = require(path.resolve('./config/config')),
    sendmail = require('../../core/resources/sendmail'),
    enums = require('../resources/enums'),
    translation = require('../resources/translation'),
    Plan = mongoose.model('Plan'),
    Coupon = require('../controllers/coupon.controller'),
    TimeZone = mongoose.model('TimeZone'),
    commission = require('../../commission/controllers/commission.controller'),
    PaymentHist =  require('./payment.hist.controller'),
    validate = require('../validator/subscription.validator'),
    onepay = require('../resources/onepay'),
    moment = require( "moment" ),
    swig = require( "swig" ),
    fs = require( "fs" ),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

/**
 * Send payment order info
 *
 * @param options
 * @param callback
 *        callback
 */
function sendMail( options ) {
    var htmlPath = path.join( "modules/subscription/templates", options.locale, options.mailTmpl + ".html" );
    if ( !fs.existsSync( htmlPath ) ) {
        htmlPath = path.join( "modules/subscription/templates", "en", options.mailTmpl + ".html" );
    }
    var tpl = swig.compileFile( htmlPath );
    var data = options.data;
    var optionsSendMail = {
        from : config.mailer.from,
        to : options.mailTo,
        cc : options.mailCC,
        template : htmlPath,
        subject : 'Payment infomation'
    };
    if ( options.data.attachments ) {
        optionsSendMail.attachments = options.data.attachments;
    }
    sendmail(data, optionsSendMail, (err, result)=>{
        if(err){
            console.error(err, "send mail payment infomation");
        }
    });
}

/**
 * Create payment info pdf file
 *
 * @param options
 * @param callback
 */

var createPDFFile = ( options, callback ) =>{
    var userId = utils.getParentUserId( options.user );
    var userMediaFolder = path.join( config.upload.path, userId.toString() );
    var pdfFile = path.join( userMediaFolder, `${options.invoice_id}.pdf` );
    var template_path =  'modules/subscription/templates';
    
    var render_pdf = {
        data: options.data,
        user_id : userId.toString(),
        page_size: "A4",
        file_name: options.invoice_id,
        path_template: path.join( template_path, options.locale, "invoice_tmpl_pdf.html" ),
        pdfFile: pdfFile
    };

    file.createPDFFile(render_pdf, (err, result_pdf) =>{
        if ( err ) {
            return callback( err );
        }
        callback( null, result_pdf );
    });
}

/**
 * Calculate how many day difference from add time
 */
function dayDiffToCurrent ( addTime ) {
    var currentDate = moment().hours( 0 ).minutes( 0 ).seconds( 0 ).milliseconds( 0 );
    var addDate = moment( addTime ).hours( 0 ).minutes( 0 ).seconds( 0 ).milliseconds( 0 );
    var dayDiff = currentDate.diff( addDate, "days" );

    return dayDiff;
}

/**
 * Send payment confirmation
 *
 * @param user
 * @param paymentHistory
 * @param paymentStatus
 * @param options
 */
function sendPaymentConfirmation( user, paymentStatus, options ) {
    var optionPayments = {};
    var locale = user.language;
    if ( paymentStatus.toString() != "0" ) {
        var optionOwner = {
            user : user,
            locale : locale,
            mailTo : [
                user.email
            ],
            mailTmpl : "payment_info_error_mail",
            data : {
                full_url : utils.getFullUrl(user, true),
                returnUrl : options.returnUrl || "",
                paymentStatus : options.paymentStatusString || ""
            }
        };

        var optionAdmin = {
            user : user,
            locale : locale,
            mailTo : [
                config.mailer.admin
            ],
            mailTmpl : "error_payment_mail",
            data : {
                full_url : utils.getFullUrl(user, true),
                returnUrl : options.returnUrl || "",
                paymentStatus : options.paymentStatusString || ""

            }
        };
        sendMail( optionOwner );
        console.log( "Complete send mail payment error for owner" );
        sendMail( optionAdmin );
        console.log( "Complete send mail payment error for admin izi" );
        return;
    }
    
    var paymentHistory = options.paymentHistory || {};
    var coupon = paymentHistory.coupon_id;
    var date_format = datetime.getDatePattern( user.language );
    var time_format = datetime.getTimePattern( user.time_format );
    var add_date = moment(paymentHistory.add_time).utcOffset(user.time_zone.value || 7).format(`${date_format} ${time_format}`);

    var subtotal = paymentHistory.price.subtotal;
    var subtotal_vn = paymentHistory.price.total_vn;
    var total = paymentHistory.price.total;
    var txn_amount = paymentHistory.price.grand_total;
    var order_amount = paymentHistory.price.total_vn;
    var bonus_amount = paymentHistory.price.bonus;
    var coupon_amount = paymentHistory.price.coupon;
    var exchange_rate = paymentHistory.plan.exchange_rate;
    // if ( config.IS_TEST_PAYMENT && paymentHistory.payment_method === "credit" ) {
    // txn_amount = txn_amount/100;
    // }

    // prepear for create pdf file and zend mail
    optionPayments = {
        user : user,
        invoice_id : paymentHistory._id,
        locale : locale,
        mailTo :user.email,
        mailCC : [],
        mailTmpl : "payment_info_mail",
        data : {
            full_url : utils.getFullUrl(user, true),
            plan_name : paymentHistory.plan.name,
//            duration_months : paymentHistory.plan.duration_months,
            agents : paymentHistory.max_agent_no,
            price : number.formatCurrency( paymentHistory.plan.price, locale ),
            billing_cycle : paymentHistory.plan.terms,
            discount : paymentHistory.plan.discount_months || 0,
            subtotal : number.formatCurrency( subtotal, locale ),
            subtotal_vn : number.formatCurrency( subtotal_vn, "vi" ),
            is_promotion : coupon ? "table-row" : "none",
            coupon_amount : number.formatCurrency( coupon_amount, "vi" ),
            is_use_bonus : paymentHistory.price.bonus ? "table-row" : "none",
            bonus_amount : number.formatCurrency( bonus_amount, "vi" ),
            exchange_rate : number.formatCurrency( exchange_rate, "vi" ),
            order_amount : number.formatCurrency( order_amount, "vi" ),
            total_price : number.formatCurrency( txn_amount, "vi" ),
            add_time: add_date
        }
    };

    // create pdf file
    createPDFFile( optionPayments, ( errPDF, pdfFile ) =>{
        if ( errPDF ) {
            return console.error( errPDF );
        }
        
        // attach invoice and send cofirmation email
        optionPayments.data.attachments = [pdfFile];
        optionPayments.data.pdf_url = `${utils.getFullUrl(user, true)}/${pdfFile.path}`;
        sendMail( optionPayments );
        console.log("created pdf file");
    } );
}

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========


/**
 * Process response from OnePay
 */
exports.purchaseResponse =[
    (req, res, next) =>{
        req.query = Object.keys( req.body ).lenth > 0 ? req.body : req.query;
        var idOwner = utils.getParentUserId( req.user );
        req.query.payment_method = req.paymentHist.payment_method;
        var validatePayment = onepay.validatePaymentStatus( idOwner, req.query);
        if( req.paymentHist.payment_status == enums.PaymentStatus.payment_success ){
            return next(new TypeError("subscription.payment_status.paid"));
        }
        req.paymentResult = validatePayment;
        next();
    },
    ( req, res, next ) =>{
        var idOwner = utils.getParentUserId( req.user );
        var paymentHistory= req.paymentHist;
        var query = req.query;

        
        var validatePayment = req.paymentResult;
        
        if( !validatePayment.success ){
            sendPaymentConfirmation( req.user, validatePayment.paymentStatus, {
                returnUrl : req.originalUrl,
                paymentStatusString : validatePayment.vpcMessage
            } );

            return res.json( {
                success: false,
                message: validatePayment.paymentMessage
            } );
        }
        
        // adjust expiration time by comparing payment history add_time and current_time
        // in case this process comes late after payment history
        var dayDiff = dayDiffToCurrent( paymentHistory.add_time );
        var adjustExpiration = moment( paymentHistory.plan.expired_date ).add( dayDiff, "days" ).toISOString();

        var update = { 
            payment_status : validatePayment.paymentStatus,
            transaction : query,
            "plan.expired_date" : adjustExpiration
        };

        paymentHistory = _.assign(paymentHistory, update);
        paymentHistory.save( (errSave) =>{
            if(errSave){
                return next(errSave);
            }
            
            // finally process successful payment
            // if coupon is provided => just decrement coupon number
            if ( paymentHistory.coupon_id ) {
                Coupon.applyPromoCode( paymentHistory.coupon_id, ( err, couponResult ) =>{
                    if ( err ) {
                        console.error( err );
                        return;
                    }
                    console.log("Apply coupon success");
                } );
            }
            
            emitter.emit('evt.purchase.success', idOwner, paymentHistory);
            
            // send payment confirmation
            sendPaymentConfirmation( req.user, validatePayment.paymentStatus, {
                paymentHistory : paymentHistory
            } );
            
            res.json({
                success: validatePayment.success,
                message: validatePayment.paymentMessage
            });
        })
    }
];

/**
 * Process purchase plan
 * @author: dientn
 */
exports.purchase = [
    ( req, res, next) =>{
        if(!req.body.max_agent_no){
            return next(new TypeError('subscription.agent_no_required'));
        }
        var idOwner = utils.getParentUserId( req.user );
        req.body.locale = req.user.language;
        validate.validatePurchase( req.body, req.plan, idOwner, next);
    },
    ( req, res, next) =>{
        var plan  = req.plan;
        
        var userSetting = require('../../user.setting/controllers/user.setting.controller');
        var idOwner = utils.getParentUserId( req.user );
        userSetting.userSettingByOwnerId(idOwner, (err, setting)=>{
            if(req.body.max_agent_no < setting.current_agent_no ){
                return next(new TypeError('subscription.gather_than_current'))
            }
            
            next();
//            Plan.findById(req.user.settings.plan_id, ( err, result)=>{
//                if(err){
//                    return next(err);
//                }
//                if(!result){
//                    return next(new TypeError("subscription.current_plan.notFound"));
//                }
////                if(result.features.max_agent_no > plan.features.max_agent_no){
////                   return next(new TypeError("subscription.current_plan.grather"));
////                }
//                
//            });
        });
    },
    ( req, res, next ) =>{
        
        var plan = req.plan;
        var discount_opt= plan.discount_opt;
        var coupon = plan.coupon;
        
        // body request parameters
        var paymentMethod = req.body.payment_method;
        var currentLocale = req.user.language;
        var idOwner = utils.getParentUserId( req.user );

        // construct return URLs
        var userSubscriptionUrl = `${utils.getFullUrl(req.user, true)}/subscription`;
        var ip = req.header( "x-forwarded-for" ) || req.connection.remoteAddress;

        // get total commision
        var getTotalCommission = new Promise( ( resolve, reject ) =>{
            commission.getTotalCommissionInternal( idOwner, ( err, result ) =>{
                if(err){
                    console.error(err);
                    return resolve( 0 );
                }

                resolve( result );
            } );
        });

        getTotalCommission.then( ( result ) =>{
            var totalCommission = result || 0;
            var subtotal = plan.subtotal,
                total = plan.subtotal,
                total_vn = plan.subtotal_vn,
                grand_total = total_vn;
            var coupon_amount = 0;
            
            if( coupon && coupon.discount_percent){
                coupon_amount = grand_total * coupon.discount_percent / 100;
                grand_total = grand_total * (100 - coupon.discount_percent) / 100;
            }
            
            var bonus = 0;
            if ( totalCommission > 0 ) {
                if ( totalCommission >= grand_total ) {
                    bonus = grand_total;
                    grand_total = 0;
                } else {
                    bonus = Math.round( totalCommission );
                    grand_total = grand_total - totalCommission;
                }
            }
            
            var paymentHistData = {
                setting: req.user.settings,
                plan: plan,
                discount_opt: discount_opt,
                max_agent_no: req.body.max_agent_no,
                coupon: coupon,
                payment_method: paymentMethod,
                locale: currentLocale,
                ref_code : req.body.ref_code,
                price: {
                    subtotal: subtotal,
                    total: total, // subtotal - discount coupon.
                    total_vn: total_vn, // total exchange to VND.
                    grand_total: grand_total,
                    bonus: bonus,
                    coupon: coupon_amount
                }
            };
            if(grand_total == 0){
                paymentHistData.payment_status = "0";
            }
            
            PaymentHist.add(idOwner, paymentHistData, (err, paymentHist)=>{
                if ( err ) {
                    return next( err );
                }

                var vpcMerchTxnRef = paymentHist._id.toString();
                var vpc_ReturnURL = `${userSubscriptionUrl}/purchase-response/${vpcMerchTxnRef}`;
                
                if(grand_total == 0){
                    emitter.emit('evt.purchase.success', idOwner, paymentHist);
            
                    // send payment confirmation
                    sendPaymentConfirmation( req.user, "0", {
                        paymentHistory : paymentHist
                    } );
                    
                    return res.json({
                        status: `subscription.payment_status.${paymentMethod}.payment_success`
                    });
                }

                /* create STRING VALUE params */
                var params = {
                    method: paymentMethod,
                    displayLng: currentLocale,
                    amount: grand_total,
                    callbackUrl: vpc_ReturnURL,
                    ip: ip,
                    paymentHistId : paymentHist._id.toString(),
                    againCallbackUrl: userSubscriptionUrl,
                };

                var vpcURL = onepay.renderPaymentUrl(params);
                res.json({payment_url: vpcURL });
                
            });
        }).catch( (reason) => {
            console.log(JSON.stringify("payment error",reason));
            return next(new TypeError("subscription.atm.payment_failured"));
        });
    }
];


/*
 * authentication cancel account @author: dientn
 */
exports.authCancelAccount = ( req, res, next ) =>{
    var email = (req.body.auth_username || "").trim().toLowerCase();
    var password = req.body.auth_pass;
    var subDomain = req.user.sub_domain || "";
    var locale = req.user.language || "en";
    var idOwner = utils.getParentUserId(req.user);

    console.log(`Cancel user login [email=${email}, sub_domain=${subDomain}]`);

    User.findById(idOwner, (err, user) =>{
        if(err){
            console.error( err );
            return next( new TypeError("common.users.not_found") );
        }
        if(!user){
            return next( new TypeError("common.users.not_found") );
        }
        if(user.email != email || !user.authenticate(password)){
            return next( new TypeError("common.users.username_or_pass_incorrect") );
        }
        
        user.is_suspended = true;
        user.save( (errSave) =>{
            if(err){
                console.error(errSave);
                return next( new TypeError("subscription.cannot_cancel_account") );
            }

            req.logout();
            
            var htmlPath = `modules/subscription/templates/${locale}/cancel_account.html`;
            var dataMail = {
                domain : `${config.izi.protocol}://${subDomain}.${config.izi.domain}`
            };
            
            var optionsSendMail = {
                from : config.mailer.from,
                to : email,
                cc : config.mailer.admin,
                template : htmlPath,
                subject : 'Cancel account'
            };
            
            sendmail( dataMail, optionsSendMail)
            
            // response new url
            res.json({
                success : true
            });
        });

    });
};

//TODO: Remove
exports.testPdf = ( req, res, next ) =>{
    
    var userId = utils.getParentUserId( req.user );
    var locale = req.user.language;
    var htmlPath = `modules/subscription/templates/${locale}/testpdf.html`;
    var userMediaFolder = path.join( config.upload.path, userId.toString() );
    var pdfFile = path.join( userMediaFolder, `test_${Date.now()}.pdf` );
    
    var render_pdf = {
        data: {},
        user_id : userId.toString(),
        file_name: 'test',
        path_template: htmlPath,
        pdfFile: pdfFile
    };
    file.createPDFFile(render_pdf, (err, pdfFile) =>{
        if ( err ) {
            return next( err );
        }
        res.json(pdfFile);
    });
    
};
exports.testSubscription = ( req, res, next )=>{

    var swig = require("swig");
    var locale = req.user.language;
    
    var htmlPath = `modules/subscription/templates/subscription.test.html`;
    var tpl = swig.compileFile(htmlPath);
    var data = {};
    
    var getPlans = new Promise( (resolve, reject) =>{
        var locale = req.user.language || "en";
        //get all planpacking
        var stages = [
            {
                $match:{ is_public : true, locale : locale }
            },
            {
                $project: {
                    is_public: 1,
                    id: "$_id",
                    features: 1,
                    duration: 1,
                    name: 1,
                    price : 1,
                    locale : 1,
                    desc : 1,
                    short_desc : 1,
                    discount_opts: 1
                }
            }
        ];
        Plan.aggregate( stages ).allowDiskUse( true ).exec( ( err, plans)=>{
            if( err ){
                console.log(JSON.stringify(err));
                return reject(err);
            }

            resolve(plans);
        } );
    });
    var tasks = [
        getPlans
    ];
    Promise.all(tasks).then( (results) =>{
        data.plans = results[0];
        if(data.plans.length > 0 ){
            data.discount_opts = data.plans[0].discount_opts;
        }
        var html = tpl(data);
        
        res.send(html);
    }).catch( (reason)=>{
        console.log(JSON.stringify("dadadassad"));
    });
   
}

exports.exchangeData = ( req, res, next )=>{
    if(!req.user){
        return res.json({errors: "you are must be authentication before run api"});
    }
    var plan = req.plan;
    var userSetting = require('../../user.setting/controllers/user.setting.controller');
    var idOwner = utils.getParentUserId( req.user );
    userSetting.userSettingByOwnerId(idOwner, (err, setting)=>{
//        console.log(setting._doc);
//        return res.json(plan.features);
        var update = setting._doc;
        update.features = plan.features;
        update.plan_id = plan._id;
//        return res.json(update);
        if(update.features.channels && update.features.channels.emails){
            update.features.channels.emails.current_no = update.current_max_support;
            update.features.channels.emails.quantity = update.max_support;
        }
        if(update.features.channels && update.features.channels.facebooks){
            update.features.channels.facebooks.current_no = update.current_max_support_fb;
            update.features.channels.facebooks.quantity = update.max_support_fb;
        }
        
        if(update.features.productivity && update.features.productivity.triggers){
            update.features.productivity.triggers.current_no = update.current_trigger_no;
            update.features.productivity.triggers.quantity = update.max_trigger_no;
        }
        if(update.features.productivity && update.features.productivity.automations){
            update.features.productivity.automations.current_no = update.current_auto_no;
            update.features.productivity.automations.quantity = update.max_auto_no;
        }
        if(update.features.productivity && update.features.productivity.slas){
            update.features.productivity.slas.current_no = update.current_sla_no;
            update.features.productivity.slas.quantity = update.max_sla_no;
        }
        
        userSetting.update( idOwner, update, ( err, setting )=>{
            if ( err ) {
                console.error( err );
            }else{
                console.info(`Complete update user setting [Purchase success] user id[${idOwner}]`);
            }
            
            return res.json(setting);
        } );
    });
};