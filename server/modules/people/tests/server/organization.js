'use strict';

var should = require('should'),
    request = require('supertest'),
    path = require('path');

/**
 * Globals
 */
var agent, group, group1,user, credentials, contact;

/**
 * Organization routes tests
 */
describe('Organization CRUD tests', function () {

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
    //TH1: Tạo organization hợp lệ
     it('1.Tạo mới organization thành công với dữ liệu hợp lệ', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'WMOT',
                    domains:['gmail.com','yahoo.com']
                };

                 agent.post(`people/organizations`)
                .send(data)
                .expect(200)
                .end(function (err, org) {
                    // console.log(org.body);
                     should.equal(org.body.name,data.name);
                     agent.delete(`people/organizations/`+org.body._id)
                     .expect(200)
                     .end(function(err,dele){
                      //  console.log(dele.body);
                    done();
                     });
                });

         });
    });
 //TH2: Tạo organization với data là khoảng trắng
    it('2.tạo organization không thành công với data là khoảng trắng', function (done) {
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
                    domains:''
                };
                 agent.post(`people/organizations`)
                .send(data)
                .expect(200)
                .end(function (err, org) {
                  //  console.log(org.body);
                   // console.log(org.body.errors.domains[0]);
                    should.equal(org.body.errors.name[0],'people.organization.name.required');
                    should.equal(org.body.errors.domains[0],'people.organization.domains.invalid');
                    should.not.exist(org.body._id);
                    done();
                });
         });
    });
    //TH3: Tạo organization với domain sai định dạng
    it('3.Tạo organization với domain sai định dạng', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'ABC',
                    domains:['ABCD']
                };

                 agent.post(`people/organizations`)
                .send(data)
                .expect(200)
                .end(function (err, org) {
                  //  console.log(org.body);
                     should.equal(org.body.errors.domains[0],['people.organization.domains.invalid']);
                     should.not.exist(org.body._id);
                    done();
                });

         });
    });
    //TH4: Tạo organization với name đã tồn tại trong hệ thống
      it('4.Tạo organization với name đã tồn tại trong hệ thống', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'WHO',
                    domains:['abc.com']
                };

                 agent.post(`people/organizations`)
                .send(data)
                .expect(200)
                .end(function (err, org) {
                  //  console.log(org.body);
                     should.equal(org.body.errors.ed_user_id_1_name,'common.unique');
                     should.exist(org.body);
                    done();
                });

         });
    });
    // TH5: Sửa organization với name và nhiều domains hợp lệ
    it('5.Sửa tên organization với name và nhiều domains hợp lệ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data={
                    name:'WTO NO',
                    domains:['wto.com','abc.com']

                };
                agent.put(`people/organizations/56cefec222c1ba61610f7d39`)
                .send(data)
                .expect(200)
                .end(function (err, org){
                  //  console.log(org.body);
                    should.equal(org.body.name,data.name);
                   // should.equal(org.body.domains[0],data.domains[0]);
                    should.exist(org.body._id);
                done();
                 });

            });
    });
//    //Sắp xếp danh sách các organization được tạo từ 1456403500 tăng dần
//    it('6.Sắp xếp danh sách organization được tạo từ add time 1456403500 tăng dần', function (done) {
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
//                agent.get(`people/organizations?sort_order=1&skip=1456403500`)
//                .expect(200)
//                .end(function (err, org) {
//                   // console.log(org.body);
//                     //Kiểm tra add time nhỏ dần
//                    done();
//                });
//
//         });
//    });
//
//     //Sắp xếp danh sách các organization được tạo từ 1456403500 giảm dần
//    it('7.Sắp xếp danh sách organization được tạo từ add time 1456403500 giảm dần', function (done) {
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
//                agent.get(`people/organizations?sort_order=-1&skip=1456403500`)
//                .expect(200)
//                .end(function (err, org) {
//                  // console.log(org.body);
//                     //Kiểm tra add time nhỏ dần
//                    done();
//                });
//         });
//    });
    //TH6: delete organization
     it('6.xóa organization', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name:'0109',
                    domains:['olaola.com']
                };

                 agent.post(`people/organizations`)
                .send(data)
                .expect(200)
                .end(function (err, org) {
                     should.equal(org.body.name,data.name);
                     agent.delete(`people/organizations/`+org.body._id)
                     .expect(200)
                     .end(function (err, org1){
                        // console.log(org1.body);
                        //  should.not.exist(org1.body);
                          done();
                      });
                });

         });
    });
   //TH
        afterEach(function (done) {
           //agent.delete(`people/groups/`+group.body._id)
        done();
    });
});
