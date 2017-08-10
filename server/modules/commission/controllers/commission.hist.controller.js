'use strict';

//
//  reference.account.controller.js
//  handle account commision routes
//
//  Created by dientn on 2015-01-05.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    UserSetting = mongoose.model('UserSetting'),
    CommissionHist = mongoose.model('CommissionHist'),
    path = require('path'),
    utils = require('../../core/resources/utils'),
    generator = require('generate-password');
;

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========



// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========


/*
 * add new account to reference list 
 * @author: dientn 
 * @param: data: data  
 * @param: next: callback
 */
exports.addReferenceHistory = ( idOwner, data , next) =>{
    var hist = {
        ed_user_id: idOwner,
        ref_code: data.ref_code,
        buyer: {
            id: data.buyer,
            total_order: data.total_order,
            payment_hist_id: data.payment_hist_id
        }
    };
    var comHist = new CommissionHist(hist);
    comHist.save( (saveErr)=>{
        if(saveErr){
            return next(saveErr);
        }
        return next(null, comHist);
    });
    next();
};


/*
 * get reference history
 * @author: dientn
 */
exports.getReferenceHistory = [
    (req, res, next) =>{
        var idOwner = utils.getParentUserId( req.user );
        var query = {
            ed_user_id : idOwner
        };
        CommissionHist.find( query ).exec( (err, result)=>{
            if( err ){
                return next( err );
            }
            res.json(result);
        } );
    }
];

