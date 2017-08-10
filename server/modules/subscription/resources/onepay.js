'use strict';

//
//  onepay.js
//  process onepay payment
//
//  Created by dientn on 2016-01-15.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require("lodash"),
    path = require("path"),
    config = require(path.resolve('./config/config')),
    enums = require('../resources/enums'),
    utils = require('../../core/resources/utils'),
    crypto = require( "crypto" ),
    php = require( "phpjs" );

/**
 * Create signature
 *
 * @param params
 * @returns
 */
function createSHA256Signature ( params, secret ) {
    var stringHashData = "";

    for ( var key in params ) {
        
        if ( ( key !== "vpc_SecureHash" && key !== "vpc_SecureHashType" ) && ( params[ key ] && params[ key ].length > 0 ) && ( key.indexOf( "vpc_" ) === 0 || key.indexOf( "user_" ) === 0 ) ) {
            stringHashData = `${stringHashData}${key}=${params[ key ]}&`;
        }
    }

    // remove trailing & from string
    if ( stringHashData.length > 0 ) {
        stringHashData = stringHashData.slice( 0, -1 );
    }
    var hash = crypto.createHmac( "SHA256", new Buffer( php.pack( "H*", secret ), 'binary')).update( stringHashData ).digest( "hex" );

    return hash.toUpperCase();
}

/**
 * Get Vpc configuration
 *
 * @param paymentMethod
 * @returns {Object}
 */
function getVpcConfig ( paymentMethod ) {
    
    paymentMethod = paymentMethod || "atm";
    var conf = config.payment[paymentMethod];

    return conf;
}


/**
 * render payment url
 *
 * @param options:
 *          - method: ATM or Credit card
 *          - amount : amount payment,
 *          - displayLng : Display language of onepay,
 *          - callbackUrl : url onepay will call when finishing payment,
 *          - ip : ip of payment user
 *          - paymentHistId: the pre-payment history id,
            - againCallbackUrl : url onepay will call when failed
 * 
 */
exports.renderPaymentUrl = ( options ) =>{
    options.method =  options.method || "atm";
    options.displayLng = options.displayLng || "vi"
    var vpcConfig = getVpcConfig(options.method);
    var amount = options.amount * 100;
    
    // for test payment
    // TODO: remove on production
    if ( config.payment.isTest && options.method === "credit" ) {

        console.log( "We must multiply 100 to actual amout when paying by credit card due to development environment" );
        amount = parseInt( amount / 10000 ) * 10000;
    }
    
    var params = {
        Title : "Payment Izhelp",
        vpc_AccessCode : vpcConfig.accessCode,
        vpc_Amount : amount.toString(),
        vpc_Command : 'pay',
        vpc_Locale : options.displayLng === "vi" ? "vn" : options.displayLng,
        vpc_MerchTxnRef : options.paymentHistId,
        vpc_Merchant : vpcConfig.merchantId,
        vpc_OrderInfo : "PaymentIzhelp",
        vpc_ReturnURL : options.callbackUrl,
        vpc_Version : "2",
        vpc_TicketNo : options.ip,
        AgainLink : options.againCallbackUrl
    };
//    console.log(JSON.stringify(params));
    if ( options.method === "atm" ) {
        params.vpc_Currency = "VND";
    }

    var vpcURL = `${vpcConfig.url}?`;

    params = php.ksort( params );// sort params ;

    /* append param to url */
    for ( var key in params ) {
        if ( params[ key ] ) {
            vpcURL = `${vpcURL}${encodeURIComponent( key )}=${encodeURIComponent( params[ key ] )}&`;
        }
    }

    var hash = createSHA256Signature( params, vpcConfig.secret );
    vpcURL = `${vpcURL}vpc_SecureHash=${hash}`;
    return vpcURL;
};

/**
 * check the validity of onepay returned params
 *
 * @param params: onpay returned params
 * 
 */
exports.validatePaymentStatus = (idOwner, params , callback) =>{
    
    var vpcSecureHash = params.vpc_SecureHash || "";
    var vpcResponseCode = params.vpc_TxnResponseCode || "";
    var vpcMerchTxnRef = params.vpc_MerchTxnRef || "";
    var paymentMethod = params.payment_method || "atm";
    var vpcConfig = getVpcConfig( paymentMethod );
    
    var PaymentStatus = paymentMethod === "atm" ? enums.PaymentAtmStatus : enums.PaymentCreditStatus;
    var paymentPendingCode =PaymentStatus.payment_pending;

    var result = {
        paymentHistId: vpcMerchTxnRef,
        params: params,
        paymentStatus : vpcResponseCode,
        success: false
    };

    params = php.ksort( params );
    if ( vpcSecureHash.toUpperCase() !== createSHA256Signature( params, vpcConfig.secret ) ) {

        result.paymentStatus = PaymentStatus.payment_failured;
        result.paymentMessage = `subscription.payment_status.payment_failured`;
        return  result ;
    }

    // check status
    if ( vpcResponseCode !== "0" ) { // payment not success => alert message to user
 
        result.vpcMessage = `payment_status.payment_failured`;
        result.paymentMessage = `subscription.payment_status.payment_failured`;
            
        if(vpcResponseCode != 99){
            var paymentStatusCode= utils.getEnumKeyByValue(PaymentStatus, vpcResponseCode);
            result.vpcMessage = `payment_status.${paymentMethod}.${paymentStatusCode}`;
        }else{
            result.vpcMessage = `subscription.payment_status.${paymentMethod}.user_cancel`;
            result.paymentMessage = `subscription.payment_status.user_cancel`;
        }
        return result ;
    }
    
    result.paymentMessage = `subscription.payment_status.payment_success`;
    result.success = true;

    return result ;
};

