'use strict';

/**
 * Module dependencies.
 */
var config = require('../config'),
    express = require('express'),
    morgan = require('morgan'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    MongoStore = require('connect-mongo')(session),
    favicon = require('serve-favicon'),
    compress = require('compression'),
    methodOverride = require('method-override'),
    cookieParser = require('cookie-parser'),
    helmet = require('helmet'),
    path = require('path'),
    mongoose = require('mongoose'),
    eventEmitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    errorHandler = require(path.resolve('./modules/core/controllers/errors.controller'));

/**
 * Initialize local variables
 */
module.exports.initLocalVariables = function (app) {
    // Setting application local variables
    app.locals.title = config.app.title;
    app.locals.description = config.app.description;

    // Passing the request url to environment locals
    app.use(function (req, res, next) {
        res.locals.sub_domain = (req.hostname || "").split(".")[0];
        res.locals.host = req.protocol + '://' + req.hostname;
        res.locals.url = req.protocol + '://' + req.headers.host + req.originalUrl;
        res.locals.short_url = req.protocol + '://' + req.headers.host;
        //TODO: remove later
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
};

/**
 * Initialize application middleware
 */
module.exports.initMiddleware = function (app) {
    // Showing stack errors
    app.set('showStackError', true);

    // Enable jsonp
    app.enable('jsonp callback');

    // Should be placed before express.static
    app.use(compress({
        filter: function (req, res) {
            return (/json|text|javascript|css|font|svg/).test(res.getHeader('Content-Type'));
        },
        level: 9
    }));

    // Initialize favicon middleware
    app.use(favicon('assets/img/favicon.ico'));

    // Environment dependent middleware
    if (process.env.NODE_ENV === 'development') {
        // Enable logger (morgan)
        app.use(morgan('dev'));
    } else if (process.env.NODE_ENV === 'production') {
        app.locals.cache = 'memory';
    }

    // Request body parsing middleware should be above methodOverride
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json({
        verify : function (req, res, buf, encoding) {
            // get raw_json_body
            req.raw_json_body = buf.toString();
            try {
                console.log(111111111);
                JSON.parse(req.raw_json_body);
            } catch (e) {
                throw new TypeError('common.data.invalid');
            }
        }
    }));
    app.use(methodOverride());

    // Add the cookie parser and flash middleware
    app.use(cookieParser());
};

/**
 * Configure Express session
 */
module.exports.initSession = function (app, db) {
    // Express MongoDB session storage
    app.use(session({
        saveUninitialized: true,
        resave: true,
        secret: config.sessionSecret,
        cookie: {
            maxAge: config.sessionCookie.maxAge,
            httpOnly: config.sessionCookie.httpOnly,
            secure: config.sessionCookie.secure
        },
        key: config.sessionKey,
        store: new MongoStore({
            mongooseConnection: mongoose.connection,
            collection: config.dbTablePrefix.concat(config.sessionCollection)
        })
    }));
};

/**
 * Invoke modules server configuration
 */
module.exports.initModulesConfiguration = function (app, db) {
    config.files.server.configs.forEach(function (configPath) {
        require(path.resolve(configPath))(app, db);
    });
};

/**
 * Configure Helmet headers configuration
 */
module.exports.initHelmetHeaders = function (app) {
    // Use helmet to secure Express headers
    var SIX_MONTHS = 15778476000;
    app.use(helmet.xssFilter());
    app.use(helmet.hsts({
        maxAge: SIX_MONTHS,
        includeSubdomains: true,
        force: true
    }));
    app.disable('x-powered-by');
};

/**
 * Configure the modules ACL policies
 */
module.exports.initModulesServerPolicies = function (app) {
    // Globbing policy files
    config.files.server.policies.forEach(function (policyPath) {
        require(path.resolve(policyPath)).invokeRolesPolicies();
    });
};

/**
 * Configure the modules static routes
 */
module.exports.initServingStatic = function (app) {
    // Setting the app router and static folder
    app.use('/', express.static(path.resolve('../client')));
    app.use('/static', express.static(path.resolve('assets/uploads')));
};

/**
 * Configure the modules server routes
 */
module.exports.initModulesServerRoutes = function (app) {
    // Globbing routing files
    config.files.server.routes.forEach(function (routePath) {
        require(path.resolve(routePath))(app);
    });
};

/**
 * Configure error handling
 */
module.exports.initErrorRoutes = function (app) {
    app.use(function (err, req, res, next) {
        // If the error object doesn't exists
        if (!err) {
            return next();
        }
        // send a single error back
        if(err instanceof TypeError){
            // send back a single message
            return res.status(400).send({
                errors: errorHandler.getSingleMessage(err.message)
            });
        }
        // send a validation errors back
        if(err instanceof mongoose.Error.ValidationError){
            // send back a single message
            return res.status(400).send({
                errors: err.message
            });
        }
        var isUnique = errorHandler.getUniqueErrorMessage(err);
        if(isUnique instanceof Error){
            // send back a unique message
            var err_ = {
                errors: {[isUnique.message]: 'common.unique'}
            };
            if(err.op){
                err_._id = err.op._id;
            }
            return res.status(400).send(err_);
        }
        // Log it and send mail
        console.error(err, res.locals.url);

        // send a clean 500 error back to user
        res.status(500).send({
            errors: errorHandler.getSingleMessage("common.500")
        });
    });
};

/**
 * Configure events
 */
module.exports.initModulesServerEvents = function (app) {
    // Globbing eventEmitters files
    config.files.server.events.forEach(function (eventEmitterPath) {
        require(path.resolve(eventEmitterPath))(eventEmitter);
    });
};

/**
 * Configure Socket.io
 */
module.exports.configureSocketIO = function (app, db) {
    // Load the Socket.io configuration
    var server = require('./socket.io').start(app, db);

    // Return server object
    return server;
};

/**
 * Initialize the Express application
 */
module.exports.init = function (db) {
    // Initialize express app
    var app = express();

    if (process.env.NODE_ENV !== 'production') {
        this.initServingStatic(app);
    }

    // Initialize local variables
    this.initLocalVariables(app);

    // Initialize Express middleware
    this.initMiddleware(app);

    // Initialize Express session
    this.initSession(app, db);

    // Initialize Modules configuration
    this.initModulesConfiguration(app);

    // Initialize Helmet security headers
    this.initHelmetHeaders(app);

    // Initialize modules server authorization policies
    this.initModulesServerPolicies(app);

    // Initialize modules server routes
    this.initModulesServerRoutes(app);

    // Initialize error routes
    this.initErrorRoutes(app);

    // Initialize events
    this.initModulesServerEvents(app);

    // Configure Socket.io
    app = this.configureSocketIO(app, db);

    return app;
};
