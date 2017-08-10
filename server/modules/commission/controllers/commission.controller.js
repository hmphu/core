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
    Commission = mongoose.model('Commission'),
    path = require('path'),
    utils = require('../../core/resources/utils'),
    generator = require('generate-password');

// ==========
// = PRIVATE FUNCTIONS AREA =
// ==========

var generateRefCode = ( length ) =>{
    var password = generator.generate({
        length: length,
        numbers: true,
        symbols: false
    });
    return password;
};

// ==========
// = PUBLIC FUNCTIONS AREA =
// ==========


/*
 * set reference code for new account
 * @author: dientn
 */
exports.addRefCode = (idOwner, next) =>{
    var refCode = generateRefCode( 12 );
    
    var commission = new Commission( {
        ref_code : refCode,
        ed_user_id : idOwner
    } );

    commission.save( ( err )=>{
        if(err){
            return next( err );
        }
        next( null, commission );
    } );
};

/*
 * set reference code for new account
 * @author: dientn
 */
exports.getRefCode = ( idOwner, ref_code, next) =>{
    var query = {
        ref_code : ref_code,
        ed_user_id: { $ne: idOwner}
    }

    Commission.findOne(query, ( err, commission )=>{
        if(err){
            return next( err );
        }
        next( null, commission );
    } );
};
    

/*
 * get current user's total commission
 * @author: dientn
 */
exports.getTotalCommissionInternal= ( idOwner, next ) =>{
    Commission.findOne( {
        ed_user_id : idOwner
    } ).exec( ( err, result ) =>{
        if(err){
            return next(err);
        }
        var total = result ? Math.round( result.total_commission ) : 0;
        next( null, total );
    } );
};

/*
 * get current user's total commission
 * @author: dientn
 */
exports.getTotalCommission= ( req, res, next ) =>{
    var idOwner = utils.getParentUserId( req.user );
    exports.getTotalCommissionInternal(idOwner, (err, commission)=>{
        if(err){
            return next( err );
        }
        res.json( commission );
    });
};

/*
 * update current user's total commission
 * @author: dientn
 */
exports.updateTotalCommission= ( idOwner, total_commission, next ) =>{
    var query = {
        ed_user_id: idOwner
    }

    Commission.findOne(query, ( err, commission )=>{
        if(err){
            return next( err );
        }
        if(!commission){
            return next(new TypeError("commission.not_found"));
        }
        
        commission.total_commission = commission.total_commission + total_commission;
        console.log(commission.total_commission);
        commission.save(( errSave )=>{
            if(errSave){
                return next(errSave);
            }
        });
        
        next( null, commission );
    } );
};

/*
 * get current user's reference info
 * @author: dientn
 */
exports.getReferenceInfo= ( req, res, next ) =>{
    var idOwner = utils.getParentUserId( req.user );
    Commission.findOne( {
        ed_user_id : idOwner
    } ).exec( ( err, result ) =>{
        if(err){
            return next(err);
        }
        
        res.json((result || {}).ref_code);
    } );
};
