'use strict';
//
//  ^user.ticket.validator.js
//  check the validity of user agent functions
//
//  Created by dientn on 2015-12-23.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var validate = require('../../core/resources/validate'),
    path = require('path'),
    _ = require("lodash"),
    enums = require('../resources/enums'),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========


/* 
* check duplicate email in email list 
*/
validate.validators.check_duplicate_email_list = ( value, options, key, attributes ) =>{
    if ( !value || ( _.isArray(value) && value.length > 1 ) ) {
        return null;
    }
    return validate.Promise(( resolve, reject ) =>{
        for(var i =0; i< value.length; i++){
            var email = value[i];
            var count = 0;
            for(var j =0; j< value.length; j++){
                if(value[j] == email){
                    count++;
                }
            }
            if ( count > 1 ) {
                return resolve( options.message );
            }
        }
        return resolve();
    } );
};

/*
 * check regex email in list 
 * @author: dientn
 */
validate.validators.check_regex_email_list = ( value, options, key, attributes ) =>{
    if ( !value ) {
        return null;
    }

    return new validate.Promise(function( resolve, reject ){
        validate_list_email( value, (result)=>{
            if ( !result ) {
                return resolve( options.message );
            }
            return resolve();
        } );
    } );
};

/* check regx email in list */
var validate_list_email =  ( ccs, callback) =>{
    var email_values = {}, emails_constraints = {};
    for ( var i = 0; i < ccs.length; i++ ) {
        email_values[ i ] = ccs[ i ];
        emails_constraints[ i ] = {
            email: true
        };
        
    }
    if(validate( email_values, emails_constraints)){
       return callback(false);
    }
    return callback(true);
};

/* check domain */
function validateDomain ( domain ) {
    var emailReg = new RegExp( /^([A-Za-z0-9]+\.)?[A-Za-z0-9][A-Za-z0-9-]*\.[A-za-z]{2,6}$/i );
    var valid = emailReg.test( domain );

    if ( !valid ) {
        return false;
    } else {
        return true;
    }
}
//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

module.exports = function(data, next) {
    var constraints = {
        suspended_mail_sent_date: {
            datetime: {
                message: "^user.ticket.suspended_notif_email_list.date_type"
            }
        },
        enable_tags: {
            isBoolean: {
                message: "^user.mail.enable_tags.invalid"
            }
        },
        is_comment_markdown: {
            isBoolean: {
              message: "^user.ticket.is_comment_markdown.invalid"
            }
        },
        is_comment_emoji: {
            isBoolean: {
              message: "^user.ticket.is_comment_emoji.invalid"
            }
        },
        is_public_email_comment: {
            isBoolean: {
              message: "^user.ticket.is_public_email_comment.invalid"
            }
        },
        automatic_enable_tags: {
            isBoolean: {
              message: "^user.ticket.automatic_enable_tags.invalid"
            }
        },
        auto_assign_on_solved: {
            isBoolean: {
              message: "^user.ticket.auto_assign_on_solved.invalid"
            }
        },
        allow_reassign_to_group: {
            isBoolean: {
              message: "^user.ticket.allow_reassign_to_group.invalid"
            }
        },
        suspended_mail_sent_date: {
            datetime: {
                message: "^user.ticket.suspended_mail_sent_date.invalid"
            }
        },
        enable_voip_admin_listen: {
            isBoolean: {
              message: "^user.ticket.is_comment_markdown.invalid"
            }
        },
        enable_requester: {
            isBoolean: {
              message: "^user.ticket.is_comment_markdown.invalid"
            }
        },
        suspended_ticket_notif: {
            numericality: {
                onlyInteger: true,
                notInteger: "^user.ticket.suspended_ticket_notif.int",
            },
            inclusion: {
                within: _.values(enums.SuspendedTicketNotify),
                message: "^user.ticket.suspended_ticket_notif.inclusion"
            }
        },
        suspended_email_list: {
            is_array: {
                message: "^user.ticket.suspended_email_list.data_type"
            },
            check_regex_email_list: {
                message: "^user.ticket.suspended_email_list.email_not_regex",
            },
            check_duplicate_email_list: {
                message: "user.suspended_email_list.email_duplicated",
            }
        },
        suspended_notif_email_list: {
            is_array: {
                message: "^user.ticket.suspended_notif_email_list.data_type"
            },
            check_regex_email_list: {
                message: "^user.ticket.suspended_notif_email_list.email_not_regex",
            },
            check_duplicate_email_list: {
                message: "user.suspended_notif_email_list.email_duplicated",
            }
        }
    };
    
    if(!_.isUndefined(data.suspended_ticket_notif)){
        constraints.suspended_ticket_notif.presence = {
            message: "^user.ticket.suspended_ticket_notif.required"  
        };
        
    }
    var success = function() {
        next();
    }, error = function(errors) {
        next(errorHandler.validationError(errors));
    };

    validate.async(data, constraints).then(success, error);
};
