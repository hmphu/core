module.exports = {
    db : {
        uri : 'mongodb://222.255.234.13/izihelp_stagging',
        options : {
            user : 'izihelp_stagging',
            pass : 'izihelp_stagging!@#'
        },
        debug : true
    },
    dbTablePrefix : 'ih_stage_',
    dbAutoIndex : false,
    mailer : {
        from : "izi@izihelp.com",
        options : {
            host : "s3.fireflyinnovative.com",
            port : 465,
            secure : true,
            pool : true,
            maxConnections : 5,
            auth : {
                user : "logging@fireflyinnov.com",
                pass : "admin!@#$%^"
            }
        },
        admin : "admin@izihelp.com",
        errorlog : "logging@fireflyinnov.com"
    }
};
