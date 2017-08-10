'use strict';
//
//  voip.controller.js
//  handle core system routes
//
//  Created by vupl on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Voip = mongoose.model('Voip'),
    VoipSetting = mongoose.model('VoipSetting'),
    VoipProviderMaster = mongoose.model('VoipProviderMaster'),
    cdrProvider = require('../provider/index.cdr.provider'),
    Ticket = mongoose.model('Ticket'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    utils = require('../../core/resources/utils'),
    http = require('../../core/resources/http'),
    getFile = require('../../voip/resources/getfile'),
    enums = require('../../voip/resources/enums'),
    enumsTicket = require('../../ticket/resources/enums'),
    provider_data = require('../../ticket/providers/strategies/multimedia'),
    cache = require(path.resolve('./config/lib/redis.cache')),
    validate = require('../validator/voip.validator'),
    emitter = require(path.resolve('./config/lib/emitters/event.emitter')),
    moment = require('moment'),
    rbSender = require(path.resolve('./config/lib/emitters/sender.rabbitmq')),
    peopleController = require(path.resolve('./modules/people/controllers/people.user.controller')),
    socketIO = require(path.resolve('./config/lib/socket.io'));


/**
 * add voip
  * author : vupl
 */
exports.add = [(req, res, next) => {
    delete req.body.domain;
    
    var idOwner = utils.getParentUserId(req.user);

    var query = {
        ed_user_id: idOwner
    };
    
    cache.findOneWithCache(idOwner, 'user.setting.voip', VoipSetting, query, (err, result) => {
        if (err) {
            return next(err);
        }
        
        if (!result || result.enable_voip === false || utils.isEmpty(result.provider) || utils.isEmpty(result.provider_data.domain)) {
            return next(new TypeError("voip.voip_setting.is_not_active"));
        }
        
        if (req.body.caller.call_type === enums.VoipType.incoming_call || req.body.caller.call_type === enums.VoipType.incoming_missed_call) {
            req.body.caller.to = req.user._id.toString();
        } else {
            req.body.caller.from = req.user._id.toString();
        }
        
        req.body.provider = result.provider;
        req.body.domain = result.provider_data.domain;
        req.body.ed_user_id = idOwner;
        req.body.api_key = result.provider_data.api_key;
        req.body.api_secret = result.provider_data.api_secret;
        
        validate.validate_voip_add(req.body, req.user, next);
    });
}, (req, res, next) => {
    cache.findOneWithCache('voipProviderMaster', req.body.provider, VoipProviderMaster, { provider : req.body.provider }, (err, result) => {
        if (err) {
            return next(err);
        }
        
        req.body.provider_master = result.provider_data;
        
        next();
    });
},(req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var apiConfig = req.body.provider_master;
    // overwrite api key and api secret in provider master by settings
    apiConfig.api_key = req.body.api_key || apiConfig.api_key;
    apiConfig.api_secret = req.body.api_secret || apiConfig.api_secret;
    
    var voip = new Voip(req.body);
    voip.orig_call_id = voip.call_id.split(enums.Constants.id_delimiter)[0];

    var saveVoip = new Promise ((resolve, reject) => {
        voip.call_status = '';
        voip.call_tta = '';
        voip.call_start = '';
        voip.direction = '';
        // replace invalid characters
        voip.content.record_file = voip.call_id.replace(/:/g, '');
        voip.content.record_file = voip.content.record_file.replace(/@/g, '');
        voip.content.record_file = voip.content.record_file.replace(/\./g, '');
        voip.content.record_file = `${voip.content.record_file}.ogg`;
        
        voip.save((err) => {
            if (err) {
                return reject(err);
            }

            resolve(voip);
        });
    });
    
    var getCdrsFromVoipProvider = (data) => {
        return new Promise((resolve, reject) => {
            var cdr = cdrProvider.getProvider(data.provider).cdrRequest({
                api_key : apiConfig.api_key,
                api_secret : apiConfig.api_secret,
                domain_name : data.domain,
                call_id : data.orig_call_id
            });
            
            var params = {
                host : apiConfig.host,
                path : apiConfig.path.cdrs,
                method : 'POST',
                headers : {
                    'Content-Type' : 'application/json'
                },
                data : cdr,
                is_https: true
            };
            
            http(params, (err, result) => {
                resolve({ error : err, voip : data, result : result });
            });
        });
    };
    
    saveVoip.then((data) => {
        res.json(voip);
        return getCdrsFromVoipProvider(data);
    }).then((data) => {
        var error = data.error;
        var result = data.result;
        var voip = data.voip;
        
        if (error) {
            console.error(error);
        }
        
        var cdr = cdrProvider.getProvider(voip.provider).cdrResponse(result);
        
        if (cdr) {
            voip.call_status = enums.VoipStatus[apiConfig.voip_status[cdr.status]];
            voip.call_tta = cdr.tta;
            voip.call_start = cdr.start;
            voip.direction = cdr.direction;
            
            voip.save((serr) => {
                if (serr) {
                    console.error(serr);
                }
            });
            
            getFile(idOwner, voip, cdr);
        }
    }).catch((reason) => {
        return next(reason);
    });
}];

/**
 * update voip cdr
 */
exports.updateCdr = [(req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);

    var query = {
        ed_user_id: idOwner
    };
    
    cache.findOneWithCache(idOwner, 'user.setting.voip', VoipSetting, query, (err, result) => {
        if (err) {
            return next(err);
        }
        
        if (!result || result.enable_voip === false || utils.isEmpty(result.provider) || utils.isEmpty(result.provider_data.domain)) {
            return next(new TypeError("voip.voip_setting.is_not_active"));
        }
        
        req.body.provider = result.provider;
        req.body.domain = result.provider_data.domain;
        req.body.api_key = result.provider_data.api_key;
        req.body.api_secret = result.provider_data.api_secret;
        
        next();
    });
}, (req, res, next) => {
    cache.findOneWithCache('voipProviderMaster', req.body.provider, VoipProviderMaster, { provider : req.body.provider }, (err, result) => {
        if (err) {
            return next(err);
        }

        req.body.provider_master = result.provider_data;
        
        next();
    });
}, (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var historyId = req.body.history_id;
    var apiConfig = req.body.provider_master;
    // overwrite api key and api secret in provider master by settings
    apiConfig.api_key = req.body.api_key || apiConfig.api_key;
    apiConfig.api_secret = req.body.api_secret || apiConfig.api_secret;

    var findVoip = new Promise ((resolve, reject) => {
        var fields = {
            _id : 1,
            add_time : 1,
            call_status : 1,
            call_tta : 1,
            ticket_id : 1,
            call_id : 1,
            orig_call_id : 1,
            provider : 1,
            domain : 1,
            'content.duration' : 1,
            'caller.call_type' : 1,
            'caller.from' : 1,
            'caller.to' : 1,
            'content.record_file' : 1,
            'content.note' : 1,
            'phone_no.from' : 1,
            'phone_no.to' : 1
        };
        
        Voip.findOne({ ed_user_id : idOwner, _id : historyId }, fields, (err, voip) => {
            if (err) {
                return reject(err);
            }
            
            if (!voip) {
                return reject(new TypeError('voip.update.cdr_not_found'));
            }
            
            if (voip.call_status) {
                return reject(new TypeError('voip.update.cdr_status_existed'));
            }

            resolve(voip);
        });
    });
    
    var getCdrsFromVoipProvider = (voip) => {
        return new Promise((resolve, reject) => {
            var cdr = cdrProvider.getProvider(voip.provider).cdrRequest({
                api_key : apiConfig.api_key,
                api_secret : apiConfig.api_secret,
                domain_name : voip.domain,
                call_id : voip.orig_call_id
            });
            
            var params = {
                host : apiConfig.host,
                path : apiConfig.path.cdrs,
                method : 'POST',
                headers : {
                    'Content-Type' : 'application/json'
                },
                data : cdr,
                is_https: true
            };
            
            http(params, (err, result) => {
                if (err) {
                    return reject(err);
                }
                
                resolve({ voip : voip, result : result });
            });
        });
    };
    
    var updateVoip = (data) => {
        return new Promise ((resolve, reject) => {
            var voip = data.voip;
            var result = data.result;
            
            // replace invalid characters
            voip.content.record_file = voip.call_id.replace(/:/g, '');
            voip.content.record_file = voip.content.record_file.replace(/@/g, '');
            voip.content.record_file = voip.content.record_file.replace(/\./g, '');
            voip.content.record_file = `${voip.content.record_file}.ogg`;
            
            var cdr = cdrProvider.getProvider(voip.provider).cdrResponse(result);

            if (cdr) {
                voip.call_status = enums.VoipStatus[apiConfig.voip_status[cdr.status]];
                voip.call_tta = cdr.tta;
                voip.call_start = cdr.start;
                voip.direction = cdr.direction;
                
                getFile(idOwner, voip, cdr);
            } else {
                voip.call_status = '';
                voip.call_tta = '';
                voip.call_start = '';
                voip.direction = '';
            }
            
            voip.save((err) => {
                if (err) {
                    return reject(err);
                }

                resolve(data);
            });
        });
    };
    
    findVoip.then((voip) => {
        return getCdrsFromVoipProvider(voip);
    }).then((data) => {
        return updateVoip(data);
    }).then((data) => {
        res.json(data.voip);
    }).catch((reason) => {
        return next(reason);
    });
}];

/**
 * get Register Etx
 * @author: vupl
 */
exports.getRegisterExt = [(req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);

    var query = {
        ed_user_id: idOwner
    };
    
    cache.findOneWithCache(idOwner, 'user.setting.voip', VoipSetting, query, (err, result) => {
        if (err) {
            return next(err);
        }
        
        if (!result || result.enable_voip === false || utils.isEmpty(result.provider) || utils.isEmpty(result.provider_data.domain)) {
            return next(new TypeError("voip.voip_setting.is_not_active"));
        }
        
        req.body.provider = result.provider;
        req.body.domain = result.provider_data.domain;
        req.body.api_key = result.provider_data.api_key;
        req.body.api_secret = result.provider_data.api_secret;
        
        next();
    });
}, (req, res, next) => {
    cache.findOneWithCache('voipProviderMaster', req.body.provider, VoipProviderMaster, { provider : req.body.provider }, (err, result) => {
        if (err) {
            return next(err);
        }
        
        req.body.provider_master = result.provider_data;
        
        next();
    });
}, (req, res, next) => {
    var provider = req.body.provider;
    var domain = req.body.domain;
    var apiConfig = req.body.provider_master;
    // overwrite api key and api secret in provider master by settings
    apiConfig.api_key = req.body.api_key || apiConfig.api_key;
    apiConfig.api_secret = req.body.api_secret || apiConfig.api_secret;
    
    var cdr = cdrProvider.getProvider(provider).cdrRequest(provider, {
        api_key : apiConfig.api_key,
        api_secret : apiConfig.api_secret,
        domain_name : domain
    });
    
    var params = {
        host : apiConfig.host,
        path : apiConfig.path.exts,
        method : 'POST',
        headers : {
            'Content-Type' : 'application/json'
        },
        data : cdr,
        is_https: true
    };
    
    http(params, (err, result) => {
        var res_data = [];
        
        var registrations = cdrProvider.getProvider(provider).cdrResponseExts(result);
        
        if (err || !registrations) {
            console.error(new TypeError(err));
            return res.json(res_data);
        }
        
        var data = registrations.map((e) => {
            return e.user.substring(0, e.user.indexOf("@"));
        }).forEach((e) => {
            if (res_data.indexOf(e) === -1) {
                res_data.push(e);
            }
        });
        
        res.json(res_data);
    });
}];

/**
 * find voip hist by id
 * author: vupl
 */
exports.findById = (voip_hist_id, next) => {
    Voip.findById(voip_hist_id).exec((err, result) => {
        if (err) {
            return next(err);
        }
        
        return next(null, result);
    });
};

/**
 * convert voip to ticket
 * @author: vupl
 */
exports.convertVoipToTicket = [
    (req, res, next) => {
        validate.validate_voip_convert_ticket(req.body, req.user, next);
    },
    (req, res, next) => {
    var data = {
        ticket_id : req.body.ticket_id,
        ed_user_id: utils.getParentUserId(req.user),
        submitter_id: req.user._id,
        subject: req.body.subject,
        agent_id: req.body.agent_id,
        group_id: req.body.group_id ? req.body.group_id : undefined,
        organization: req.body.organization ? req.body.organization : undefined,
        requester_id: req.body.requester_id,
        provider: enumsTicket.Provider.voip,
        provider_data: provider_data.voip(req.body),
        comment: {
            user_id: req.body.user_id,
            provider: enumsTicket.Provider.voip,
            provider_data: provider_data.voip(req.body),
            content: req.body.comment.content,
            attachments : req.body.comment.attachments
        },
        comment_time: +moment.utc(),
        status: req.body.status,
        fields : req.body.fields,
        macro_id: req.body.macro_id
    };
    
    emitter.emit('evt.ticket.convertVoipToTicket',data, req.user, null, (err, result) => {
        if (err) {
            return next(errTicket);
        }
        emitter.emit('evt.voip.update.history', result, req.body.call_id);
        res.json(result);
    });
}];

/**
 *  update voip missed call
 */
exports.updateMissedCall = [(req, res, next) => {
    var domain = req.body.domain || '';
    var password = req.body.password || '';
    
    var query = {
        'provider_data.domain' : domain,
        'provider_data.password' : password
    };
    
    cache.findOneWithCache(domain, password, VoipSetting, query, (err, result) => {
        if (err) {
            return next(err);
        }
        
        if (!result || result.enable_voip === false || utils.isEmpty(result.provider) || utils.isEmpty(result.provider_data.domain)) {
            return next(new TypeError("voip.voip_setting.is_not_active"));
        }
        
        req.body.phone_no = {
            from : req.body.phone_no_from
        };
        req.body.provider = result.provider;
        req.body.ed_user_id = result.ed_user_id;
        req.body.api_key = result.provider_data.api_key;
        req.body.api_secret = result.provider_data.api_secret;
        
        validate.validate_voip_update_missed_call(req.body, next);
    });
}, (req, res, next) => {
    var task1 = new Promise((resolve, reject) => {
        cache.findOneWithCache('voipProviderMaster', req.body.provider, VoipProviderMaster, { provider : req.body.provider }, (err, result) => {
            if (err) {
                return reject(err);
            }
            
            resolve(result.provider_data);
        });  
    });
    
    var task2 = new Promise((resolve, reject) => {
        User.findById(req.body.ed_user_id, (error, user) => {
            if (error) {
                return reject(error);
            }
            
            resolve(user);
        });
    });
    
    Promise.all([task1, task2]).then(results => {
        req.body.provider_master = results[0];
        req.user = results[1];
        
        next();
    }).catch(ex => {
        next(ex);
    });
},(req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var apiConfig = req.body.provider_master;
    // overwrite api key and api secret in provider master by settings
    apiConfig.api_key = req.body.api_key || apiConfig.api_key;
    apiConfig.api_secret = req.body.api_secret || apiConfig.api_secret;
    
    var getRequester = new Promise((resolve, reject) => {
        peopleController.findOrAdd_internal({
            req_user : req.user,
            idOwner : idOwner,
            value : req.body.phone_no.from,
            provider : 'voip',
            type : 'phone'
        }, (err, requester) => {
            if (err) {
                return reject(err);
            }
            
            resolve(requester);
        });
    });
    
    var saveVoip = (requester) => {
        return new Promise ((resolve, reject) => {
            req.body.caller = {
                call_type : enums.VoipType.incoming_missed_call,
                from : requester._id
            };
            
            var voip = new Voip(req.body);

            voip.orig_call_id = voip.call_id.split(enums.Constants.id_delimiter)[0];
            voip.call_status = '';
            voip.call_tta = '';
            voip.call_start = '';
            voip.direction = '';
            // replace invalid characters
            voip.content.record_file = voip.call_id.replace(/:/g, '');
            voip.content.record_file = voip.content.record_file.replace(/@/g, '');
            voip.content.record_file = voip.content.record_file.replace(/\./g, '');
            voip.content.record_file = `${voip.content.record_file}.ogg`;
            
            voip.save((err) => {
                if (err) {
                    return reject(err);
                }
    
                resolve(voip);
            });
        });
    };
    
    var getCdrsFromVoipProvider = (data) => {
        return new Promise((resolve, reject) => {
            var cdr = cdrProvider.getProvider(data.provider).cdrRequest({
                api_key : apiConfig.api_key,
                api_secret : apiConfig.api_secret,
                domain_name : data.domain,
                call_id : data.orig_call_id
            });
            
            var params = {
                host : apiConfig.host,
                path : apiConfig.path.cdrs,
                method : 'POST',
                headers : {
                    'Content-Type' : 'application/json'
                },
                data : cdr,
                is_https: true
            };
            
            http(params, (err, result) => {
                resolve({ error : err, voip : data, result : result });
            });
        });
    };
    
    getRequester.then((requester) => {
        return saveVoip(requester);
    }).then((voip) => {
        res.json(voip);
        return getCdrsFromVoipProvider(voip);
    }).then((data) => {
        var error = data.error;
        var result = data.result;
        var voip = data.voip;
        
        if (error) {
            console.error(error);
        }
        
        var cdr = cdrProvider.getProvider(voip.provider).cdrResponse(result);
        
        if (cdr) {
            voip.call_status = enums.VoipStatus[apiConfig.voip_status[cdr.status]];
            voip.call_tta = cdr.tta;
            voip.call_start = cdr.start;
            voip.direction = cdr.direction;
            
            voip.save((serr) => {
                if (serr) {
                    console.error(serr);
                }
            });
            
//            getFile(idOwner, voip, cdr);
        }
    }).catch((reason) => {
        console.log(reason);
        return next(reason);
    });
}];

exports.softphoneApi = [(req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);

    var query = {
        ed_user_id: idOwner
    };

    cache.findOneWithCache(idOwner, 'user.setting.voip', VoipSetting, query, (err, result) => {
        if (err) {
            return next(err);
        }

        if (!result || result.enable_voip === false || utils.isEmpty(result.provider) || utils.isEmpty(result.provider_data.domain)) {
            return next(new TypeError("voip.voip_setting.is_not_active"));
        }

        req.body.voip_setting = {
            provider : result.provider,
            provider_data : result.provider_data
        };

        next();
    });
}, (req, res, next) => {
    cache.findOneWithCache('voipProviderMaster', req.body.provider, VoipProviderMaster, { provider : req.body.provider }, (err, result) => {
        if (err) {
            return next(err);
        }

        if (!result) {
            return next(new TypeError("voip.provider.master.not.found"));
        }

        req.body.voip_setting.provider_master = result.provider_data;

        next();
    });
}, (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    var userId = req.user._id;

    console.log(req.body || req.query);
    
    var voipSetting = req.body.voip_setting;

    // soft phone URL retrieved from VOIP setting or configuration
    var softphoneUrl = voipSetting.provider_data.sp_url || voipSetting.provider_master.provider_data.sp_url;
    var softphoneToken = voipSetting.provider_data.sp_token || voipSetting.provider_master.provider_data.sp_token;
    var softphoneDomain = voipSetting.provider_data.domain;

    var postData = {
        topic : req.body.topic,
        payload : req.body.payload
    };

    postData.payload.token = softphoneToken; // add additional data
    postData.payload.domain = softphoneDomain; // add additional data
    postData.payload.ed_user_id = idOwner; // add additional data
    postData.payload.user_id = userId; // add additional data

    var spUrl = null;
    try {
        spUrl = URL.parse(softphoneUrl);

        if (!spUrl.protocol) {
            throw new TypeError(`Invalid URL`);
        }
    } catch(ex) {
        return next(ex);
    }

    var params = {
        host : spUrl.host,
        path : spUrl.path,
        method : 'POST',
        headers : {
            'Content-Type' : 'application/json'
        },
        data : postData,
        is_http : spUrl.protocol === 'https:'
    };

    http(params, (err, result) => {
        if (err) {
            return next(err);
        }
        
        res.json({
            status_code : 200,
            result : result
        });
    });
}];

exports.softphone = [(req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    
    var data = req.body || { topic : '', payload : {}};
    
    console.log(data);
    
    var topic = data.topic;
    var payload = data.payload || {};
    
    if (data.topic === 'outAccepted' || data.topic === 'inRing') {
        if (!payload.call_id || !payload.ext || !payload.number) {
//            return next(new Error('invalid payload'));
            return res.json({
                status_code: 200,
                result : {
                    status : false,
                    data : payload
                }
            });
        }
    }
    
    
    socketIO.emit('/core', idOwner, {
        topic : 'izi-core-client-voip-softphone',
        payload : data
    });
    
    return res.json({
        status_code: 200,
        result : {
            status : true,
            data : payload
        }
    });
}];
