'use strict';

var enums = require('../resources/enums'),
    path = require('path'),
    redis = require(path.resolve('./config/lib/redis')),
    config = require(path.resolve('./config/config')),
    utils = require(path.resolve('./modules/core/resources/utils'));

var NotificationEvent = enums.NotificationEvent;

var LOG_TAG = '[Local]';

// Create the socket configuration
module.exports = function (io) {

    // delete all hash keys when restart server
    redis.evalsha(config.redis.resetOnlineStatus, 1, [`people_online_*`], null, null, (err, result)=>{
        if(err){
            console.error(err, `Delete all hash by pattern failed`);
        }else {
            console.log("RESET ALL ONLINE AGENTS");
        }
    });

    io.of('core').on('connection', function (socket) {
        var user = socket.request.user;
        var sessionId = socket.request.sessionID;
        var ed_user_id = utils.getParentUserId(user);

        socket.join('agent-'+user._id);
        console.log('%s user id is set to %s', LOG_TAG, 'agent-'+user._id);

        socket.join(ed_user_id);
        console.log('%s ed user id is set to %s', LOG_TAG, ed_user_id);

        // session id
        socket.join(sessionId);
        console.log('%s session id is set to %s', LOG_TAG, sessionId);

        // save online user on redis
        redis.evalsha(config.redis.setOnlineStatus, 1, [`people_online_${ed_user_id}`], [`${user._id}`], ['ADD'], (err, result)=>{
            if(err){
                console.error(err, `ADD error: online_agents_${ed_user_id} - user id: ${user._id}`);
            }
        });

        // a use closes a socket
        socket.on('disconnect', function () {
            console.log('%s Socket [%s] from user [%s] is disconnected.', LOG_TAG, socket.id, user._id);
            // remove online user on redis
            redis.evalsha(config.redis.setOnlineStatus, 1, [`people_online_${ed_user_id}`], [`${user._id}`], ['SUB'], (err, result)=>{
                if(err){
                    console.error(err, `SUB error: online_agents_${ed_user_id} - user id: ${user._id}`);
                }
            });
        });

        var data = {
            NotificationEvent : NotificationEvent
        };

        socket.emit('init', data);

        socket.on('request', data => {
            io.of( 'core' ).to( ed_user_id ).emit( 'event', data );
        });
    });
    io.of('worker').on('connection', function (socket) {
        var user = socket.request.user;

        socket.join(user._id);
        console.log('[Worker]: %s user id is set to %s', LOG_TAG, user._id);

        // a use closes a socket
        socket.on('disconnect', function () {
            console.log('[Worker]: %s Socket [%s] from user [%s] is disconnected.', LOG_TAG, socket.id, user._id);
        });
    });
};
