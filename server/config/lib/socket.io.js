'use strict';

// Load the module dependencies
var config = require('../config'),
    path = require('path'),
    http = require('http'),
    cookieParser = require('cookie-parser'),
    passport = require('passport'),
    session = require('express-session'),
    MongoStore = require('connect-mongo')(session),
    redis = require('redis'),
    socketio = require('socket.io'),
    redisAdapter = require( 'socket.io-redis' );

var authentication = (db, socket, next) => {
    // Create a MongoDB storage object
    var mongoStore = new MongoStore({
        mongooseConnection: db.connection,
        collection: config.dbTablePrefix.concat(config.sessionCollection)
    });

    // Use the 'cookie-parser' module to parse the request cookies
    cookieParser(config.sessionSecret)(socket.request, {}, function (err) {
        // Get the session id from the request cookies
        var sessionId = socket.request.signedCookies ? socket.request.signedCookies[config.sessionKey] : undefined;

        if (!sessionId){
            return socket.disconnect('unauthorized');
        }
        // Use the mongoStorage instance to get the Express session information
        mongoStore.get(sessionId, function (err, session) {
            if (err) {
                console.error(err);
                return socket.disconnect('unauthorized');
            }
            if (!session) {
                return socket.disconnect('unauthorized');
            }

            // Set the Socket.io session information
            socket.request.session = session;
            socket.request.sessionID = sessionId;

            // Use Passport to populate the user details
            passport.initialize()(socket.request, {}, function () {
                passport.session()(socket.request, {}, function () {
                    if (socket.request.user) {
                        return next(null, true);
                    }

                    socket.disconnect('unauthorized');
                });
            });
        });
    });
};

// init global var
var io;

var start = function (app, db) {
    // make sure only start onetime
    if(io){
        return;
    }

    var options = {
        return_buffers : true
    };
    if ( config.socket.server.redis.password ) {
        options.password = config.socket.server.redis.password;
    }

    // Create a new HTTP server
    var server = http.createServer(app);
    // Create a new Socket.io server
    io = socketio.listen(server);

    var socketpub = redis.createClient( config.socket.server.redis.port, config.socket.server.redis.host, options );
    var socketsub = redis.createClient( config.socket.server.redis.port, config.socket.server.redis.host, options );

    if ( config.socket.server.redis.password ) {
        socketpub.auth( config.socket.server.redis.password );
        socketsub.auth( config.socket.server.redis.password );
    }

    socketpub.on('error', function (err) {
        console.error(err, 'socketpub err');
    });
    socketpub.on('end', function () {
        console.error(new Error(), 'socketpub end');
    });

    socketsub.on('error', function (err) {
        console.error(err, 'socketsub err');
    });
    socketsub.on('end', function () {
        console.error(new Error(), 'socketsub end');
    });

    // Scale Socket.io with redis pubsub
    io.adapter( redisAdapter( {
        pubClient : socketpub,
        subClient : socketsub
    } ) );

    // Intercept Socket.io's handshake request
    io.of('core').use((socket, next) => {
        authentication(db, socket, next);
    });

    // Intercept Socket.io's handshake request
    io.of('worker').use((socket, next) => {
        authentication(db, socket, next);
    });

    // Add an event listener to the 'connection' event
    config.files.server.sockets.forEach(function (socketConfiguration) {
        require(path.resolve(socketConfiguration))(io);
    });

    return server;
};

// Define the Socket.io configuration method
module.exports.start = start;
module.exports.io = () => { return io; };
module.exports.emit = (ns, room, data) =>{
    io.nsps[ns].to(room).emit('event', data);
};
