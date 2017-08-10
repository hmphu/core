'use strict';

var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    CustomSetting =mongoose.model('CustomSetting'),
    Org = mongoose.model('Organization'),
    utils = require('../resources/utils'),
    enumsCustomSetting = require('../../custom.setting/resources/enums.res'),
    client = require(path.resolve('./config/lib/elasticsearch'));

var getCustomField = (ed_user_id, data, provider) =>{
    return new Promise((resolve, reject) =>{
        var field = {},
            field_keys = _.keys((data || {}));
        if(field_keys.length == 0 ){
           return resolve();
        }
        var query = {
            ed_user_id: ed_user_id,
            provider: provider,
            field_key : {$in : field_keys}
        };
        CustomSetting.find(query, (err, result) =>{
            if(err){
                return resolve();
            }
            if(result.length == 0){
                return resolve();
            }
            _.forEach(result, (item) =>{
                if(_.indexOf(field_keys, item.field_key) != -1){
                    field[`${item._id}`] = {
                        field_key : item.field_key,
                        cs_type: item.cs_type,
                        value: data[`${item.field_key}`]
                    }
                }
            });
            return resolve(field);
        });
    });
};

var runUpdate = (data) =>{
    var query = {
        _id: mongoose.Types.ObjectId(data.o2._id)
    };
    runOrg(query, (err, result) =>{
        if(err){
            console.error(err, 'update user to elastics error');
            return;
        }
        if(!result){
            return;
        }
        if(!result.ed_user_id == undefined){
            return;
        }
        var update_org_id = {
            index: `ticket-${result.ed_user_id}`,
            body: {
                "query": {
                    "term": {
                        "org_id._id" : `${result._id}`
                    }
                },
                "script": {
                    "inline" : `ctx._source.org_id = params.org_id`,
                    "params": {
                        org_id: {
                            "name": result.name,
                            "_id": result._id,
                            "field": result.fields
                        }
                    },
                    "lang": "painless"
                }
            }
        };
        utils.sendUpdateByQuery(update_org_id);
        return;
    });
}

var runOrg = (query, handler) =>{
    var number_org = 0;
    Org.count(query, (err_count, result_count) =>{
        if(err_count){
            console.error(err_count, "err count org");
        }
        number_org = result_count ? result_count : 0;
    });

    var stage = [],
        stage1 = {
            $match: query
        },
        stage2 = {
            $project: {
                "add_time": 1,
                "details": 1,
                "domains": 1,
                "ed_user_id": 1,
                "fields": 1,
                "name": 1,
                "notes": 1,
                "support_group": 1,
                "upd_time": 1
            }
        };
    stage = [stage1, stage2];
    var cursor = Org.aggregate(stage).limit(2001).cursor({ batchSize : 1000 }).exec();
    var array_org = [],
        total_org = 0,
        count = 0,
        total_org_undefined = 0;
    cursor.each((error, doc) =>{
        if(error){
            if(handler){
                return handler(error);
            }
            console.error(error, 'Org aggregate error');
            return;
        }
        if(doc == null){
            if(handler){
                return handler(null, doc);
            }
            return;
        }
        Promise.all([getCustomField(doc.ed_user_id, doc.fields, enumsCustomSetting.Provider.org)]).then(result =>{
            if(doc.ed_user_id != undefined){
                doc.fields = result[0];
                if(handler){
                    return handler(null, doc);
                }
                var data = {
                    create: {
                        _index: `profile-${doc.ed_user_id}`,
                        _type: 'org',
                        _id: doc._id
                    }
                };
                array_org.push(data);
                delete doc._id;
                array_org.push(doc);
                count++;
                total_org++;
            } else {
                if(handler){
                    return handler(null, null);
                }
                total_org_undefined++;
                console.log("org undefined", JSON.stringify(doc));
            }
            if(count == 5000){
                console.log("count send", count);
                console.log("count send", total_org);
                utils.sendElastics(array_org);
                count = 0;
                array_org = [];
            } else {
                let total = total_org + total_org_undefined;
                if(total == number_org){
                    utils.sendElastics(array_org);
                    console.log("count send", count);
                    console.log("count send", total_org);
                    console.log("count org undefined", total_org_undefined);
                    console.log("finish");
                }
            }
        }).catch(err =>{
            console.error(err, "error promise org");
        })
    });
};

exports.execOrg = (req, res, next) =>{
    var params = {
        query: {}
    };
    runOrg(params.query);
    res.json({})
};

exports.syncElasticOrg = (data) =>{
    if(data.op == 'i'){
        var query = {
            _id: mongoose.Types.ObjectId(data.o._id)
        }
        runOrg(query, (err, result) =>{
            if(err){
                console.error(err, 'sync insert org elastic error');
                return;
            }
            if(!result){
                return;
            }
            var insert_elastic = {
                index: `profile-${result.ed_user_id}`,
                type: 'org',
                id: `${result._id}`
            };
            delete result._id;
            insert_elastic.body = result;
            utils.sendCreated(insert_elastic);
            return;
        });
    } else if(data.op == 'u'){
        var query = {
            _id: mongoose.Types.ObjectId(data.o2._id)
        };
        var data_update = (data.o['$set'] || {});
        if(data_update['name'] || data_update['fields']){
            runUpdate(data);
        }
        runOrg(query, (err, result) =>{
            if(err){
                console.error(err, 'sync update org elastic error');
                return;
            }
            if(!result){
                return;
            }
            var update_elastic = {
                index: `profile-${result.ed_user_id}`,
                type: 'org',
                id: `${result._id}`
            };
            delete result._id;
            update_elastic.body = {
                doc: result
            };
            update_elastic.retryOnConflict = 2;
            utils.sendUpdated(update_elastic);
            return;
        });
    } else {
        var delete_elastic = {
            index: `profile-index`,
            type: 'org',
            id: `${data.o._id}`
        };
        utils.sendDelete(delete_elastic);
        return;
    }
}
