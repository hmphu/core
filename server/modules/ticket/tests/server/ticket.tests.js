'use strict';

var should = require('should'),
    request = require('supertest'),
    utils = require('../../../core/resources/utils'),
    path = require('path');

/**
 * Globals
 */
var agent, credentials, user, ticket ;

/**
 * Ticket routes tests
 */
describe('Ticket CRUD tests - ', function () {

    before(function (done) {
        // Create user credentials
        credentials = {
            sub_domain: 'amy',
            email: 'hientt@fireflyinnov.com',
            password: 'Amythai90'
        };

        agent = request.agent(`http://${credentials.sub_domain}.infirefly.com:6969/api/`);

        done();
    });

    beforeEach(function (done) {
        done();
    });
    // trường hợp login không thành công. (1)
    it('1.Không lưu ticket được nếu không login thành công ', function (done) {
        agent.post(`tickets`)
        .send({})
        .expect(200)
        .end(function (err, ticket) {
            should.equal(ticket.body.errors.single, 'common.users.notgranted');
            done();
        });
    });
    //Các trường hợp sau khi login thành công.
    //Tạo ticket thành công với các giá trị đúng. (2)
    it('2.Tạo ticket với các giá trị đúng 1', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 0,
                    type: '',
                    priority:'',
                    comment: {
                        content: 'help me',

                    },
                    ed_user_id:'',
                    agent_id:'',
                    requester_id:'',

                    group_id: '',
                    organization: '',
                    provider: '',
                    deadline: '',
                    tags:'',
                    fields: {},
                    is_delete: '',
                    add_time:'',
                    upd_time: ''
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
//                    console.log(ticket.body);
                    should.equal(ticket.body.subject,data.subject);
                    should.equal(ticket.body.status,data.status);
                    should.not.exist(ticket.body.group_id);
                    should.not.exist(ticket.body.organization);
                    should.not.exist(ticket.body.requester_id);
                    should.not.exist(ticket.body.agent_id);
                    should.not.exist(ticket.body.type);
                    should.not.exist(ticket.body.priority);
                    should.not.exist(ticket.body.deadline);
//                    should.not.exist(ticket.body.tags);
                    should.equal(ticket.body.submitter_id,user.body._id);
                    should.equal(ticket.body.ed_user_id,utils.getParentUserId(user.body));
                    should.equal(ticket.body.is_delete,false);
                    done();
                });
            });
    });
    // tạo ticket với giá trị đúng 2 , có group không có assignee (3)
    it('3.Tạo ticket với các giá trị đúng 2', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 0,
                    type:3,
                    priority:1,
                    comment: {
                        content: 'help me',

                    },
                    ed_user_id:'',
                    agent_id:'',
                    requester_id:'',

                    group_id: '56cc39977f33dc6c3ccfeca7',
                    provider: '',
                    deadline: '2016-02-24T10:34:58.009Z',
                    tags:['123','456'],
                    fields: {},
                    is_delete: '',
                    add_time:'',
                    upd_time: ''
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
//                    console.log(ticket.body);
                    should.exist(ticket.body.group_id);
                    should.not.exist(ticket.body.organization);
                    should.equal(ticket.body.deadline,data.deadline);
                    done();
                });
            });
    });

//   ticket tạo mới có assignee. (4)
    it('4.Tạo ticket có assignee sẽ là Open ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data ={
                    subject: "Test ticket",
                    status: 0,
                    comment: {
                        content: 'ticket co assignee',

                    },
                    agent_id:user.body._id
                }
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
//                    console.log(ticket.body);
                    should.equal(ticket.body.subject,data.subject);
                    should.equal(ticket.body.status,1);
                    should.equal(ticket.body.agent_id,data.agent_id);
                    should.exist(ticket.body.group_id);
                    //should.equal(ticket.body.group_id,local.group_id);
                    done();
                });
            });
    });
    //Tạo ticket với các giá trị sai.
    //TH 1 tạo ticket với giá trị null (5)
    it('5.Tạo ticket với các giá trị đều null ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                agent.post(`tickets`)
                .send({})
                .expect(200)
                .end(function (err, ticket) {
//                    console.log(ticket);
                    should.equal(ticket.body.errors.single, 'ticket.data.not_to_blank');
                    done();
                });
            });
    });
     //Truyền requester không thuộc org . (6)
    it('6.Tạo ticket với các giá trị sai requester khong thuoc org ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 0,

                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    },
                    agent_id:'56ca820927fe53ed6f9fb625',
                    requester_id:'56ca7e2027fe53ed6f9fb613',
                    organization: '56cad8be07f47509656a9624',

                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
//                    console.log(ticket.body);
                    should.equal(ticket.body.errors.organization[0],'ticket.org.invalid');
                    done();
                });
            });
    });
    // TH 2- tao ticket với giá trị status, user_id sai (7)
    it('7.Tạo ticket sai giá trị status, user_id  ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 9,
                    type: 0,
                    priority: 0,
                    comment: {
                        content: 'help me',
                        user_id: '56c41507e34d96e80faa5e4c'
                    }
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
                    should.equal(ticket.body.errors.status[0], 'ticket.status.inclusion');
//                    should.equal(ticket.body.errors['comment.user_id'][0], 'ticket_comment.user_id.exists');
                    done();
                });
            });
    });

    // TH 3- tao ticket với giá trị type, priority sai , field sai  (8)
    it('8.Tạo ticket sai giá trị type , priority ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 1,
                    type: 4,
                    priority: 4,
                    fields:{
                        txtb: 'hello'
                    },
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    }
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
//                    console.log(ticket.body);
                    should.equal(ticket.body.errors.type[0], 'ticket.type.inclusion');
                    should.equal(ticket.body.errors.priority[0], 'ticket.priority.inclusion');
                    should.equal(ticket.body.errors.fields[0], 'ticket.fields.invalid');
                    done();
                });
            });
    });
    // trường hợp tạo mới ticket truyền sai Org, group, requester  (9)
    it('9.Tạo ticket sai giá trị org, group, requester ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 1,
                    organization:'ABC',
                    group_id:'56ca7f1e27fe53ed6f9fb616',
                    requester_id:'56ca7f1e27fe53ed6f9fb616',
                    comment: {
                        content: 'org, group sai ',
                        user_id: user.body._id
                    }
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {

                    should.equal(ticket.body.errors.organization, 'ticket.org_id.invalid');
                    should.equal(ticket.body.errors.group_id, 'ticket.group.invalid');
                    should.equal(ticket.body.errors.requester_id, 'ticket.requester_id.exists');
                    done();
                });
            });
    });
//    // TH4- tao ticket khong chon Type ma co Deadline. (10)
    it('10.Tạo ticket sai giá trị không chọn type mà có deadline ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 1,
                    deadline:"2016-02-17T10:34:58.009Z",
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    }

                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
                    should.not.exist(ticket.body.deadline);
                    done();
                });
            });
    });
//    // TH5- tao ticket them gia tri ma hệ thống tự hiểu Provider, update time, add time, is_delete  (11)
    it('11.Tạo ticket sai giá trị ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 1,
                    provider:"voip",
                    add_time:"1455876249",
                    upd_time:"1455876239",
                    is_delete:true,
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    }
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {

                    should.notEqual(ticket.body.add_time,data.add_time);
                    should.notEqual(ticket.body.upd_time,data.upd_time);
                    should.notEqual(ticket.body.is_delete,data.is_delete);
                    should.notEqual(ticket.body.provider,data.provider);
                    done();
                });
            });
    });
//    Cập nhật ticket từ status > new mà về new.   (12)
    it('12.update ticket về trạng thái new ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 1,
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    }
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
                    var data_edit ={
                        status: 0
                    };

                    agent.put(`tickets/${ticket.body._id}`)
                    .send(data_edit)
                    .expect(200)
                    .end(function (err_edit, ticket_edit){
                        should.equal(ticket_edit.body.errors.status[0],'ticket.status.inclusion');
                        done();
                    });
                });
            });
    });
////   Cập nhật ticket đã ở trạng thái close.  (13)
    it('13.update ticket trạng thái close ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data_edit={
                    status:2
                };

                agent.put(`tickets/${'56cd1c0e8a0aafba3f0dac91'}`)
                .send(data_edit)
                .expect(200)
                .end(function (err_edit, ticket_edit){
//                    console.log(ticket_edit.body);
                    should.notEqual(ticket_edit.body.status,data_edit.status);
                    done();
                });

            });
    });
// tao moi ticket chon status la close (14)
    it('14.tao moi ticket trạng thái close ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 4,
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    }
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
                    should.equal(ticket.body.errors.status[0],'ticket.status.inclusion');
                    done();
                });
            });
    });
    // tao moi ticket chon status la suspended tu webform (15)
    it('15.tao moi ticket trạng thái suspended ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 6,
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    }
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
//                    console.log('khong cho tao ticket, chua fix');
                    should.equal(ticket.body.errors.status[0],'ticket.status.inclusion');
                    done();
                });
            });
    });
    // tao moi ticket chon status la solved có assignee (15)
    it('16.tao moi ticket trạng thái solved có assignee  ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 3,
                    agent_id: user.body._id,
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    }
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
                    should.exist(ticket.body._id);
                    should.equal(ticket.body.agent_id,data.agent_id);
                    should.equal(ticket.body.status,data.status);
                    done();
                });
            });
    });
    // tao moi ticket chon status la solved không có assignee (15)
    it('17.tao moi ticket chon status la solved không có assignee ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 3,
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    }
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
//                    console.log('khong cho tao ticket, chua fix');
                    should.equal(ticket.body.errors.status[0],'ticket.status.solve_is_not assignee');
                    done();
                });
            });
    });
    // Solve ticket không có assignee
    it('18.solve ticket không có assignee ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 1,
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    }

                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
                    var data_edit ={
                        status: 3
                    };

                    agent.put(`tickets/${ticket.body._id}`)
                    .send(data_edit)
                    .expect(200)
                    .end(function (err_edit, ticket_edit){
//                        console.log(ticket_edit.body);
                        should.equal(ticket_edit.body.errors.status[0],'ticket.status.solve_is_not assignee');
                        done();
                    });
                });
            });
    });
    // ass to ass cung group
    it('19. thay đổi assignee qua assignee  ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 1,
                    agent_id: user.body._id,
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    }

                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
                    var data_edit ={
                       agent_id:"56cd65febd90d0f86501e3d1"
                    };

                    agent.put(`tickets/${ticket.body._id}`)
                    .send(data_edit)
                    .expect(200)
                    .end(function (err_edit, ticket_edit){
//                        console.log(ticket_edit.body);
                        should.equal(ticket_edit.body.agent_id,data_edit.agent_id);
                        done();
                    });
                });
            });
    });
    // ass qua group
    it('20. thay đổi assignee qua group  ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 1,
                    agent_id: user.body._id,
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    }

                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
                    var data_edit ={
                        group_id:"56cd86dd4c793e2e78f6261c"
//                        agent_id:""
                    };
//                    console.log(ticket.body.group_id);

                    agent.put(`tickets/${ticket.body._id}`)
                    .send(data_edit)
                    .expect(200)
                    .end(function (err_edit, ticket_edit){
//                        console.log(ticket_edit.body);
                        should.equal(ticket_edit.body.group_id,data_edit.group_id);
                        should.not.exist(ticket_edit.body.agent_id);
                        done();
                    });
                });
            });
    });
    // ass qua ass khac group
    it('21. thay đổi assignee qua assignee khac group.  ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 1,
                    agent_id: user.body._id,
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    }

                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
                    var data_edit ={
                        group_id:"56cd86dd4c793e2e78f6261c",
                        agent_id:"56cd65febd90d0f86501e3d1"
                    };
                    agent.put(`tickets/${ticket.body._id}`)
                    .send(data_edit)
                    .expect(200)
                    .end(function (err_edit, ticket_edit){
//                        console.log(ticket_edit.body);
                        should.equal(ticket_edit.body.group_id,data_edit.group_id);
                        should.equal(ticket_edit.body.agent_id,data_edit.agent_id);
                        done();
                    });
                });
            });
    });
    //Tạo ticket có assignee va requester suspended
    it('22. tạo ticket có assignee, requester suspened', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 1,
                    agent_id: "56cc1f6e10af949b27d5e71f",
                    requester_id:"56ce78202056413319d9a3a7",
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    }

                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
//                    console.log(ticket.body);
                    should.equal(ticket.body.errors.agent_id[0],'ticket.agent_id.is_suspended');
                    should.equal(ticket.body.errors.requester_id[0],'ticket.requester_id.is_suspended');
                    done();
                });
            });
    });
    //update ticket có assignee suspended
    it('23. update ticket có assignee requester suspened', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 1,
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    }

                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
                    var data_edit ={
                        agent_id: "56cc1f6e10af949b27d5e71f",
                        requester_id:"56ce78202056413319d9a3a7"
                    };
                    agent.put(`tickets/${ticket.body._id}`)
                    .send(data_edit)
                    .expect(200)
                    .end(function (err_edit, ticket_edit){
//                        console.log(ticket_edit.body);
                        should.equal(ticket_edit.body.errors.agent_id[0],'ticket.agent_id.is_suspended');
                        should.equal(ticket_edit.body.errors.requester_id[0],'ticket.requester_id.is_suspended');
                        done();
                    });

                });
            });
    });
     // tạo ticket với giá trị đúng 3,truyen requester co org ,truyen assignee có group (3)
    it('24.Tạo ticket với các giá trị đúng 3', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 0,
                    type:3,
                    priority:1,
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    },

                    agent_id:user.body._id,
                    requester_id:'56ce6cdf4fd095cf3a534cab'
                    //tạo lại 1 requester có org
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
                    console.log('dang chinh sua code ');
                    should.exist(ticket.body.group_id);
                    should.exist(ticket.body.organization);
                    should.equal(ticket.body.requester_id,data.requester_id);
                    done();
                });
            });
    });
 // tạo ticket với có org mà không có requester
    it('25.Tạo ticket co org ma khong co requester', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 0,

                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    },
                    organization:'56cc39e87f33dc6c3ccfeca9'
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {

//                    console.log(ticket.body);
                    should.equal(ticket.body.errors.organization[0],'ticket.org_id.no_requester');
                    done();
                });
            });
    });
    //chuyển requester, assignee trong ticket từ  suspended qua user khác
    it('26. chuyển rqt suspended trong ticket qua rqt khac', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {

                    requester_id:"56ce6cdf4fd095cf3a534cab"

                };
                agent.put(`tickets/${'56ce7c6e8066b20f2dc6fe96'}`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
//                    console.log(ticket.body);
                    should.equal(ticket.body.requester_id,data.requester_id);
                    done();
                });
            });
    });
    //Test comment
    // truyền comment với tất cả các giá trị null
     it('27.truyền comment với tất cả các giá trị null ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 0,
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    },

                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end (function (err_edit, ticket){
                    var data_edit ={
                        comment:{
                        ed_user_id: "",
                        ticket_id:"",
                        user_id: "",
                        content:"" ,
                        attachments: "",
                        provider:"",
                        provider_data: "",
                        is_requester: "",
                        is_first:"",
                        is_internal:"",
                        is_delete:"",
                        add_time:"",
                        upd_time:""
                        }
                    };
                    agent.put(`tickets/${ticket.body._id}`)
                    .send(data_edit)
                    .expect(200)
                    .end(function (err_edit, ticket_edit){
//                        console.log(ticket_edit.body);
//                        console.log('chua lam');
                        should.equal(ticket_edit.body.errors.single,"ticket.comment_content.is_no_blank");
                        done();
                    });
                });
            });
    });
// truyền comment giá trị sai
it('28.truyền comment gia trị sai ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 0,
                    comment:{
                        ed_user_id: "",
                        ticket_id:"",
                        user_id: "",
                        content:"Hello " ,
                        attachments: "",
                        provider:"gmail",
                        provider_data: "",
                        is_requester: "",
                        is_first:"",
                        is_public:"",
                        is_delete:"",
                        add_time:"",
                        upd_time:""
                        }

                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
//                    console.log(ticket.body);
//                    console.log('chua lam');
                    should.notEqual(ticket.body.comment.provider,data.comment.provider);
                    should.equal(ticket.body.comment.provider,'web');
                    done();
                });
            });
    });
    // truyền macro lung tung
it('29.truyền comment với macro sai  ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 0,
                    comment: {
                        content: 'help me',
                        user_id: user.body._id,
                        macro_id:'56ce7c6e8066b20f2dc6fe96'
                    }

                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket){
//                    console.log(ticket.body);
                    console.log('chua lam');
                    should.equal(ticket.body.errors.comment.macro_id[0],'ticket_comment.macro_id.invalid');
                    done();
                });
            });
    });
    // truyền comment channel iziMail
    it('29.truyền comment với macro sai  ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 0,
                    comment: {
                        content: 'help me',
                        user_id: user.body._id,
                        macro_id:'56ce7c6e8066b20f2dc6fe96'
                    }

                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket){
//                    console.log(ticket.body);
                    console.log('chua lam');
                    should.equal(ticket.body.errors.comment.macro_id[0],'ticket_comment.macro_id.invalid');
                    done();
                });
            });
    });
// ticket từ new mà update sẽ qua open neu khong truyen status
 it('30.update ticket về tu trang thai new ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 0,
                    comment: {
                        content: 'help me',
                        user_id: user.body._id
                    }
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
                    var data_edit ={
                        type: 2
                    };

                    agent.put(`tickets/${ticket.body._id}`)
                    .send(data_edit)
                    .expect(200)
                    .end(function (err_edit, ticket_edit){
//                        console.log(ticket_edit.body);
                        should.notEqual(ticket_edit.body.status,ticket.body.status);
                        should.equal(ticket_edit.body.status,1);
                        done();
                    });
                });
            });
    });
    // truyền comment voi provider dung mà provider_data sai
it('31. truyền comment voi provider dung mà provider_data sai 1(mail)', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 0,
                    requester_id:'56ce6cdf4fd095cf3a534cab',
                    comment:{

                        content:"Hello " ,
                        provider:"izimail",
                        provider_data: "11"

                        }

                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
//                    console.log(ticket.body);
                    console.log('chua lam');
//                    should.notEqual(ticket.body.comment.provider,data.comment.provider);
//                    should.equal(ticket.body.comment.provider,'web');
                    done();
                });
            });
    });
     // truyền comment voi provider dung mà provider_data dung
it('32. truyền comment voi provider dung mà provider_data sai 2 (mail) ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 0,
                    requester_id:'56ce6cdf4fd095cf3a534cab',
                    comment:{

                        content:"Hello " ,
                        provider:"izimail",
                        provider_data: {
//                            ccs : [''],
//                            ex_ccs : [''],
//                            ex_watchers: [''],
                            to_email:'maynt@fireflyinnov.com'
                        }

                    }

                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
//                    console.log(ticket.body);
                    console.log('chua lam');
//                    should.notEqual(ticket.body.comment.provider,data.comment.provider);
//                    should.equal(ticket.body.comment.provider,'web');
                    done();
                });
            });
    });
    // update ticket vừa comment public vùa solved
 it('33.update ticket vừa comment public vùa solved ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 0,
                    requester_id:'56ce6cdf4fd095cf3a534cab',
                    agent_id:user.body._id,
                    comment: {
                        content: 'help me',

                    }
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
                    var data_edit ={
                        status:3,
                        comment: {
                        content: 'help me',
                        provider:'izimail'

                        }
                    };

                    agent.put(`tickets/${ticket.body._id}`)
                    .send(data_edit)
                    .expect(200)
                    .end(function (err_edit, ticket_edit){
//                        console.log(ticket_edit.body);
                        console.log('chua lam');
//                        should.equal(ticket_edit.body.status,ticket.body.status);
//                        should.equal(ticket_edit.body.comment.,1);
                        done();
                    });
                });
            });
    });
    // reopen
 it('33.reopent ticket ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 3,
                    requester_id:'56ce6cdf4fd095cf3a534cab',
                    agent_id:user.body._id,
                    comment: {
                        content: 'help me',

                    }
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
                    var data_edit ={
                       // khai bao comment public
                        comment: {
                        content: 'help me',
                        provider:'izimail'

                        }
                    };

                    agent.put(`tickets/${ticket.body._id}`)
                    .send(data_edit)
                    .expect(200)
                    .end(function (err_edit, ticket_edit){
//                        console.log(ticket_edit.body);
                        console.log('chua lam');
                        should.equal(ticket_edit.body.status,1);
//                        should.equal(ticket_edit.body.comment.,1);
                        done();
                    });
                });
            });
    });

    //Tạo ticket thành công với các giá trị đúng. (2)
    it('34.Tạo ticket với các giá trị sai', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 0,
                    type: '     ',
                    priority:'    ',
                    comment: {
                        content: 'help me',

                    },
                    ed_user_id:'              ',
                    agent_id:'     ',
                    requester_id:'    56ce6cdf4fd095cf3a534cab    ',

                    group_id: '      ',
                    organization: '      ',
                    provider: '      ',
                    deadline: '              ',
                    tags:'       ',
                    fields: {},
                    is_delete: '        ',
                    add_time:'       ',
                    upd_time: '       '
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
                    console.log('Can kiem tra lai vi con bug ');
                    should.exist(ticket.body._id);
                    done();
                });
            });
    });
    //Tạo ticket thành công với các giá trị đúng. (2)
    it('34.Tạo ticket với các giá trị sai', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    subject: "Test ticket",
                    status: 0,
                    type: '     ',
                    priority:'    ',
                    comment: {
                        content: 'help me',

                    },
                    ed_user_id:'              ',
                    agent_id:'     ',
                    requester_id:'        ',

                    group_id: '      ',
                    organization: '      ',
                    provider: '      ',
                    deadline: '              ',
                    tags:'       ',
                    fields: {},
                    is_delete: '        ',
                    add_time:'       ',
                    upd_time: '       '
                };
                agent.post(`tickets`)
                .send(data)
                .expect(200)
                .end(function (err, ticket) {
                    console.log('Can kiem tra lai vi con bug ');
                    should.exist(ticket.body._id);
                    done();
                });
            });
    });
    // Tao ticket tu requester suspended thi ticket sẽ có status là suspended
    afterEach(function (done) {
        done();
    });
});
