'use strict';
//
//  subscription.controller.js
//  handle core system routes
//
//  Created by dientn on 2016-02-01.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    moment = require('moment'),
    utils = require('../../core/resources/utils'),
    enums = require('../resources/enums'),
    Coupon = mongoose.model('Coupon'),
    validate = require('../validator/coupon.validator');

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========


// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========


/*
 *   apply promo code by coupon id
 *   @author: dientn
 */
exports.applyPromoCode = (couponid, next)=>{
    Coupon.findById(couponid, (err, coupon)=>{
        if(err || !coupon){
            return next(err, null);
        }

        coupon.quantity = coupon.quantity - 1;

        coupon.save( (errSave) =>{
            if(errSave){
                return next(errSave, null);
            }

            return next(null, coupon);
        });
    });
};;

/**
 * Check Coupon invalid
 * @author: dientn
 */
exports.checkPromoCode = [
    ( req, res, next ) =>{
        validate.validateCoupon( req.body, next );
    },
    ( req, res, next ) =>{
        var couponCode = req.body.promocode;
        var terms = req.body.terms;

        // complete check coupon
        var done = ( coupon ) =>{
            var currentDay = moment.utc().valueOf();
            if ( coupon.valid_from != null && coupon.valid_from > currentDay ) {
                return next(new TypeError("subscription.coupon.valid_from.greater_than_now"));
            }
            if ( coupon.valid_to != null && coupon.valid_to < currentDay ) {
                return next(new TypeError("subscription.coupon.valid_from.less_than_now"));
            }
            if ( coupon.quantity == 0 ) {
                return next(new TypeError("subscription.coupon.quantity.zero"));
            }
            if ( coupon.terms < terms ) {
                return next(new TypeError("subscription.coupon.terms.less_than_term"));
            }

            res.json( coupon );
        };
    
        Coupon.find( { code : couponCode }, ( err, result ) =>{
            if ( err ) {
                return next( err );
            }
            
            if(!result || result.length == 0){
                return next( new TypeError("subscription.coupon.notFound") );
            }
            done( result );
        } );
    }
];
