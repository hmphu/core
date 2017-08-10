'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    passport = require('passport'),
    enums = require('../../../core/resources/enums.res'),
    validate = require('../../validator/user.validator'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    translation = require('../../resources/translation'),
    sendmail = require('../../../core/resources/sendmail'),
    userLogin = require('../users/user.login.controller'),
    elasticController = require('../../../elastics/controllers/elastic.controller'),
    elasticsUserController = require('../../../elastics/controllers/elastic.user.controller'),
    User = mongoose.model('User'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter'));

// URLs for which user can't be redirected on signin
var noReturnUrls = [
    '/signin',
    '/signup'
];

var preDataUserSetting = (body, user , t) =>{
    // Remove sensitive data before login
    user.password = undefined;
    user.salt = undefined;

    // send reg mail
    var data = {
        full_url: `${config.izi.protocal}://${user.sub_domain}.${config.izi.domain}`,
        phone: config.izi.phone_number
    };
    var options = {
        from : config.mailer.from,
        to : user.email,
        template : `modules/user/templates/${user.language}/register-email.html`,
        subject : translation[t].mail.subject.register
    };
    sendmail(data, options);

    // added predata
    body.time_format = user.time_format;
    emitter.emit('evt.user.signup', user, body);
    emitter.emit('evt.dc.add_master', {ed_user_id: user._id, language: user.language});
    emitter.emit('evt.rating.add', user);
    emitter.emit('evt.googleplay.add', {ed_user_id: user._id, language: user.language});
//            emitter.emit('evt.cs.add_master', {ed_user_id: user._id, language: user.language, provider: "ticket"});
//            emitter.emit('evt.cs.add_master', {ed_user_id: user._id, language: user.language, provider: "org"});
//            emitter.emit('evt.cs.add_master', {ed_user_id: user._id, language: user.language, provider: "user"});
    emitter.emit('evt.automation.add_master', {ed_user_id: user._id, language: user.language});
    emitter.emit('evt.macro.add_master', {ed_user_id: user._id, user_id: user._id, language: user.language});
    emitter.emit('evt.view.user.add_master', {ed_user_id: user._id, user_id: user._id, language: user.language});
    emitter.emit('evt.trigger.add_master', {ed_user_id: user._id, user_id: user._id, language: user.language});
}
/**
 * Signup
 */
exports.signup = [
    // get timezone from google map api
    (req, res, next) => {
        validate(req.body, true, next);
    },
    (req, res, next)  => {
        // Init Variables
        var user = new User(req.body);
        var t = req.body.language || "en";
        // Add missing user fields
        user.provider = 'local';
        user.roles = [enums.UserRoles.owner]; // owner

        // Then save the user
        user.save(function (err) {
            if (err) {
                return next(err);
            }
            elasticController.syncOwnerToElastic(user, (err_elastics, result_elastics) =>{
                // sync data user to elastics.
                elasticsUserController.syncElasticUser({
                    op: 'i',
                    o : user
                });
                //add some pre-user settings
                preDataUserSetting(req.body, user, t);
            });
            // auto login
            req.login(user, function (err) {
                if (err) {
                    return next(new TypeError('common.users.unauthenticated'));
                }
                req.session.regenerate(function(err) {
                    if(err){
                        return console.error(err, 'failed to save login data');
                    }
                    userLogin.add(user, req.sessionID);
                });
                res.json(user);
            });
        });
    }
];

/**
 * Signin after passport authentication
 */
exports.signin = function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        if(err){
            return next(err);
        }
        if (!user) {
            return next(new TypeError('common.users.unauthenticated'));
        }
        // Remove sensitive data before login
        user.password = undefined;
        user.salt = undefined;
        req.login(user, function (err) {
            if (err) {
                return next(new TypeError('common.users.unauthenticated'));
            }
            userLogin.add(req.user, req.sessionID);
            res.json(user);
        });
    })(req, res, next);
};

/**
 * Signin after passport authentication
 */
exports.internalSignin = function (req, res, next) {
    passport.authenticate('internal', function (err, user, info) {
        if(err){
            return next(err);
        }
        if (!user) {
            return next(new TypeError('common.users.unauthenticated'));
        }
        // Remove sensitive data before login
        user.password = undefined;
        user.salt = undefined;
        req.login(user, function (err) {
            if (err) {
                return next(new TypeError('common.users.unauthenticated'));
            }
            userLogin.add(req.user, req.sessionID);
            res.json(user);
        });
    })(req, res, next);
};

/**
 * Signout
 */
exports.signout = function (req, res) {
    // if single sign on exists in current session => redirect to setting logout url
    var sso = req.session.sso;
    var redirect = sso ? sso.provider_data.logout_url : '/';
    
    if (req.headers && req.headers.authorization) {
        delete req.headers.authorization;
    }

    delete req.user;
    req.session.destroy();
    req.logout();
    
    res.redirect(redirect);
};

/**
 * OAuth provider call
 */
exports.oauthCall = function (strategy, scope) {
    return function (req, res, next) {
        // Set redirection path on session.
        // Do not redirect to a signin or signup page
        if (noReturnUrls.indexOf(req.query.redirect_to) === -1) {
            req.session.redirect_to = req.query.redirect_to;
        }
        // Authenticate
        passport.authenticate(strategy, scope)(req, res, next);
    };
};

/**
 * OAuth callback
 */
exports.oauthCallback = function (strategy) {
    return function (req, res, next) {
        // Pop redirect URL from session
        var sessionRedirectURL = req.session.redirect_to;
        delete req.session.redirect_to;

        passport.authenticate(strategy, function (err, user, redirectURL) {
            if (err) {
                return res.redirect('/signin?err=' + encodeURIComponent(errorHandler.getErrorMessage(err)));
            }
            if (!user) {
                return res.redirect('/signin');
            }
            req.login(user, function (err) {
                if (err) {
                    return res.redirect('/signin');
                }

                return res.redirect(redirectURL || sessionRedirectURL || '/');
            });
        })(req, res, next);
    };
};

/**
 * Authenticate for API using token
 */
exports.authenticateApi = function (req, res, next) {
    passport.authenticate('api', {
        session : true
    }, function (err, loggedUser, info) {
        if (err) {
            return next(err);
        }

        req.user = req.user || loggedUser;

        if (!req.user) {
            return next(new TypeError('common.users.unauthenticated'));
        }

        next();
    })(req, res, next);
};

/**
 * Authenticate for External API using token
 */
exports.authenticateExternalApi = function (req, res, next) {
    passport.authenticate('external', {
        session : false
    }, function (err, loggedUser, info) {
        if (err) {
            return next(err);
        }

        req.user = req.user || loggedUser;

        if (!req.user) {
            return next(new TypeError('common.users.unauthenticated'));
        }

        next();
    })(req, res, next);
};

/**
 * Authenticate for API using transfer token
 */
exports.authenticateTransfer = function (req, res, next) {
    passport.authenticate('transfer', {
        session : true
    }, function (err, loggedUser, info) {
        if (err) {
            return next(err);
        }

        req.user = req.user || loggedUser;

        if (!req.user) {
            return next(new TypeError('common.users.unauthenticated'));
        }

        next();
    })(req, res, next);
};

/**
 * Helper function to save or update a OAuth user profile
 */
exports.saveOAuthUserProfile = function (req, providerUserProfile, done) {
    if (!req.user) {
        // Define a search query fields
        var searchMainProviderIdentifierField = 'provider_data.' + providerUserProfile.providerIdentifierField;
        var searchAdditionalProviderIdentifierField = 'additional_providers_data.' + providerUserProfile.provider + '.' + providerUserProfile.providerIdentifierField;

        // Define main provider search query
        var mainProviderSearchQuery = {};
        mainProviderSearchQuery.provider = providerUserProfile.provider;
        mainProviderSearchQuery[searchMainProviderIdentifierField] = providerUserProfile.provider_data[providerUserProfile.providerIdentifierField];

        // Define additional provider search query
        var additionalProviderSearchQuery = {};
        additionalProviderSearchQuery[searchAdditionalProviderIdentifierField] = providerUserProfile.provider_data[providerUserProfile.providerIdentifierField];

        // Define a search query to find existing user with current provider profile
        var searchQuery = {
            $or: [mainProviderSearchQuery, additionalProviderSearchQuery]
        };

        User.findOne(searchQuery, function (err, user) {
            if (err) {
                return done(err);
            } else {
                if (!user) {
                    user = new User({
                        name: providerUserProfile.name,
                        email: providerUserProfile.email,
                        profile_image: providerUserProfile.profile_image,
                        provider: providerUserProfile.provider,
                        provider_data: providerUserProfile.provider_data
                    });

                    // And save the user
                    user.save(function (err) {
                        return done(err, user);
                    });
                } else {
                    return done(err, user);
                }
            }
        });
    } else {
        // User is already logged in, join the provider data to the existing user
        var user = req.user;

        // Check if user exists, is not signed in using this provider, and doesn't have that provider data already configured
        if (user.provider !== providerUserProfile.provider && (!user.additional_providers_data || !user.additional_providers_data[providerUserProfile.provider])) {
            // Add the provider data to the additional provider data field
            if (!user.additional_providers_data) {
                user.additional_providers_data = {};
            }

            user.additional_providers_data[providerUserProfile.provider] = providerUserProfile.provider_data;

            // Then tell mongoose that we've updated the additional_providers_data field
            user.markModified('additional_providers_data');

            // And save the user
            user.save(function (err) {
                return done(err, user, '/settings/accounts');
            });
        } else {
            return done(new Error('User is already connected using this provider'), user);
        }
    }
};

/**
 * Remove OAuth provider
 */
exports.removeOAuthProvider = function (req, res, next) {
    var user = req.user;
    var provider = req.query.provider;

    if (!user) {
        return next(new TypeError('common.users.unauthenticated'));
    } else if (!provider) {
        return res.status(400).send();
    }

    // Delete the additional provider
    if (user.additional_providers_data[provider]) {
        delete user.additional_providers_data[provider];

        // Then tell mongoose that we've updated the additional_providers_data field
        user.markModified('additional_providers_data');
    }

    user.save(function (err) {
        if (err) {
            return next(err);
        } else {
            req.login(user, function (err) {
                if (err) {
                    return next(new TypeError('common.users.unauthenticated'));
                } else {
                    return res.json(user);
                }
            });
        }
    });
};

/**
 * Sign in user using JWT
 */
exports.signinJwt = function (req, res, next) {
    if (req.user) { // skip login process if user already logged in
        return next(new TypeError('common.users.already.loggedin'));
    }
    
    var token = req.query.jwt; // json web token
    var returnToUrl = req.query.return_to || '/'; // redirect url after login
    var subDomain = req.res.locals.sub_domain; // sub-domain which enables single sign on feature
    
    // transform credential data to local authentication format
    req.body.sub_domain = subDomain;
    req.body.token = token;
    
    passport.authenticate('jwt', function (err, user, info) {
        if (err) {
            return next(err);
        }

        if (!user) {
            return next(new TypeError('common.users.unauthenticated'));
        }
        
        // Remove sensitive data before login
        delete user.password;
        delete user.salt;

        req.login(user, function (logInErr) {
            if (logInErr) {
                return next(new TypeError('common.users.unauthenticated'));
            }
            
            req.session.sso = user.sso;
            
            userLogin.add(req.user, req.sessionID);
            
            res.redirect(returnToUrl);
        });
    })(req, res, next);
};
