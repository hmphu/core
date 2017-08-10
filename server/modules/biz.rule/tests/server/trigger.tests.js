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
describe('Trigger CRUD tests', function () {

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
    //TH1: Tạo trigger thành công chỉ với all_conditionals
     it('1.Tạo mới trigger thành công chỉ với all_conditionals', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'trigger only all',
                    all_conditions:[{
                        field_key:'channel',
                        operator: 'is',
                        values: 'Facebook wall'
                    },{condition:'Trạng thái là Open',
                        field_key:'status',
                        operator: 'is_not',
                        values: 'Open'}],
                    actions:[{
                        attribute:'email_user',
                        values:'56cc267a10af949b27d5e734',
                        additional_field:{
                            subject:'Gửi mail cho agent',
                            body:'action automation gửi mail cho agent'
                        }
                    }]
                };
                 agent.post(`triggers`)
                .send(data)
                .expect(200)
                .end(function (err, trg) {
                     console.log(trg.body);
                     should.equal(trg.body.name,data.name);
                     should.equal(trg.body.all_conditions[0].field_key,data.all_conditions[0].field_key);
                     should.equal(trg.body.all_conditions[1].field_key,data.all_conditions[1].field_key);
                     should.equal(trg.body.actions[0].attribute,data.actions[0].attribute);
//                     agent.delete(`triggers/`+trg.body._id)
//                     .expect(200)
//                     .end(function (err,dele){
                       //  console.log(dele.body);
                     done();
                    // });
                });

         });
    });
    //TH2: Tạo trigger chỉ với any_conditionals
     it('2.Tạo mới trigger thành công chỉ với any_conditionals', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'trigger only any',
                    any_conditions:[{
                        field_key:'hours_since_solved',
                        operator: 'calendar_is',
                        values: '2'
                    },{ field_key:'hours_since_closed',
                        operator: 'biz_is',
                        values: '3'}],
                    actions:[{
                        attribute:'email_user',
                        values:'56cc267a10af949b27d5e734',
                        additional_field:{
                            subject:'Gửi mail cho agent',
                            body:'action automation gửi mail cho agent'
                        }
                    },{
                        attribute:'group',
                        values:'56cc267a10af949b27d5e734'
                        }]
                };
                 agent.post(`triggers`)
                .send(data)
                .expect(200)
                .end(function (err, trg) {
                   //  console.log(trg.body);
                     should.equal(trg.body.name,data.name);
                     should.equal(trg.body.any_conditions[0].condition,data.any_conditions[0].condition);
                     should.equal(trg.body.any_conditions[1].condition,data.any_conditions[1].condition);
                     should.equal(trg.body.actions[0].attribute,data.actions[0].attribute);
                     should.equal(trg.body.actions[1].attribute,data.actions[1].attribute);
//                     agent.delete(`triggers/`+trg.body._id)
//                     .expect(200)
//                     .end(function (err,dele){
                       //  console.log(dele.body);
                     done();
                    // });
                });

         });
    });
    //TH3: Tạo trigger với any_conditionals và all_conditionals
     it('3.Tạo mới trigger thành công với any_conditionals và all_conditionals////thieu email requester,ccers', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'Trigger all and any',
                    any_conditions:[{
                        field_key:'type',
                        operator: 'is_not',
                        values: '0'
                    },{ field_key:'status',
                        operator: 'is',
                        values: '1'
                    },{ field_key:'status',
                        operator: 'is',
                        values: '1'
                    },{ field_key:'hours_since_assigned',
                        operator: 'biz_is',
                        values: '1'
                    },{ field_key:'hours_since_update',
                        operator: 'biz_less_than',
                        values: '2'
                    },{ field_key:'hours_since_requester_update',
                        operator: 'biz_greater_than',
                        values: '3'
                    },{ field_key:'hours_since_agent_update',
                        operator: 'calendar_is',
                        values: '4'
                    },{ field_key:'minutes_since_duedate',
                        operator: 'calendar_less_than',
                        values: '1'
                    }],
                    all_conditions:[{
                        field_key:'minutes_until_duedate',
                        operator: 'calendar_greater_than',
                        values: '2'
                    },{ field_key:'hours_since_last_sla',
                        operator: 'calendar_less_than',
                        values: '3'
                    },{ field_key:'priority',
                        operator: 'is_not',
                        values: '1'
                    },{ field_key:'agent',
                        operator: 'is',
                        values: 'dfskajfbasdhbagjfbs'
                    },{ field_key:'requester',
                        operator: 'is',
                        values: '1jgkhdlgdfg'
                    },{ field_key:'org',
                        operator: 'is_not',
                        values: '1hgdfhfgjfdj'
                    },{ field_key:'tag',
                        operator: 'not_include',
                        values: '1'
                    },{ field_key:'received_at',
                        operator: 'is',
                        values: 'fgsjdagjsag'
                    },{ field_key:'hours_since_new',
                        operator: 'calendar_greater_than',
                        values: '1'
                    },{ field_key:'hours_since_open',
                        operator: 'biz_less_than',
                        values: '2'
                    },{ field_key:'hours_since_pending',
                        operator: 'biz_greater_than',
                        values: '3'
                    },{ field_key:'hours_since_onhold',
                        operator: 'biz_is',
                        values: '1'
                    },{ field_key:'des',
                        operator: 'include',
                        values: '21'
                    }],
                    actions:[{
                        attribute:'email_user',
                        values:'56cc267a10af949b27d5e734',
                        additional_field:{
                            subject:'Gửi mail cho agent',
                            body:'action automation gửi mail cho agent'
                        }
                    },{
                        attribute:'email_group',
                        values:'56cef3ea22c1ba61610f7c8e',
                        additional_field:{
                            subject:'Gửi mail cho group',
                            body:'action automation gửi mail cho group'
                        }
                    },{
                        attribute:'status',
                        values:'3'
                    },{
                        attribute:'type',
                        values:'2'
                    },{
                        attribute:'priority',
                        values:'0'
                    },{
                        attribute:'group',
                        values:'56cef3ea22c1ba61610f7c8e'
                    },{
                        attribute:'agent',
                        values:'56d3bd9158b7923b7749a611'
                    },{
                        attribute:'set_tag',
                        values:'abc'
                    },{
                        attribute:'add_tag',
                        values:'123'
                    },{
                        attribute:'remove_tag',
                        values:'321'
                    },{
                        attribute:'add_cc',
                        values:'56d3bd9158b7923b7749a611'
                    }]
                };
                 agent.post(`triggers`)
                .send(data)
                .expect(200)
                .end(function (err, trg) {
                    // console.log(trg.body);
                     should.equal(trg.body.name,data.name);
                     should.equal(trg.body.all_conditions[0].condition,data.all_conditions[0].condition);
                     should.equal(trg.body.all_conditions[1].condition,data.all_conditions[1].condition);
                     should.equal(trg.body.actions[0].attribute,data.actions[0].attribute);
//                     agent.delete(`triggers/`+trg.body._id)
//                     .expect(200)
//                     .end(function (err,dele){
//                       //  console.log(dele.body);
                     done();
                    // });
                });

         });
    });
  //TH4: Tạo trigger không chọn action: notification nhưng có additional_field
     it('4.Tạo trigger không chọn action: notification nhưng có additional_field', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'Trigger no noti, co add_field',
                    all_conditions:[{
                        condition:'Kênh là FB Wall',
                        field_key:'channel',
                        operator: 'is',
                        values: 'Facebook wall'
                    },{condition:'Trạng thái là Open',
                        field_key:'status',
                        operator: 'is',
                        values: 'Open'}],
                    position:0,
                    actions:[{
                        attribute:'priority',
                        field_key:'is',
                        values:'normal',
                        additional_field:"123"
                    }]
                };

                 agent.post(`triggers`)
                .send(data)
                .expect(200)
                .end(function (err, trg) {
                  //   console.log(trg.body);
                     should.equal(trg.body.name,data.name);
                     should.notEqual(trg.body.actions[0].additional_field,data.actions[0].additional_field);
                    done();
                });

         });
    });
    //TH5: Tạo triggers chọn action notification nhưng không có additional_field
     it('5.Tạo mới trigger chọn action notification nhưng không có additional_field', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'Trigger khong co add_field',
                    all_conditions:[{
                        condition:'Kênh là FB Wall',
                        field_key:'channel',
                        operator: 'is',
                        values: 'Facebook wall'
                    },{condition:'Trạng thái là Open',
                        field_key:'status',
                        operator: 'is',
                        values: 'Open'}],
                    actions:[{
                        attribute:'email_user',
                        values:'56cc267a10af949b27d5e734'

                    }]
                };
                 agent.post(`triggers`)
                .send(data)
                .expect(400)
                .end(function (err, trg) {
                    // console.log(trg.body);
                     should.equal(trg.body.errors.additional_field,'datnfshfas');
                     done();
                });

         });
    });
     //TH6: Tạo trigger với dữ liệu là khoảng trắng
     it('6.Tạo mới trigger với dữ liệu là khoảng trắng', function (done) {
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
                    all_conditions:[{
                        field_key:'',
                        operator: '',
                        values: ''
                    },{condition:'',
                        field_key:'',
                        operator: '',
                        values: ''}],
                    any_conditions:[{
                        field_key:'',
                        operator:'',
                        values:''
                    }],
                    actions:[{
                        attribute:'',
                        values:''

                    }]
                };
                 agent.post(`triggers`)
                .send(data)
                .expect(400)
                .end(function (err, trg) {
                   //  console.log(trg.body);
                     should.equal(trg.body.errors.name[0],'trigger.name.required');
                     should.equal(trg.body.errors.actions[0],'trigger.action.attribute.required');
                     should.equal(trg.body.errors.all_conditions[0],'trigger.condition.condition.required');
                     should.equal(trg.body.errors.any_conditions[0],'trigger.condition.condition.required');
                     done();
                });

         });
    });
     //TH7: Tạo trigger với name đã tồn tại
     it('7.Tạo mới trigger với name đã tồn tại', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'Trigger',
                    all_conditions:[{
                        condition:'Kênh là FB Wall',
                        field_key:'channel',
                        operator: 'is',
                        values: 'Facebook wall'
                    },{condition:'Trạng thái là Open',
                        field_key:'status',
                        operator: 'is_not',
                        values: 'Open'}],
                    actions:[{
                        attribute:'email_user',
                        values:'56cc267a10af949b27d5e734',
                        additional_field:{
                            subject:'Gửi mail cho agent',
                            body:'action automation gửi mail cho agent'
                        }
                    }]
                };
                 agent.post(`automations`)
                .send(data)
                .expect(400)
                .end(function (err, auto) {
                    // console.log(auto.body);
                     should.equal(auto.body.errors.ed_user_id_1_name,'common.unique');
                     done();
                });

         });
    });
     //TH8: Tạo trigger với dữ liệu sai
     it('8.Tạo mới trigger với dữ liệu sai', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'trigger all and anyAutomation all and any trigger all and anyAutomation all and any trigger all and anyAutomation all and any',
                    any_conditions:[{
                        field_key:'typenn',
                        operator: 'is_notnn',
                        values: '0nn'
                    }],
                    all_conditions:[{
                        field_key:'minutes_until_duedateee',
                        operator: 'calendar_greater_thaneee',
                        values: '2eee'
                    }],
                    actions:[{
                        attribute:'vbjdfgjs',
                        values:'56cc267a10af949b27d5e734ee',
                        additional_field:{
                            subject:'Gửi mail cho agentee',
                            body:'action automation gửi mail cho agentee'
                        }
                    }]
                };
                 agent.post(`triggers`)
                .send(data)
                .expect(400)
                .end(function (err, trg) {
                    // console.log(trg.body);
                     should.equal(trg.body.errors.any_conditions,'trigger.any_conditions.field_key.required');
                     should.equal(trg.body.errors.actions,'trigger.action.attribute.required');
                     done();
                });

         });
    });
    //TH9: Tạo trigger với user login là agent
     it('9.Tạo mới trigger với user login là agent', function (done) {
         agent.post(`auth/signin`)
            .send(credentials_agent)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'Trigger agent',
                    all_conditions:[{
                        condition:'Kênh là FB Wall',
                        field_key:'channel',
                        operator: 'is',
                        values: 'Facebook wall'
                    },{condition:'Trạng thái là Open',
                        field_key:'status',
                        operator: 'is_not',
                        values: 'Open'}],
                    actions:[{
                        attribute:'email_user',
                        values:'56cc267a10af949b27d5e734',
                        additional_field:{
                            subject:'Gửi mail cho agent',
                            body:'action automation gửi mail cho agent'
                        }
                    }]
                };
                 agent.post(`triggers`)
                .send(data)
                .expect(200)
                .end(function (err, trg) {
                    // console.log(trg.body);
                     should.equal(trg.body.errors.single,'common.users.notgranted');

                     done();

                });

         });
    });
//     //TH10: Update trigger thành công
//     it('10.Update trigger thành công', function (done) {
//         agent.post(`auth/signin`)
//            .send(credentials)
//            .expect(200)
//            .end(function (err, user) {
//                // Handle signin error
//                if (err) {
//                    return done(err);
//                }
//                var data = {
//                    all_conditions:[{
//                        condition:'Kênh là FB Wadhdshljfjhl',
//                        field_key:'chandhdhdnel',
//                        operator: 'ishgsdh',
//                        values: 'Faceboohdfsghk wall'
//                    },{condition:'Trạng thhsdfhái là Open',
//                        field_key:'stahgshfgtus',
//                        operator: 'is_nhgfhot',
//                        values: 'Opehgfhgfn'}],
//                    actions:[{
//                        attribute:'email_user',
//                        values:'56cc267a10afhgfh949b27d5e734',
//                        additional_field:{
//                            subject:'Gửi maihgfffffffffffdl cho agent',
//                            body:'action autfjfgjomation gửi mail cho agent'
//                        }
//                    }]
//                };
//                 agent.put(`triggers/56d7b1c79f271fa46c4117d7`)
//                .send(data)
//                .expect(200)
//                .end(function (err, trg) {
//                     console.log(trg.body);
//                     should.equal(trg.body.name,data.name);
//                     should.equal(trg.body.all_conditions[0].condition,data.all_conditions[0].condition);
//                     should.equal(trg.body.all_conditions[1].condition,data.all_conditions[1].condition);
//                     should.equal(trg.body.actions[0].attribute,data.actions[0].attribute);
//                     done();
//                 });
//         });
//    });
        afterEach(function (done) {
           //agent.delete(`people/groups/`+group.body._id)
        done();
    });
});
