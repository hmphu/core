'use strict';
//
// user.validator.js
// check the validity of user functions
//
// Created by thanhdh on 2015-07-19.
// Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    enums = require('../resources/enums'),
    moment = require("moment"),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    ExchangeRate = mongoose.model('ExchangeRate'),
    Commission = mongoose.model('Commission'),
    CommissionHist = mongoose.model('CommissionHist'),
    Plan = mongoose.model('Plan'),
    Coupon = mongoose.model('Coupon'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

// TODO:

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========

exports.validatePurchase = ( data, plan, idOwner, next ) => {
    
    /*
     * check is exists plan @author: dientn
     */
    validate.validators.checkCoupon = (value, options, key, attributes) =>{
        if(!value){
            return null;
        }
        return validate.Promise( function( resolve, reject ){
            if( !mongoose.Types.ObjectId.isValid(value) ){
                return resolve( "^validator.subscription.coupon.invalid_coupon_id" );
            }
            Coupon.findById( value, function( err, coupon ){
                if ( err ) {
                    console.error( err );
                }
                if ( err || !coupon ) {
                    return resolve( options.message );
                }

                var currentDay = moment.utc().valueOf();
                if ( coupon.valid_from != null && coupon.valid_from > currentDay ) {
                    return resolve( "^validator.subscription.coupon.future_coupon" );
                }
                if ( coupon.valid_to != null && coupon.valid_to < currentDay ) {
                    return resolve( "^validator.subscription.coupon.expired_coupon" );
                }
                if ( coupon.quantity == 0 ) {
                    return resolve( "^validator.subscription.coupon.zero_quantity" );
                }
                
                plan.coupon = coupon;
                return resolve();
            } );
        } );
    };

    validate.validators.checkDiscount = (value, options, key, attributes) =>{
        if( !value ){
            return null;
        }

        return validate.Promise( function( resolve, reject ){
            var discount_opt = plan.discount_opts.filter((dis)=>{
                return dis.id == value;
            })[0];
            
            if(!discount_opt){
                return resolve( options.message );
            }

            plan["discount_opt"] = discount_opt;
            return resolve();
        } );
    };

    validate.validators.checkRefCode = (value, options, key, attributes) =>{
        if( !value ){
            return null;
        }

        return validate.Promise( function( resolve, reject ){
            Commission.findOne( {
                ref_code : value,
                ed_user_id : {
                    $ne : idOwner
                }
            }, ( err, result ) =>{

                if ( err ) {
                    console.error( err );
                    return resolve( options.message );
                }

                if ( !result ) {
                    return resolve( options.message );
                }

                CommissionHist.findOne( {
                    "buyer.id" : idOwner
                }, ( err, history ) =>{
                    if ( err ) {
                        console.error( err );
                        return resolve( options.message );
                    }

                    if ( history ) {
                        return resolve( "^validator.subscription.subscription.ref_used" );
                    }
                    resolve();
                } );
            } );
        } );
    };
    
    var constraints = {
        discount_opt_id: {
            presence: {
                message: '^validator.subscription.subscription.discount_id_required'
            },
            isObjectId: {
                message: "^validator.subscription.subscription.discount_id_invalid"
            },
            checkDiscount: {
                message: '^validator.subscription.subscription.discount_id_notfound'
            }
        },
        coupon_id: {
            checkCoupon: {
                message: '^validator.subscription.coupon.invalid_coupon_id'
            }
        },
        ref_code: {
            checkRefCode:{
                message: '^validator.subscription.subscription.no_ref_code'
            }
        },
        payment_method: {
            presence: {
                message: "^validator.subscription.subscription.payment_method_required"
            },
            exclusion: {
              within: enums.paymentStatus,
              message: "^validator.subscription.subscription.payment_method_invalid"
            }
        }
    };
    var success = () => {
       
        if ( plan.coupon && plan.discount_opt &&  plan.coupon.terms < plan.discount_opt.terms ) {
            return next( new TypeError("validator.subscription.coupon.coupon_invalid_term"));
        }
        
        var subtotal = plan.price[data.locale].value;
        var terms = plan.discount_opt.terms;
        subtotal = subtotal * terms * data.max_agent_no;
        
        if(data.locale != "en"){
            plan.subtotal = subtotal;
            plan.subtotal_vn = subtotal;
            return next();
        }
        ExchangeRate.findOne( {
            currency : "USD"
        },( err, rate ) =>{
            if( err ){
               return next( err );
            }

            rate = rate || {
                sell : config.defaultExchangeRateUsd
            };
            plan.subtotal = subtotal.toFixed(2);
            plan.subtotal_vn = subtotal.toFixed(2) * rate.sell;
            plan.exchange_rate = rate;
            return next();
        } );
        
    }, error = (errors) => {
        next(errorHandler.validationError(errors));
    };
    
    validate.async( data, constraints).then(success, error);
};

exports.validateCoupon = (data, next) => {
    var constraints = {
        promocode: {
            presence: {
                message: '^validator.subscription.coupon.coupon_required'
            },
        },
        terms: {
            presence: {
                message: '^validator.subscription.coupon.term_required'
            },
            numericality: {
              onlyInteger: true,
              greaterThan: 0,
              notInteger: "^validator.subscription.coupon.term_not_int",
              notGreaterThan: "^validator.subscription.coupon.term_min"
            }
        }
    };
    var success = () => {
        next();
    }, error = (errors) => {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints).then(success, error);
};
