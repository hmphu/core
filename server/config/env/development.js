'use strict';

module.exports = {
    db : {
        uri : 'mongodb://222.255.234.13/izihelp_stagging',
        options : {
            user : 'izihelp_stagging',
            pass : 'izihelp_stagging!@#'
        },
        debug : false
    },
    elastic: {
//        host: '192.168.1.18',
        //auth: 'user:password',
        //protocol: 'https',
//        port: 9200
        host: '222.255.234.13',
        port: 9200,
        prefix: {
            index_profile: 'profile_id_v1',
            index_ticket: 'ticket_id_v1',
            index_ticket_cmt: 'cmt_ticket_id_v1'
        }
    },
    dbAutoIndex : true,
    sessionSecret : process.env.SESSION_SECRET || 'sessionizihelpsecret',
    loginSecret : "izihelp_dev%21%40%23",
    izi : {
        // domain: 'infirefly.com',
        domain : 'localhost.com',
        protocal : 'http',
        port : 3000,
        apiPath : "/api",
    },
    paging: {
        limit: 10,
        skip: 0
    },
    rabbit : {
        ip : '222.255.234.13',
        vhost : 'izihelp_stage',
        port : 5672,
        user : 'izihelp_stage',
        pass : 'izihelp_stage%21%40%23',
        reconnectTimeout : 5000,
        prefetch : 1,
        receiver : {
            exchange: 'exchange-izi-core',
            queues: [
                'izicomment-update-comment-provider',
                'izicomment-request-userbranding',
                'izicomment-request-usersetting',
                'izicomment-request-userlocal',
                'izicomment-request-users',
                'izicomment-request-contacts',
                'izichat-request-userbranding',
                'izichat-request-usersetting',
                'izichat-request-userlocal',
                'izichat-request-usercalendar',
                'izichat-request-groups',
                'izichat-request-groupusers',
                'izichat-request-users',
                'izichat-request-contacts',
                'zalo-realtime-messages'
            ]
        },
        sender : {
            exchange : {
                trigger : 'exchange-izi-trigger',
                comment : 'exchange-izi-comment',
                chat : 'exchange-izi-chat',
                report : 'exchange-izi-report',
                batch : 'exchange-izi-batch',
                realtime : 'exchange-izi-realtime'
            },
            delayedExchange: {
                batch : 'delayed-exchange-izi-batch'
            }
        }
    },
    mailer : {
        from : "izi@izihelp.com",
        options : {
            host : "s3.fireflyinnovative.com",
            port : 465,
            secure : true,
            pool: true,
            maxConnections: 5,
            auth : {
                user : "logging@fireflyinnov.com",
                pass : "admin!@#$%^"
            }
        },
        admin : "admin@izihelp.com",
        errorlog : "logging@fireflyinnov.com"
    },
    notifier : {
        trigger : {
            socket : {
                url : 'http://localhost:3002/trigger',
                secret : '~!@#$%'
            }
        },
        emitter : {
            redis : {
                host : '222.255.234.13',
                port : 6321,
                password : 'rCwBQbd7ZUM6OTiGZ5hx6b5SkkvhW5SiT9YknJjs'
            }
        }
    },
    socket : {
        server : {
            redis : {
                host : '222.255.234.13',
                port : 6321,
                password : 'rCwBQbd7ZUM6OTiGZ5hx6b5SkkvhW5SiT9YknJjs'
            }
        }
    },
    redis : {
        host : '222.255.234.13',
        port : 6321,
        password : "rCwBQbd7ZUM6OTiGZ5hx6b5SkkvhW5SiT9YknJjs",
        prefix : 'ih_stage_',
        defaultDatabase : 0,
        setOnlineStatus: 'aeedd7128c4af961d6cf5bf7031616aa7d215779',
        resetOnlineStatus: '48734ceacfa2490e3c9fd77557223ae3a287b791',
        findAndUpdate: 'a79b6c29d5651c9a842534bca9378566b0f4d2e4'
    },
    zalo: {
        fileSize: 1048576, //1MB
        jwtSecret: "zaloJwtEncode",
        clientID: "416000513542011480",
        clientSecret: "uONzQ7NMC7SW8bH2PGdM",
        callbackURL: "https://www.fireflyinnovative.com/api/zalo/authorize/callback",
        oauth2URL: "https://oauth.zaloapp.com/page/login",
        openApiURL: "https://openapi.zaloapp.com/oa/v1"
    },
    facebook: {
        version: 'v2.5',
        clientID: "696025310519269", //process.env.FACEBOOK_ID || 'APP_ID',
        clientSecret: "a0d9bb0361bea0df1783272a3718111c", //process.env.FACEBOOK_SECRET || 'APP_SECRET',
        appToken: "696025310519269|DkC8zhnCdUe6p7kop-GASCJ8wBA",
        accessTokenUrl: 'oauth/access_token',
        subdomainCallback: 'realtime',
        callbackURL: '/api/auth/facebook/callback',
        userCallbackURL: "/api/fb-accounts/callback",
        pageCallbackURL: "/api/fb-pages/callback",
        profileRedirectUrl: "/profile",
        limit: 100
    },
    twitter : {
        clientID : process.env.TWITTER_KEY || 'CONSUMER_KEY',
        clientSecret : process.env.TWITTER_SECRET || 'CONSUMER_SECRET',
        callbackURL : '/api/auth/twitter/callback'
    },
    google : {
        // Khanh gmail app
        // clientID:
        // '170093382302-198utknpltqo1tgd0pleegjb420f9e8u.apps.googleusercontent.com',
        // clientSecret: 'cLUOtdn3DwHBK_hFHMoNUOPd',
        // project_id: 'test-izi-core2',
        clientID : '292141613505-l519tiecojededsahd0f0cugtcldt3nu.apps.googleusercontent.com',
        clientSecret : '-qrc4Ka8qvMsAfK_TR-6LL9y',
        project_id : 'test-core2',

        // clientID:
        // '1010324640276-levngcfg99vtnm8l98gm0hhj1rqv7sgd.apps.googleusercontent.com',
        // clientSecret: 'RIcZ0DyUK_eXfn_OI90p5n5j',
        // gmail_redirect_url:
        // 'https://services.izihelp.com/gmail/authorize_redirect',
        // gmail_redirect_url: '/api/gmail/authorize/callback',
        gmail_cloud_topic : 'projects/test-core2/topics/gmail_notif',
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        callbackURL : '/api/gmail/authorize/callback',
        subscribeURL : '/api/gmail/authorize/subscribe',
        youtube_callbackURL : '/api/youtube/channel/authorize/callback',
        youtube_subscribeURL : '/api/youtube/channel/authorize/subscribe',
        scopes : [ 'https://www.googleapis.com/auth/gmail.readonly',
                'https://mail.google.com/',
                'https://www.googleapis.com/auth/gmail.modify',
                'https://www.googleapis.com/auth/userinfo.profile'],
        scopes_youtube : [
                         'https://www.googleapis.com/auth/userinfo.email',
                         'https://www.googleapis.com/auth/userinfo.profile',
                         'https://www.googleapis.com/auth/youtube',
                         'https://www.googleapis.com/auth/youtube.force-ssl',
                         'https://www.googleapis.com/auth/youtube.readonly',
                         'https://www.googleapis.com/auth/youtube.upload',
                         'https://www.googleapis.com/auth/youtubepartner',
                         'https://www.googleapis.com/auth/youtubepartner-channel-audit']
    },
    linkedin : {
        clientID : process.env.LINKEDIN_ID || 'APP_ID',
        clientSecret : process.env.LINKEDIN_SECRET || 'APP_SECRET',
        callbackURL : '/api/auth/linkedin/callback'
    },
    github : {
        clientID : process.env.GITHUB_ID || 'APP_ID',
        clientSecret : process.env.GITHUB_SECRET || 'APP_SECRET',
        callbackURL : '/api/auth/github/callback'
    },
    paypal : {
        clientID : process.env.PAYPAL_ID || 'CLIENT_ID',
        clientSecret : process.env.PAYPAL_SECRET || 'CLIENT_SECRET',
        callbackURL : '/api/auth/paypal/callback',
        sandbox : true
    },
    // Payment config
    payment : {
        atm : {
            secret : "A3EFDFABA8653DF2342E8DAC29B51AF0",
            url : "https://mtf.onepay.vn/onecomm-pay/vpc.op",
            accessCode : "D67342C2",
            merchantId : "ONEPAY"
        },
        credit : {
            secret : "6D0870CDE5F24F34F3915FB0045120DB",
            url : "https://mtf.onepay.vn/vpcpay/vpcpay.op",
            accessCode : "6BEB2546",
            merchantId : "TESTONEPAY"
        },
        isTest : true
    },
    bizRule : {
        maxItem : 50,
        maxCondition : 50,
        maxAction : 50,
        masterAuto : 4,
        masterTrigger : 8
    },
    // DEFAULT EXCHANGE RATE USD
    defaultExchangeRateUsd : 21000,
    assets_path: 'http://localhost:3000/static/'
};
