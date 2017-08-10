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
var commission = require('../controllers/commission.controller'),
    commissionHist = require('../controllers/commission.hist.controller'),
    fs = require("fs"),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    moment = require("moment"),
    utils = require('../../core/resources/utils');

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========


//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========
    
module.exports = (emitter) => {
    emitter.on('evt.user.signup', (user, body) => {
        var idOwner = utils.getParentUserId(user);
        commission.addRefCode( idOwner, (err, result) =>{
            if(err){
                console.error( err );
            }
            console.log("Signup proccess: add reference code success!");
        });
    });

    emitter.on('evt.purchase.success', (idOwner, paymentHist ) => {
        // add reference code and commission to history
        
        if(paymentHist.price.bonus > 0){
            commission.updateTotalCommission(idOwner, -1 * paymentHist.price.bonus, (err, result)=>{
                if(err){
                    console.error(err);
                }else{
                    console.log( "Payment proccess : Complete update  total commission current owner" );
                }
            });
        }
        
        if(!paymentHist.ref_code){
            return;
        }
        commission.getRefCode(idOwner, paymentHist.ref_code, (err, result)=>{
            if(err || !result){
                console.error(err || new TypeError("can not found ref code"));
                return;
            }
            
            var comHistData = {
                ref_code : paymentHist.ref_code,
                total_order : paymentHist.price.total_vn ,
                buyer : idOwner,
                payment_hist_id: paymentHist.id
            };
            
            commissionHist.addReferenceHistory( idOwner, comHistData, ( errAdd, result ) =>{
                if ( errAdd ) {
                    console.error( JSON.stringify(err) );
                    return;
                }
                
                console.log( "Payment proccess : Complete add reference history" );
            });
            
            // update commission total
            result.total_commission =  result.total_commission + (paymentHist.price.total_vn *result.discount /100) ;
            result.save( (errSave)=>{
                if(errSave){
                    console.error(errSave);
                    return ;
                }
                console.log( "Payment proccess : Complete calculate total commission" );
            });
            return ;
        });
    });
};
