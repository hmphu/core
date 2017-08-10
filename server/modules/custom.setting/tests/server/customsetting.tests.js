'use strict';

var should = require('should'),
    request = require('supertest'),
    path = require('path');

/**
 * Globals
 */
var agent, credentials, trg, credentials_agent;

/**
 * Organization routes tests
 */
describe('Custom setting CRUD tests', function () {

    before(function (done) {
        // Create user credentials
        credentials = {
            sub_domain: 'robo',
            email: 'maynt@fireflyinnov.com',
            password: 'May12345'
        };
        credentials_agent={
            sub_domain: 'robo',
            email: 'chauthanhtho2000@gmail.com',
            password: 'tvy1eSfEZtBuEsRGjZdr3'
        };
        agent = request.agent(`http://${credentials.sub_domain}.infirefly.com:6969/api/`);
        done();
    });

    beforeEach(function (done) {
        done();
    });
    //TH1: Tạo custom ticket field không thành công với dữ liệu là khoảng trắng
     it('1.Tạo custom ticket field không thành công với dữ liệu là khoảng trắng', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'',
                    type:'',
                    field_key:'',
                    description:'',
                    agent_id:''
                };
                 agent.post(`custom-settings/ticket`)
                .send(data)
                .expect(400)
                .end(function (err, cus) {
                   //  console.log(cus.body);
                     should.equal(cus.body.errors.name,'custom.setting.name.required');
                     should.equal(cus.body.errors.field_key,'custom.setting.field_key.required');
                     should.equal(cus.body.errors.type,'custom.setting.type.required');
                     done();

                });

         });
    });
    //TH2: Tạo custom requester field không thành công với type: dropdown và tag là khoảng trắng
     it('2.Tạo custom requester field không thành công với type: dropdown và tag là khoảng trắng', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'abcxyz',
                    type:0,
                    field_key:'zyxcba',
                    description:'xxxxx',
                    agent_id:'sgfbaskfgsahkfjsbafs',
                    default_value:[{key:'',value:'hh'},{key:'',value:'hh'}]
                };
                 agent.post(`custom-settings/requester`)
                .send(data)
                .expect(400)
                .end(function (err, cus) {
                    // console.log(cus.body);
                     should.equal(cus.body.errors.default_value,'custom.setting.default_value.tag.empty');
                     done();

                });

         });
    });
    //TH3: Tạo custom organization field không thành công với type: dropdown và title là khoảng trắng
     it('3.Tạo custom organization field không thành công với type: dropdown và title là khoảng trắng', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'abcxyz',
                    type:0,
                    field_key:'zyxcbaz',
                    description:'xxxxx',
                    agent_id:'sgfbaskfgsahkfjsbafs',
                    default_value:[{key:'hh',value:''},{key:'hh',value:''}]
                };
                 agent.post(`custom-settings/organization`)
                .send(data)
                .expect(400)
                .end(function (err, cus) {
                   //  console.log(cus.body);
                     should.equal(cus.body.errors.default_value,'custom.setting.default_value.title.empty');
                     done();

                });

         });
    });
 //TH4: Tạo custom requester field không thành công với dữ liệu sai
     it('4.Tạo custom requester field không thành công với dữ liệu sai', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh',
                    type:200,
                    field_key:'một hai ba'
                };
                 agent.post(`custom-settings/requester`)
                .send(data)
                .expect(400)
                .end(function (err, cus) {
                   //  console.log(cus.body);
                     should.equal(cus.body.errors.name,'custom.setting.name.maximum_length');
                     should.equal(cus.body.errors.field_key,'khong co khoang cach');
                     should.equal(cus.body.errors.type,'custom.setting.type.inclusion');
                     done();
                });

         });
    });
 //TH5: Tạo custom ticket field không thành công với agent_id sai
     it('5.Tạo custom ticket field không thành công với agent_id là requester', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'Agent_id sai',
                    type:2,
                    field_key:'mothaibabonnam',
                    description:'tạo ticket field với agent id là requester',
                    agent_id:'56cff80987025f82046a6632'
                };
                 agent.post(`custom-settings/ticket`)
                .send(data)
                .expect(400)
                .end(function (err, cus) {
                    // console.log(cus.body);
                     should.equal(cus.body.errors.agent_id,'agent_id role là requester');
                     done();
                });

         });
    });
     //TH6: Tạo custom ticket field không thành công với agent_id sai
     it('6.Tạo custom ticket field không thành công với agent_id sai', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'Agent_id sai',
                    type:3,
                    field_key:'mothaibabonnamsaubay',
                    description:'tạo ticket field với agent id sai',
                    agent_id:'56cff80987025f8204600000'
                };
                 agent.post(`custom-settings/ticket`)
                .send(data)
                .expect(400)
                .end(function (err, cus) {
                    // console.log(cus.body);
                     should.equal(cus.body.errors.agent_id,'agent_id sai');
                     done();
                });

         });
    });
    //TH7: Tạo custom organization field không thành công với dữ liệu là agent_id
     it('7.Tạo mới custom organization field không thành công với dữ liệu là agent_id', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'custom organization field',
                    type:1,
                    field_key:'Text',
                    description:'organization field type:Text',
                    agent_id:'56d3bd9158b7923b7749a611'
                };
                 agent.post(`custom-settings/organization`)
                .send(data)
                .expect(200)
                .end(function (err, cus) {
                   //  console.log(cus.body);
                     should.notEqual(cus.body.agent_id,data.agent_id);
                     done();
                });

         });
    });
    //TH8: Tạo custom field không thành công với dữ liệu đã tồn tại
     it('8.Tạo mới custom field không thành công với field_key và position đã tồn tại', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'custom field mẫu',
                    type:0,
                    field_key:'mau',
                    description:'ticket field dropdown',
                    position:999999999,
                    agent_id:'56cef77022c1ba61610f7c93',
                    default_value:[{key:'abc',value:'12'},{key:'abcd',value:'123'},{key:'abcde',value:'1234'}]
                };
                 agent.post(`custom-settings/ticket`)
                .send(data)
                .expect(200)
                .end(function (err, cus) {
                   //  console.log(cus.body);
                     should.equal(cus.body.errors.ed_user_id_1_field_key,'common.unique');
                     should.equal(cus.body.errors.position,'common.unique');
                     done();
                });

         });
    });
    //TH9: Tạo custom field ticket không thành công với dữ liệu đã tồn tại
     it('9.Tạo mới custom field ticket không thành công với type:dropdown và có key trùng nhau', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'custom field ticket nononono',
                    type:0,
                    field_key:'maunono',
                    description:'ticket field dropdown',
                    agent_id:'56cef77022c1ba61610f7c93',
                    default_value:[{key:'abc',value:'12'},{key:'abc',value:'123'},{key:'abc',value:'1234'}]
                };
                 agent.post(`custom-settings/ticket`)
                .send(data)
                .expect(200)
                .end(function (err, cus) {
                    // console.log(cus.body);
                     should.equal(cus.body.errors.default_value.key,'không được trùng nhau');
                     done();
                });

         });
    });
    //TH10: Tạo custom field không thành công với dữ liệu sai
     it('10.Tạo mới custom field không thành công với type:text và có default_value', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'custom field requester',
                    type:1,
                    field_key:'mau123',
                    description:'ticket field dropdown',
                    default_value:[{key:'abc1',value:'12'},{key:'abc2',value:'123'},{key:'abc3',value:'1234'}]
                };
                 agent.post(`custom-settings/requester`)
                .send(data)
                .expect(200)
                .end(function (err, cus) {
                   //  console.log(cus.body);
                     should.notEqualqual(cus.body.default_value[0].key,data.default_value[0].key);
                     agent.delete(`custom-settings/requester/`+cus.body._id)
                     .expect(200)
                     .end(function (err,dele) {
                     done();
                     });
                });

         });
    });
    //TH11: Tạo custom field không thành công với dữ liệu sai
     it('11.Tạo mới custom field không thành công với type:dropdown và không có default_value', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'custom field requester',
                    type:0,
                    field_key:'dropdown100',
                    description:'ticket field dropdown'
                };
                 agent.post(`custom-settings/requester`)
                .send(data)
                .expect(400)
                .end(function (err, cus) {
                   //  console.log(cus.body);
                     should.equal(cus.body.errors.default_value,'Default value custom.setting.default_value.required');
                     done();
                });

         });
    });

    //TH12: Tạo custom ticket field không thành công với dữ liệu là agent_id và group_id
     it('12.Tạo mới custom ticket field với dữ liệu là agent_id và group_id', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'ticket field agent and group',
                    type:1,
                    field_key:'Text123',
                    description:'ticket field type:Text',
                    agent_id:'56d3bd9158b7923b7749a611',
                    group_id:'56cef3ea22c1ba61610f7c8e'
                };
                 agent.post(`custom-settings/ticket`)
                .send(data)
                .expect(200)
                .end(function (err, cus) {
                     console.log(cus.body);
                     should.notEqual(cus.body.agent_id,data.agent_id);//ko lưu agent_id
                     done();
                });

         });
    });

    //TH13: Tạo custom field thành công với dữ liệu đúng
     it('13.Tạo mới custom field thành công với type:Checkbox', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'custom field organization',
                    type:5,
                    field_key:'checkbox100',
                    description:'ticket field dropdown'
                };
                 agent.post(`custom-settings/organization`)
                .send(data)
                .expect(200)
                .end(function (err, cus) {
                    // console.log(cus.body);
                     should.equal(cus.body.name,data.name);
                     console.log(cus.body.default_value);
                     should.equal(cus.body.default_value,[]);
                     agent.delete(`custom-settings/organization/`+cus.body._id)
                     .expect(200)
                     .end(function (err, cus){
                     done();
                     });
                });

         });
    });

    //TH14: Tạo custom ticket field thành công
     it('14.Tạo mới custom ticket field thành công với type là dropdown //mess sau khi xóa group', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'custom ticket',
                    type:0,
                    field_key:'mottram',
                    description:'ticket field dropdown',
                    agent_id:'56cef77022c1ba61610f7c93',
                    default_value:[{key:'abc',value:'12'},{key:'abcd',value:'123'},{key:'abcde',value:'1234'}]
                };
                 agent.post(`custom-settings/ticket`)
                .send(data)
                .expect(200)
                .end(function (err, cus) {
                    // console.log(cus.body);
                     should.equal(cus.body.name,data.name);
                     should.equal(cus.body.field_key,data.field_key);
                     should.equal(cus.body.type,data.type);
                     should.equal(cus.body.agent_id,data.agent_id);
                     should.equal(cus.body.default_value[0].key,data.default_value[0].key);
                     should.equal(cus.body.default_value[1].key,data.default_value[1].key);
                     should.equal(cus.body.default_value[2].key,data.default_value[2].key);
                     should.equal(cus.body.default_value[0].value,data.default_value[0].value);
                     should.equal(cus.body.default_value[1].value,data.default_value[1].value);
                     should.equal(cus.body.default_value[2].value,data.default_value[2].value);
                     should.equal(cus.body.is_active,true);
                     should.equal(cus.body.description,data.description);
                     agent.delete(`custom-settings/ticket/`+cus.body._id)
                     .expect(200)
                     .end(function (err,dele){
                       //  console.log(dele.body);
                     done();
                     });
                });

         });
    });
//TH15: Sửa field_key và type custom ticket field không thành công
     it('15.sửa ticket field không thành công với các trường hợp không cho phép', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    field_key:'1234',
                    type:'3',
                    add_time:1549826574326,
                    upd_time:2146587354397,
                    custom_type:2
                };
                 agent.put(`custom-settings/ticket/56dd3075b8a2701d40f27bc2`)
                .send(data)
                .expect(200)
                .end(function (err, cus) {
                   //  console.log(cus.body);
                     should.notEqual(cus.body.field_key,data.field_key);
                     should.notEqual(cus.body.type,data.type);
                     should.notEqual(cus.body.add_time,data.add_time);
                     should.notEqual(cus.body.upd_time,data.upd_time);
                     should.notEqual(cus.body.custom_type,data.custom_type);
                     done();

                });

         });
    });
   //TH16: Sửa  custom ticket field thành công
     it('16.sửa custom field của ticket field với dữ liệu cho phép ', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'custom field fix',
                    description:'ticket field đã được chỉnh sửa',
                    agent_id:'56cef77022c1ba61610f7c93',
                    position:1,
                    is_active:true,
                    default_value:[{
                        key:'may',
                        value:'meo'},{
                        key:'meo',
                        value:'may'}]
                };
                 agent.put(`custom-settings/ticket/56dd3075b8a2701d40f27bc2`)
                .send(data)
                .expect(200)
                .end(function (err, cus) {
                   //  console.log(cus.body);
                     should.equal(cus.body.name,data.name);
                     should.equal(cus.body.description,data.description);
                     should.equal(cus.body.agent_id,data.agent_id);
                     should.equal(cus.body.position,data.position);
                     should.equal(cus.body.is_active,data.is_active);
                     should.equal(cus.body.default_value[0].key,data.default_value[0].key);
                     should.equal(cus.body.default_value[0].value,data.default_value[0].value);
                     should.equal(cus.body.default_value[1].key,data.default_value[1].key);
                     should.equal(cus.body.default_value[1].value,data.default_value[1].value);
                     done();

                });

         });
    });
        afterEach(function (done) {
           //agent.delete(`people/groups/`+group.body._id)
        done();
    });
});
