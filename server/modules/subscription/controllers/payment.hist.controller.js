'use strict';
//
//  payment.hist.controller.js
//  handle core system routes
//
//  Created by dientn on 2016-01-22.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    utils = require('../../core/resources/utils'),
    path = require( "path" ),
    config = require(path.resolve('./config/config')),
    enums = require('../resources/enums'),
    PaymentHist = mongoose.model("PaymentHist"),
    userSetting = require('../../user.setting/controllers/user.setting.controller'),
    moment = require( "moment" );

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

/**
 * Get extended time if account update plan
 */
var getExtendedTime = ( currentPlan, purchasePlan, isTrial ) =>{
    var expiredDate = moment( currentPlan.plan_expiration );
    var currentDate = moment().hours( expiredDate.hours() )
                            .minutes( expiredDate.minutes() )
                            .seconds( expiredDate.seconds() )
                            .milliseconds( expiredDate.seconds() );

    var days = expiredDate.diff( currentDate, "days" );

    // if extent less than 0
    if ( days <= 0 ) {
        return 0;
    }
    
    if(isTrial){
        return days;
    }
    if ( purchasePlan.plan_id === currentPlan.plan_id ) {
        return days;
    }

    return Math.round( currentPlan.max_agent_no / purchasePlan.max_agent_no * days );
}

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

/*
 * add payment hist by id owner
 */
exports.add = (idOwner, data, next ) =>{
 
    var setting = data.setting,
        payment_status = typeof data.payment_status != "undefined"? data.payment_status : enums.PaymentAtmStatus.payment_pending.toString(),
        plan = data.plan,
        discount_opt= data.discount_opt,
        coupon = data.coupon,
        payment_method = data.payment_method,
        locale = data.locale,
        price = data.price;

    if(!setting){
        return next(new TypeError("Can not found user setting"));
    }
    // prepare for payment history
    var paymentHist = {
        ed_user_id: idOwner,
        payment_status : payment_status,
        payment_method: payment_method,
        plan: {
            id: plan._id,
            name : plan.name.value[locale],
            price : plan.price[locale].value,
            currency: plan.price[locale].currency,
            terms : discount_opt.terms,
            locale: locale,
            features: plan.features,
            discount_opt_id: discount_opt.id,
            discount_months: discount_opt.discount_months,
        },
        max_agent_no : data.max_agent_no,
        price: price
    };


    if( coupon ){
        paymentHist.coupon_id = coupon.id;
    }

    if ( data.ref_code ) {
        paymentHist.ref_code = data.ref_code;
    }

    if( data.locale == "en" ){
        paymentHist.plan.exchange_rate = plan.exchange_rate.sell; 
    }

    // calculate expiration date
    var extendedDays = 0; // trial plan
    var expiredDate = moment( setting.plan_expiration );
    var now = moment();

    var currentPlan = {
        plan_id : setting.plan_id.toString(),
        max_agent_no : setting.max_agent_no,
        max_support : setting.max_support,
        plan_expiration : setting.plan_expiration
    };

    var purchasePlan = {
        plan_id : plan.id,
        max_agent_no : plan.features.max_agent_no,
        max_support : plan.features.max_support,
        plan_expiration : null
    };
    
    extendedDays = getExtendedTime( currentPlan, purchasePlan, setting.is_trial );
    
    paymentHist.plan.expired_date = expiredDate.date( now.date() )
                            .month( now.month() )
                            .year( now.year() )
                            .add( extendedDays, "day" ).add( parseInt( discount_opt.terms, 10 ) + discount_opt.discount_months, "month" ).toISOString();
    
    // add payment history
    var paymentHist = new PaymentHist( paymentHist );

    paymentHist.save(  ( err ) =>{
        if ( err ) {
            return next( err );
        }

        next( null, paymentHist);
    } );
};


/**
 *  Middleware
 */

/*
 * get paymentHist by id
 */
exports.paymentById = ( req, res, next, id ) =>{
    // check the validity of ticket id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new TypeError("subscription.payment_id.objectId"));
    }
    
    var idOwner = utils.getParentUserId( req.user );
    // find payment hist by id
    PaymentHist.findById(id).exec((err, pamentHist) => {
        if (err) {
            return next(err);
        }
        
        if (!pamentHist || !(_.isEqual(idOwner, pamentHist.ed_user_id))) {
            return next(new TypeError('subscription.payment_id.notFound'));
        }
        
        req.paymentHist = pamentHist;
        next();
    });
};

