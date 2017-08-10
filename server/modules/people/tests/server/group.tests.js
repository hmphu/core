'use strict';

var should = require('should'),
    request = require('supertest'),
    path = require('path');

/**
 * Globals
 */
var agent, group, group1,user, credentials, contact;

/**
 * Ticket routes tests
 */
describe('Group CRUD tests', function () {

    before(function (done) {
        // Create user credentials
        credentials = {
            sub_domain: 'robo',
            email: 'maynt@fireflyinnov.com',
            password: 'May12345'
        };
        agent = request.agent(`http://${credentials.sub_domain}.infirefly.com:6969/api/`);
        done();
    });

    beforeEach(function (done) {
        done();
    });
    //TH1: Tạo group hợp lệ
        it('1.Add group thành công với dữ liệu hợp lệ', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'QC'
                };

                 agent.post(`people/groups`)
                .send(data)
                .expect(200)
                .end(function (err, group) {
                    //console.log(group.body);
                     should.equal(group.body.name,data.name);
                    //xóa dữ liệu sau khi tạo thành công
                     agent.delete(`people/groups/`+group.body._id)
                     .expect(200)
                     .end(function (err, group1){
                          should.exist(group1.body);
                          done();
                     });
                });

         });
    });

    //TH2: Tạo group với name là khoảng trắng
    it('2.Add group không thành công với name là khoảng trắng', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:''
                };

                 agent.post(`people/groups`)
                .send(data)
                .expect(200)
                .end(function (err, group) {
                   // console.log(group.body);
                     should.equal(group.body.errors.name[0],'people.group.name.required');
                     should.equal(group.body.errors.name[1],'people.group.name.invalid_group_name');
                     should.exist(group.body);
                    done();
                });
         });
    });
    //TH3: Tạo group với name là ký tự đặc biệt
    it('3.Add group không thành công với name là ký tự đặc biệt', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'**'
                };

                 agent.post(`people/groups`)
                .send(data)
                .expect(200)
                .end(function (err, group) {
                  //  console.log(group.body);
                     should.equal(group.body.errors.name[0],'people.group.name.invalid_group_name');
                     should.exist(group.body);
                    done();
                });

         });
    });
    //TH4: Tạo group với name đã tồn tại trong hệ thống
      it('4.Add group không thành công với name đã tồn tại', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'Support'
                };

                 agent.post(`people/groups`)
                .send(data)
                .expect(200)
                .end(function (err, group) {
                  //  console.log(group.body);
                     should.equal(group.body.errors.ed_user_id_1_name,'common.unique');
                     should.exist(group.body);
                    done();
                });

         });
    });
//    //Sắp xếp danh sách các group được tạo từ 1456403500 tăng dần
//    it('5.Sắp xếp danh sách group được tạo từ add time 1456403500 tăng dần', function (done) {
//        agent.post(`auth/signin`)
//            .send(credentials)
//            .expect(200)
//            .end(function (err, user) {
//                // Handle signin error
//                if (err) {
//                    return done(err);
//                }
//                var data={
//                    add_time:'1456403500'
//                };
//                agent.get(`people/groups?sort_order=1&skip=1456403500`)
//                .expect(200)
//                .end(function (err, group) {
//                   // console.log(group.body);
//                     //Kiểm tra add time nhỏ dần
//                    done();
//                });
//
//         });
//    });
//
//     //Sắp xếp danh sách các group được tạo từ 1456403500 giảm dần
//    it('6.Sắp xếp danh sách group được tạo từ add time 1456403500 giảm dần', function (done) {
//        agent.post(`auth/signin`)
//            .send(credentials)
//            .expect(200)
//            .end(function (err, user) {
//                // Handle signin error
//                if (err) {
//                    return done(err);
//                }
//                var data={
//                    add_time:'1456403500'
//                };
//                agent.get(`people/groups?sort_order=-1&skip=1456403500`)
//                .expect(200)
//                .end(function (err, group) {
//                   // console.log(group.body);
//                     //Kiểm tra add time nhỏ dần
//                    done();
//                });
//
//         });
//    });
    // TH5: Sửa tên group với name hợp lệ
    it('5.Sửa group thành công với name hợp lệ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data={
                    name:'Support 36'
                };
                agent.put(`people/groups/56cc267a10af949b27d5e746`)
                   //  console.log(`people/groups/`+group.body._id);
                .send(data)
                .expect(200)
                .end(function (err, group){
                  //  console.log(group.body);
                    should.equal(group.body.name,data.name);////
                    should.exist(group.body);
                done();
                 });

            });
    });
    //TH6: delete group chưa có user default
     it('6.delete group thành công với group chưa có user default', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'0109'
                };

                 agent.post(`people/groups`)
                .send(data)
                .expect(200)
                .end(function (err, group) {
                     should.equal(group.body.name,data.name);
                     agent.delete(`people/groups/`+group.body._id)
                     .expect(200)
                     .end(function (err, group1){
                          should.exist(group1.body);
                          done();
                     });
                });

         });
    });
    //TH7: Xóa group có user chọn group là group default
     it('7.Không xóa group có user chọn group là group default', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                agent.delete(`people/groups/56cc267a10af949b27d5e746`)
                .expect(200)
                .end(function(err, group){
                    should.equal(group.body.errors.single,'people.group.has_group_is_default');
                done();
                });
            });
    });
    //TH: Thêm requester vào group..............................
    it('8.Thêm requester vào group không thành công', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                 agent.post(`people/groups/56cef3ea22c1ba61610f7c8e/users`)
                .send({ids:[`56cff80987025f82046a6632`]})
                .expect(200)
                .end(function (err, group){
                   // console.log(group.body);
                    should.equal(group.body.errors.user_id,'people.group.user.role.invalid');
                    // should.exist(group.body);
                done();

                });

            });
    });
    //TH8: Thêm agent vào group
    it('9.Thêm agent vào group thành công', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                 agent.post(`people/groups/56cef3ea22c1ba61610f7c8e/users`)
                .send({ids:[`56ceefb022c1ba61610f7c8c`]})
                .expect(200)
                .end(function (err, group){
                    //console.log(group.body);
//                  // should.equal(group1.body.name,data.name);////
                    // should.exist(group1.body);
                done();

                });

            });
    });
    //TH8: Group có user chọn làm group default
     it('10.user chọn group làm group default', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                agent.put(`people/groups/56cef5c922c1ba61610f7c8f/users/56ceefb022c1ba61610f7c8c`)
                //console.log(`people/groups/`+group.body._id+`/users/`+user.body._id);
                .send({})
                .expect(200)
                .end(function (err, group){
                    //   console.log(group.body);
                     // should.exist(group.body);
                done();
                });
         });
    });
    //TH9: Xóa user ra khỏi group khi user không chọn group là group default
     it('11.Xóa user ra khỏi group khi user không chọn group là group default', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                agent.post(`people/groups/56cef3ea22c1ba61610f7c8e/users`)
                .send({ids:['56cef77022c1ba61610f7c93']})
                .expect(200)
                .end(function(err, group){
                    agent.delete(`people/groups/56cef3ea22c1ba61610f7c8e/users/56cef77022c1ba61610f7c93`)
                    .expect(200)
                    .end(function(err, group2){
                        //    console.log(group2.body);
                    done();
                    });
               });

         });
    });
//TH10: Xóa user ra khỏi group với user chọn group là default
    it('12.Không Xóa user ra khỏi group khi user chọn group là group default', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                agent.delete(`people/groups/56cef5c922c1ba61610f7c8f/users/56ceefb022c1ba61610f7c8c`)
                .expect(200)
                .end(function(err, group){
                    //    console.log(group3.body);
                     should(group.body.errors.single,'people.group.user.group_default');
                     done();
                });
             });
    });
        afterEach(function (done) {
           //agent.delete(`people/groups/`+group.body._id)
        done();
    });
});
