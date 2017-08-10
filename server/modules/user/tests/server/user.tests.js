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
describe('User CRUD tests - ', function () {

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
    //Đăng ký tài khoản mới thành công
    it('1.đăng ký thanh công  ', function (done) {
        var data = {
          sub_domain: "Cunyeu2009",
          first_name: "Nguyên",
          last_name: "Thái",
          email: "hienthai90@gmail.com",
          password: "Anh123",
          confirmed_password: 'Anh123',
          company_name: 'Cún yêu',
          phone: "0987654321",
          language:"vi",
          country:"VN"
        };
        agent.post(`auth/signup`)
        .send(data)
        .expect(200)
        .end(function (err, user) {
            console.log('Thay doi subdomain de chay ok ');
            should.exist(user.body._id);
            should.equal(user.body.sub_domain, data.sub_domain);
            should.equal(user.body.email, data.email);
            should.equal(user.body.first_name, data.first_name);
            should.equal(user.body.last_name, data.last_name);
            should.equal(user.body.language, data.language);
            should.equal(user.body.roles[0], ['owner']);
//            should.equal(user.body.is_requester, true);
            done();
        });
    });
    //đăng ký trùng email và subdomain với account đã tồn tại
    it('2.đăng ký trùng email và subdomain với account đã tồn tại  ', function (done) {
        var data = {
          sub_domain: "Cunyeu2009",
          first_name: "Nguyên",
          last_name: "Thái",
          email: "hienthai90@gmail.com",
          password: "Anh123",
          confirmed_password: 'Anh123',
          company_name: 'Cún yêu',
          phone: "0987654321",
          language:"vi",
          country:"VN"
        };
        agent.post(`auth/signup`)
        .send(data)
        .expect(200)
        .end(function (err, user) {
            should.equal(user.body.errors.sub_domain_1_email, 'common.unique');
            done();
        });
    });
    // đăng ký không có giá trị truyền vào
    it('3.đăng ký không có giá trị truyền vào ', function (done) {
        agent.post(`auth/signup`)
        .send({})
        .expect(200)
        .end(function (err, user) {
//            console.log(user.body);
            should.equal(user.body.errors.first_name[0], 'user.first_name.required');
            should.equal(user.body.errors.last_name[0], 'user.last_name.required');
            should.equal(user.body.errors.email[0], 'user.email.required');
            should.equal(user.body.errors.language[0], 'user.language.required');
            should.equal(user.body.errors.sub_domain[0], 'user.sub_domain.required');
            should.equal(user.body.errors.password[0], 'user.password.required');
            should.equal(user.body.errors.confirmed_password[0], 'user.confirmed_password.required');
            should.equal(user.body.errors.country[0], 'user.country.required');
            should.equal(user.body.errors.phone[0], 'user.phone.required');
            done();
        });
    });
     // đăng ký không đúng format các giá trị
    it('4.đăng ký với giá trị sai Format 1  ', function (done) {
        var data = {
          sub_domain: "amy1010",
          first_name: "    ",
          last_name: "   ",
          email: "amyagent2009@com",
          password: "An123",
          confirmed_password: '123',
          company_name: '  ',
          phone: "098767896653",
          language:"viet",
          country:"   "
        };
        agent.post(`auth/signup`)
        .send(data)
        .expect(200)
        .end(function (err, user) {
//            console.log(user.body);
            console.log('country kiem tra lai loi country ');
            should.equal(user.body.errors.sub_domain,'user.sub_domain.exist');
            should.equal(user.body.errors.password,'user.password.format');
            should.equal(user.body.errors.confirmed_password,'user.confirmed_password.equality');
            done();
        });
    });

    it('5.đăng ký với giá trị sai Format 2  ', function (done) {
        var data = {
          sub_domain: "amy1010",
          first_name: "  A  ",
          last_name: " B  ",
          email: "amyagent2009@gmail.com",
          password: "Anh123",
          confirmed_password: 'Anh123',
          company_name: '  ',
          phone: "098767896653",
          language:"viet",
          country:" Viet nam   "
        };
        agent.post(`auth/signup`)
        .send(data)
        .expect(200)
        .end(function (err, user) {
//            console.log(user.body);
            console.log('country kiem tra lai loi country ');
            should.equal(user.body.errors.language[0], 'user.language.inclusion');
            should.equal(user.body.errors.sub_domain[0], 'user.sub_domain.exist');
            should.equal(user.body.errors.company_name, 'validator.user_settings.branding.account_name_required'); // số, chữ hoa, chữ thường, >=6 ký tự
            should.equal(user.body.errors.country[0], 'user.country.exist'); // khoảng trắng sẽ không tính
            should.equal(user.body.errors.phone[0], 'user.phone.format');// 10, 11 số
            done();
        });
    });
    //Đăng ký tài khoản mới voi subdomain nam trong blacklist
    it('6.đăng ký voi subdomain nam trong blacklist   ', function (done) {
        var data = {
          sub_domain: "hochiminh",
          first_name: "Nguyên",
          last_name: "Thái",
          email: "hienthai90@gmail.com",
          password: "Anh123",
          confirmed_password: 'Anh123',
          company_name: 'Cún yêu',
          phone: "0987654321",
          language:"vi",
          country:"VN"
        };
        agent.post(`auth/signup`)
        .send(data)
        .expect(200)
        .end(function (err, user) {
//            console.log(user.body);
            should.equal(user.body.errors.sub_domain[0],'user.sub_domain.blacklist');
            done();
        });
    });
    // đăng nhập email đúng, mk đúng
    it('7. đăng nhập thành công ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
//                console.log(user.body);
            should.exist(user.body._id);
            done();
        });
    });
    // đang nhap truyền rỗng
    it('8. đăng nhập voi gia tri rỗng ', function (done) {
        agent.post(`auth/signin`)
        .send({})
        .expect(200)
        .end(function (err, user) {
//                console.log(user.body);
            should.equal(user.body.errors.single,'common.users.unauthenticated');
            done();
        });
    });
    // đăng nhập với gia tri null
    it('9. đăng nhập voi gtri null  ', function (done) {
        var data = {
            email:'',
            password:''
        };
        agent.post(`auth/signin`)
        .send(data)
        .expect(200)
        .end(function (err, user) {
//            console.log(user.body);
            should.equal(user.body.errors.single,'common.users.unauthenticated');
            done();
        });
    });
    //Đăng nhập email đúng, sai mật khẩu
    it('10. đăng nhập voi gtri sai ', function (done) {
        var data = {
            email:'hientt@fireflyinnov.com',
            password:'123'
        };
        agent.post(`auth/signin`)
        .send(data)
        .expect(200)
        .end(function (err, user) {
//                console.log(user.body);
            should.equal(user.body.errors.single,'common.users.unauthenticated');
            done();
        });
    });
    // đăng xuất
    it('11. đăng xuat ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
//                console.log(user.body);
            should.exist(user.body._id);
            agent.get(`auth/signout`)
            .send()
            .expect(200)
            .end(function (err, user_edit) {

//                console.log(user_edit.body);
                user_edit.body.should.eql({});
                done();
            });

        });
    });
    // Forgot mk voi email dung
//    it('12. Forgot mk voi email dung ', function (done) {
//        var data = {
//            email:'hientt@fireflyinnov.com',
//        };
//        agent.post(`auth/forgot`)
//        .send(data)
//        .expect(200)
//        .end(function (err, user) {
//            console.log(user.body);
//            should.equal(user.body.message,'email.send.further_instructions');//gui mail chua token de reset password
//            done();
//        });
//    });
    // bam token dung
    it('13. Click token dung  ', function (done) {
        agent.get(`auth/reset/7c57af5e8ff9ad9c423ddf7f7fc8bf36ae4965ff`)
        .send()
        .expect(200)
        .end(function (err, user) {
            console.log('thay doi token dung');
            should.equal(user.body.message,'user.reset_password.reset_successfully');// gui mail chua password
            done();
        });
    });
    // bam token sai
    it('13. Click token dung  ', function (done) {
        agent.get(`auth/reset/7c57af5e8ff9ad9c423ddf7f7fc8bf36ae4965ff`)
        .send()
        .expect(200)
        .end(function (err, user) {

            should.equal(user.body.errors.single,'user.reset_password.reset_failed');// gui mail chua password
            done();
        });
    });
    // forgot mk voi email sai
    it('14. Forgot mk voi email cua agent suspended, ', function (done) {
        var data = {
            email:'amyagent2009@gmail.com'
        };
        agent.post(`auth/forgot`)
        .send(data)
        .expect(200)
        .end(function (err, user) {
//            console.log(user.body);
            should.equal(user.body.errors.single,'user.account.no_account_been_found');
            done();
        });
    });
    // đổi mk thành công
    it('15. Đổi mật khẩu thành công ', function (done) {
        var data ={
            sub_domain: 'amythai1010',
            email: 'hientt@fireflyinnov.com',
            password: 'Amy1990'
        };
        let agent = request.agent(`http://${data.sub_domain}.infirefly.com:6969/api/`);
        agent.post(`auth/signin`)
        .send(data)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data_edit = {
                currentPassword: 'Amy1990',
                newPassword: 'Amyjack88',
                verifyPassword: 'Amyjack88'
            };
            agent.post(`users/password`)
            .send(data_edit)
            .expect(200)
            .end(function (err, user_edit) {

                console.log('Thay đổi password');
                should.equal(user_edit.body.message,'user.password.changed_successfully');
//                user_edit.body.should.eql({});
                done();
            });

        });
    });
    // đổi mk sai mk hiện tại
    it('16. Đổi mật khẩu sai mk hiện tại  ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data_edit = {
                currentPassword: 'Amyjack90',
                newPassword: 'Amyjack88',
                verifyPassword: 'Amyjack88'
            };
            agent.post(`users/password`)
            .send(data_edit)
            .expect(200)
            .end(function (err, user_edit) {

//                console.log(user_edit.body);
                should.equal(user_edit.body.errors.single,'user.password.incorrect');
                done();
            });

        });
    });
    // đổi mk sai format mk mới
    it('17. Đổi mật khẩu sai mk hiện tại', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data_edit = {
                currentPassword: 'Amythai90',
                newPassword: 'amythai90',
                verifyPassword: 'amythai90'
            };
            agent.post(`users/password`)
            .send(data_edit)
            .expect(200)
            .end(function (err, user_edit) {

                console.log(user_edit.body);
                should.equal(user_edit.body.errors.single,'user.password.is_not_format');
                done();
            });

        });
    });
    // đổi mk sai mk mới ko trung nhau
    it('18. Đổi mật khẩu với mk khong trung', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data_edit = {
                currentPassword: 'Amythai90',
                newPassword: 'Amy1990',
                verifyPassword: 'amythai90'
            };
            agent.post(`users/password`)
            .send(data_edit)
            .expect(200)
            .end(function (err, user_edit) {

                console.log(user_edit.body);
                should.equal(user_edit.body.errors.single,'user.password.do_not_match');
                done();
            });

        });
    });
    afterEach(function (done) {
        done();
    });
});
