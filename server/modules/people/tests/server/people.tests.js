'use strict';

var should = require('should'),
    request = require('supertest'),
    path = require('path');

/**
 * Globals
 */
var agent, group, credentials, user, people, contact, credentials_admin, credentials_agent;

/**
 * Ticket routes tests
 */
describe('People CRUD tests', function () {

    before(function (done) {
        // Create user credentials
        credentials = {
            sub_domain: 'robo',
            email: 'maynt@fireflyinnov.com',
            password: 'May12345'
        };
        credentials_admin={
            sub_domain: 'robo',
            email: 'nguyenthimay88@gmail.com',
            password: 'F1vGabdNanwb19x69hey'
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
    //TH1: Thêm agent không thành công nếu đã đạt max agent
    it('1.Add agent không thành công nếu đã đạt max agent', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name: 'robo Test',
                    email:'nguyenthimay@gmail.com',
                    roles:['admin']
                 };

                 agent.post(`people/user`)
                .send(data)
                .expect(200)
                .end(function (err, user) {
                  //  console.log(user.body);
                    should.equal(user.body.errors.single,'people.user.max_agent');
                 //   should.exist(user.body);
                    done();
                });

         });
    });
    //TH2: Thêm user không thành công nếu dữ liệu là khoảng trắng
    it('2.Add user không thành công nếu dữ liệu là khoảng trắng', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name: '',
                    email:'',
                    roles:['']
                };
                 agent.post(`people/user`)
                .send(data)
                .expect(200)
                .end(function (err, user) {
                    // console.log(user.body);
                     should.equal(user.body.errors.name[0],'people.name.required');
                     should.equal(user.body.errors.name[0],'people.name.only_alphabet');
                     should.equal(user.body.errors.name[1],'people.name.required');
                     should.equal(user.body.errors.name[1],'people.name.only_alphabet');
                     should.equal(user.body.errors.email[0],'people.contact.required');
                     should.equal(user.body.errors.roles[0],'people.role.inclusion');
                     should.exist(user.body);
                     done();
                });

         });
    });

    //TH3: Thêm user có dữ liệu sai
    it('3.Add user không thành công nếu dữ liệu sai', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name: 'Mayyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy Testttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt',
                    email:'nguyenmaykhokhogmail.com',
                    roles:['admi']
                };

                 agent.post(`people/user`)
                .send(data)
                .expect(200)
                .end(function (err, user) {
                   // console.log(user.body);
                     should.equal(user.body.errors.email[0],'people.email.format');
                     should.equal(user.body.errors.roles[0],'people.role.inclusion');
                     should.equal(user.body.errors.name[0],'people.name.maximum_length');
                     should.exist(user.body);
                    done();
                });

         });
    });
    //TH4: Thêm user có phone và email
    it('4.Add user không thành công với cả phone và email', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name: 'Mây admin Nguyễn',
                    phone:'09089368451',
                    email:'nguyenmayadmin@gmail.com.com',
                    roles:['admin']
                };

                 agent.post(`people/user`)
                .send(data)
                .expect(200)
                .end(function (err, user) {
                 //   console.log(user.body);
                     should.equal(user.body.errors.email[0],'people.email.only_one_contact');
                     should.equal(user.body.errors.phone[0],'people.phone.is_requester');
                     should.exist(user.body);
                    done();
                });

         });
    });

    //TH4: Thêm requester với phone
    it('5.Add requester thành công với phone là contact chính', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name: 'May Add Requester',
                    phone:'09055497500',
                    roles:['requester']
                };

                 agent.post(`people/user`)
                .send(data)
                .expect(200)
                .end(function (err, user) {
                   // console.log(user.body);
                     should.equal(user.body.roles[0],data.roles);
                     should.equal(user.body.name,data.name);
                     should.exist(user.body);
                     agent.get(`people/requester/`+user.body._id+`/contacts`)
                     .expect(200)
                     .end(function(err, requester){
                         should.equal(requester.body.is_primary,data.is_primary);
                    done();
                     });
                });

         });
    });
        //TH5: Thêm user với dữ liệu hợp lệ
    it('6.Add user thành công với dữ liệu hợp lệ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data = {
                    name: 'thi Nguyen',
                    email:'nguyenthimay88@gmail.com',
                    org_id :'56cd7460e33c9ea62a9b7a71',
                    roles:['admin']
                };

                 agent.post(`people/user`)
                .send(data)
                .expect(200)
                .end(function (err, user) {
                  //  console.log(user.body);
                     should.equal(user.body.name,data.name);
                     should.equal(user.body.roles[0],data.roles);
                     should.exist(user.body);
                    done();
                    // });
                });

         });
    });
    //Chưa sắp xếp theo đúng skip
     //Sắp xếp danh sách các user được tạo từ 1456456972 giảm dần
//    it('7.Sắp xếp danh sách user được tạo từ add time 1456456972 giảm dần', function (done) {
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
//                agent.get(`people/user?sort_order=-1&skip=1456456972`)
//                .expect(200)
//                .end(function (err, user) {
//                    console.log(user.body);
//                     //Kiểm tra add time nhỏ dần
//                    done();
//                });
//
//         });
//    });
//    //Sắp xếp danh sách các user được tạo từ 1456456972 tăng dần
//    it('8.Sắp xếp danh sách user được tạo từ add time 1456404716 tăng dần', function (done) {
//        agent.post(`auth/signin`)
//            .send(credentials)
//            .expect(200)
//            .end(function (err, user) {
//                // Handle signin error
//                if (err) {
//                    return done(err);
//                }
//                var data={
//                    add_time:'1456404716'
//                };
//                agent.get(`people/user?sort_order=1&skip=1456404716`)
//                .expect(200)
//                .end(function (err, user) {
//                  //  console.log(user.body);
//                     //Kiểm tra add time nhỏ dần
//                    done();
//                });
//
//
//        });
//    });
 //TH6: Sửa user các trường hợp cho phép
    ///Không update language, timezone, time format,is_suspend=false cho update is_verified, chưa add đc tags
    it('8.Update user các trường hợp cho phép', function (done) {
          agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data={
                name: 'Mây Agent update',
                is_suspended:true,
                time_format:12,
                time_zone:{
                    value:6,
                    id:'Asia/thimphu'
                    },
                language:'vi',
                profile_image: 'fjhsfg',
                tags:['maymeo','meomay']

                };
                agent.put(`people/user/56ceefb022c1ba61610f7c8c`)
                .send(data)
                .expect(200)
                .end(function (err,people){
                    if (err) {
                         return done(err);
                    }
                    console.log(people.body);
                    done();

                });

         });
    });
    //TH7: Sửa user các trường hợp không cho phép
     it('9.Update user các trường hợp không cho phép', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data={
                    email:'nguyen95@gmail.com',
                    roles:['requester'],
                    upd_time:1456308060,
                    add_time: 1456999999,
                    name:'May May',
                    sub_domain:'may',
                    provider:'web',
                    is_verified:true

                     };
                 agent.put(`people/user/56ceefb022c1ba61610f7c8c`)
                .send(data)
                .expect(200)
                .end(function (err,people){
                    if (err) {
                        return done(err);
                    }
                  //  console.log(people.body);
                     should.notEqual(people.body.roles,data.roles);
                     //chưa so sánh các field khác nữa
                     done();

                });

         });
    });

//TH: Update org cho agent..........................................
     it('10.Update organization cho agent//test lại', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data={
                    org_id :'56ce6bca4fd095cf3a534b98'
                     };
                 agent.put(`people/user/56ceefb022c1ba61610f7c8c`)
                .send(data)
                .expect(200)
                .end(function (err,people){
                    if (err) {
                        return done(err);
                    }
                  //  console.log(people.body);
                    should.notEqual(people.body.errors,data.abcxyz);
                     done();

                });

         });
    });
// Update owner với user login là admin
    it('11.Update owner với user login là admin // chưa đc', function (done) {
          agent.post(`auth/signin`)
            .send(credentials_admin)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data={
                name: 'Mây Admin Owner',
               // is_suspended:true
                };
                agent.put(`people/user/56cc267a10af949b27d5e734`)
                .send(data)
                .expect(400)
                .end(function (err,people){
                    if (err) {
                         return done(err);

                    }
                    console.log(people.body);
                    done();

               });

         });
    });
    // Update admin với user login là admin
    it('12.Update admin với user login là admin // chưa đc', function (done) {
          agent.post(`auth/signin`)
            .send(credentials_admin)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data={
                name: 'Mây Admin Update admin',
               // is_suspended:true
                };
                agent.put(`people/user/56ceefb022c1ba61610f7c8c`)
                .send(data)
                .expect(200)
                .end(function (err,people){
                    if (err) {
                         return done(err);

                    }
                    console.log(people.body);
                    done();

               });

         });
    });
     // Update agent với user login là admin
    it('13.Update agent với user login là admin // chưa đc', function (done) {
          agent.post(`auth/signin`)
            .send(credentials_admin)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data={
                name: 'Mây agent Update agent',
               // is_suspended:true
                };
                agent.put(`people/user/56cef8ec22c1ba61610f7ca1`)
                .send(data)
                .expect(200)
                .end(function (err,people){
                  //  console.log(err);
                    if (err) {
                         return done(err);

                    }
                    console.log(people.body);
                    done();

               });

         });
    });
       // Update requester với user login là admin
    it('14.Update requester thành công với user login là admin', function (done) {
          agent.post(`auth/signin`)
            .send(credentials_admin)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data={
                name: 'Mây update requester',
               // is_suspended:true
                };
                agent.put(`people/user/56cef90322c1ba61610f7cac`)
                .send(data)
                .expect(200)
                .end(function (err,people){
                    if (err) {
                         return done(err);

                    }
                    console.log(people.body);
                    done();

               });

         });
    });
     // Update admin,agent với user login là agent
    it('15.Update admin với user login là agent // chưa đc', function (done) {
          agent.post(`auth/signin`)
            .send(credentials_agent)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
              //  console.log(user.body);
                var data={
                name: 'Mây agent Update admin',
               // is_suspended:true
                };
                agent.put(`people/user/56cef8e222c1ba61610f7c9d`)
                .send(data)
                .expect(400)
                .end(function (err,people){
                   // console.log(err);
                    if (err) {
                         return done(err);

                    }
                   // console.log(people.body);
                    should.equal(people.body.errors.single,'common.users.notgranted');
                    done();

               });

         });
    });

       // Update requester với user login là agent
    it('17.Update requester thành công với user login là agent //chưa được', function (done) {
          agent.post(`auth/signin`)
            .send(credentials_agent)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data={
                name: 'Requester cố định Mây agent update',
               // is_suspended:true
                };
                agent.put(`people/user/56cff80987025f82046a6632`)
                .send(data)
                .expect(200)
                .end(function (err,people){
                  //  console.log(err);
                    if (err) {
                         return done(err);

                    }
                    console.log(people.body);
                    done();

               });

         });
    });
//    TH: add contact cho user
    it('18.Add contact cho user thành công với dữ liệu hợp lệ', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data={
                    type:0,
                    value:'maymay00@gmail.com',
                     };
                agent.post(`people/requester/56cee71622c1ba61610f7aa0/contacts`)
                .send(data)
                .expect(200)
                .end(function (err, contact){
                         console.log(contact.body);
                done();

                });

         });
    });
    //TH: Add contact cho user với dữ liệu là khoảng trắng
    it('19.Tạo contact cho user với dữ liệu là khoảng trắng', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data={
                    type:'',
                    value:''
                     };
                agent.post(`people/requester/56cee71622c1ba61610f7aa0/contacts`)
                .send(data)
                .expect(200)
                .end(function (err, contact){
                //    console.log(contact.body);
                    should.equal(contact.body.errors.type,'people.user.contact.primary.invalid');
                    should.equal(contact.body.errors.value,'people.user.contact.value.required');
                    done();

                });

         });
    });
    //TH: Add contact cho user với phone sai định dạng
    it('20.Tạo contact cho user với phone sai định dạng', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }

                var data={
                    type:1,
                    value:'dfgsgdg@gmail.com'
                };
                agent.post(`people/requester/56cee71622c1ba61610f7aa0/contacts`)
                .send(data)
                .expect(200)
                .end(function (err, contact){
                 //    console.log(contact.body);
                     should.equal(contact.body.errors.value,'people.user.contact.value.phone.invalid');
                    done();

                });

         });
    });
     //TH: Add contact cho user với email sai định dạng
    it('21.Tạo contact cho user với email sai định dạng', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data={
                    type:0,
                    value:'dfgsgdgghgmail.com'
                };
                agent.post(`people/requester/56cee71622c1ba61610f7aa0/contacts`)
                .send(data)
                .expect(200)
                .end(function (err, contact){
                    console.log(contact.body);
                    should.equal(contact.body.errors.value,'people.user.contact.value.email.invalid');
                done();

                });

         });
    });

      //TH: Add contact cho user với dữ liệu không cho phép chat, facebook
    it('22.Tạo contact cho user với dữ liệu không cho phép', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data={
                    type:2,
                    value:'dfgsgdgghgmailcom'
                };
                agent.post(`people/requester/56cee71622c1ba61610f7aa0/contacts`)
                .send(data)
                .expect(200)
                .end(function (err, contact){
                 //    console.log(contact.body);
                     should.equal(contact.body.errors.type,'people.user.contact.type.invalid.only_email_phone');
                done();

                });

         });
    });

    //TH: chọn contact primary cho user
    it('23.Update contact primary cho user', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data={
                    type:0,
                    value:'may556v@gmail.com'
                 };
                agent.post(`people/requester/56cee71622c1ba61610f7aa0/contacts`)
                .send(data)
                .expect(200)
                .end(function (err, contact){
                 //   console.log(contact.body);
                    var data1={
                        is_primary : true
                    };
                    agent.put(`people/requester/56cee71622c1ba61610f7aa0/contacts/`+contact.body._id)
                    .send(data1)
                    .expect(200)
                    .end(function(err, cont){
                            if (err) {
                            return done(err);
                            }
                             console.log(cont.body);
                        done();

                     });
                });

         });
    });
    //Chỉnh sửa và cập nhật sau
    //TH: Chọn 2 contact làm primary
    it('24.Kiểm tra Chỉ có duy nhất 1 primary contact user theo type', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }

                var data={
                    type:0,
                    value:'m9@gmail.com'
                };
                agent.post(`people/requester/56cee71622c1ba61610f7aa0/contacts`)
                .send(data)
                .expect(200)
                .end(function (err, contact){
                //    console.log(contact.body);
                    var data1={
                        is_primary : true
                    };
                    agent.put(`people/requester/56cee71622c1ba61610f7aa0/contacts/`+contact.body._id)
                    .send(data1)
                    .expect(200)
                    .end(function(err, cont){
                         if (err) {
                            return done(err);
                         }
                        console.log(cont.body);
                        agent.get(`people/requester/56cee71622c1ba61610f7aa0/contacts/`)
                        .expect(200)
                        .end(function(err, kt){
                            // console.log(kt.body);
                             should.equal(kt.body[0].is_primary,data1.is_primary);
                              //console.log(kt.body[1].is_primary);
                                 should.notEqual(kt.body[1].is_primary,data.is_primary);
                              done();

                         });
                     });
                });

         });
    });
    // Delete contact user không phải là primary
    it('25.xóa contact cho user với contact không phải là primary', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                var data={
                    type:1,
                    value:'0908936850'
                };
                agent.post(`people/requester/56cee71622c1ba61610f7aa0/contacts/`)
                .send(data)
                .expect(200)
                .end(function(err,contact){
                    agent.delete(`people/requester/56cee71622c1ba61610f7aa0/contacts/`+contact.body._id)
                    .expect(200)
                    .end(function(err,dele){
                       // console.log(dele.body);
                    done();
                     });
                 });
             });
    });
    //TH.xóa contact user với contact là primary
    it('26.xóa contact user với contact là primary', function (done) {
         agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                    }
            // console.log(`people/requester/56cee71622c1ba61610f7aa0/contacts/56cee78e22c1ba61610f7aa3`);
                 agent.delete(`people/requester/56cff80987025f82046a6632/contacts/56cff8c887025f82046a6635`)
                 .expect(200)
                 .end(function(err,dele){
                 //    console.log(dele.body);
                     should.equal(dele.body.errors.single,'people.user.contact.primary.invalid');
                     done();
                  });

            });
    });

     //TH7: Delete user
    it('27.Delete user', function (done) {
        agent.post(`auth/signin`)
            .send(credentials)
            .expect(200)
            .end(function (err, user) {
                // Handle signin error
                if (err) {
                    return done(err);
                }
                 var data = {
                    name: 'khang Nguyen',
                    email:'nghian11@gmail.com',
                    roles:['requester']
                };
                 agent.post(`people/user`)
                .send(data)
                .expect(200)
                .end(function (err, user) {
                     console.log(user.body);
                     should.equal(user.body.name,data.name);
                     should.equal(user.body.roles[0],data.roles);
                     should.exist(user.body);
                     agent.delete(`people/user/`+user.body._id)
                    //.send()
                    .expect(200)
                    .end(function (err, people) {
                         if (err) {
                        return done(err);
                         }
                     //  console.log(people.body);
                     //  console.log(user.body.is_suspened,data.is_suspended); kiem tra suspend
                      // should.notexist(people.body);
                     done();
                 });
             });
         });
    });

    afterEach(function (done) {
        done();
    });
});
