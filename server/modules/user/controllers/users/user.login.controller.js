'use strict';

/**
 * @author: vupl
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    path = require('path'),
    utils = require('../../../core/resources/utils'),
    UserLogin = mongoose.model('UserLogin'),
    Sessions = mongoose.model('Sessions'),
    socketIO = require(path.resolve('./config/lib/socket.io'));

/**
 * add a new login
 * author : dientn
 */
exports.add = (user, sessionID) => {
    var idOwner = utils.getParentUserId(user);
    
    UserLogin.findOneAndUpdate({
        ed_user_id : idOwner,
        user_id: user._id,
        session_id : sessionID
    }, {}, {
        upsert : true,
        'new' : true
    }, (err, newLogin) => {
        if (err) {
            return console.error(new Error(JSON.stringify(err)));
        }
        
        exports.signOutConcurrentSession(newLogin);
    });
};

/**
 * Find and sign out all concurrent sessions.
 */
exports.signOutConcurrentSession = (newLogin) => {
    var sid = newLogin.session_id;
    
    UserLogin.find({
        ed_user_id : newLogin.ed_user_id,
        user_id: newLogin.user_id,
        session_id : {
            $ne : newLogin.session_id
        }
    },(err, results) => {
        if (err) {
            console.error(err);
            return;
        }

        var oldSessionIds = results.map((result) => {
            return result.session_id
        });
        
        Sessions.remove({ _id : {
            $in : oldSessionIds
        }}, (removeErr) => {
            if (removeErr) {
                console.error(removeErr);
                return;
            }
            
            oldSessionIds.forEach((sid) => {
                socketIO.emit('/core', sid, {
                    topic : 'izi-core-client-signout',
                    payload : {
                        kicked : 'concurrent'
                    }
                });
            });
        });
        
        UserLogin.remove({ session_id : {
            $in : oldSessionIds
        }}, (removeErr) => {
            if (removeErr) {
                console.error(removeErr);
            }
        });       
    });
};
