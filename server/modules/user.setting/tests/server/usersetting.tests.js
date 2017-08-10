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
    // Xem address của account
    it('1. Xem address của account ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            agent.get(`user/address`)
            .send()
            .expect(200)
            .end(function (err, user_address) {

//                console.log(user_address.body);
                should.exist(user_address.body._id);
                should.exist(user_address.body.company_name);
                should.exist(user_address.body.phone);
                should.equal(user_address.body.ed_user_id,user.body._id);
                done();
            });

        });
    });
     // chỉnh sửa address của account
    it('2. Edit address của account chỉnh sai những thông số ko cho edit', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data = {
                _id: '56cc1af410afty45ggs  gdf 5e6f5',
                upd_time: 145621556820,
                add_time: 14562145820,
                ed_user_id: '56cc1af41g rgfdg 0af449b27d5e6f3',
                country:'hello'

            };
//            console.log(user.body);
            agent.put(`user/address`)
            .send(data)
            .expect(200)
            .end(function (err_address, user_address) {
//                console.log(user_address.body);
                console.log('Fail do Bug');
                should.notEqual(user_address.body.ed_user_id,data.ed_user_id);
                should.notEqual(user_address.body._id,data._id);
                should.notEqual(user_address.body.upd_time,data.upd_time);
                should.notEqual(user_address.body.add_time,data.add_time);
                should.notEqual(user_address.body.country,data.country);
                done();
            });

        });
    });
    it('3. Edit address của account chỉnh sai để empty company và phone  ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data = {
                company_name: '',
                phone: ''

            };
//            console.log(user.body);
            agent.put(`user/address`)
            .send(data)
            .expect(200)
            .end(function (err_address, user_address) {

                console.log('Fail do Bug');
//                console.log(user_address.body);
                should.equal(user_address.body.errors.company_name[0],'Không được để trống');
//                should.equal(user_address.body.errors.phone[0],'không được để trống');
                done();
            });

        });
    });
    it('4. Edit address của account chỉnh sai để khoảng trống trong data ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data = {
                company_name: '          ',
                phone: '           ',
                vat_no: '      ',
                street: '    ',
                zip_code: '      ',
                city: '    ',
                state: ' ',
                province: '  '

            };
//            console.log(user.body);
            agent.put(`user/address`)
            .send(data)
            .expect(200)
            .end(function (err_address, user_address) {

                console.log('Fail do Bug');
//                console.log(user_address.body);
                should.equal(user_address.body.errors.company_name[0],'Không được để trống');
//                should.equal(user_address.body.errors.phone[0],'không được để trống');
                done();
            });

        });
    });
    it('5. Edit address của account chỉnh sai để khoảng trống ở đầu cuối string ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data = {
                company_name: '   fsdfs       ',
                phone: '     45345435      ',
                vat_no: '      ',
                street: '    ',
                zip_code: '      ',
                city: '    ',
                state: ' ',
                province: '  '

            };
//            console.log(user.body);
            agent.put(`user/address`)
            .send(data)
            .expect(200)
            .end(function (err_address, user_address) {
                console.log('Fail do Bug');
//                console.log(user_address.body);
                should.notEqual(user_address.body.company_name,data.company_name);
//                should.equal(user_address.body.errors.phone[0],'không được để trống');
                done();
            });

        });
    });
    it('6. Edit address của account chỉnh ky tu dac biet  ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data = {
                _id: '75676^&*^*& \\ //~!#$+__)-0  ',
                upd_time: 145621556820,
                add_time: 14562145820,
                ed_user_id: '56cc1af41g 75676^&*^*& \\ //~!#$+__)-0rgfdg 0af449b27d5e6f3',
                country:'75676^&*^*& \\ //~!#$+__)-0',
                company_name: '   75676^&*^*& \\ //~!#$+__)-0       ',
                phone: '     75676^&*^*& \\ //~!#$+__)-0      ',
                vat_no: '    75676^&*^*& \\ //~!#$+__)-0  ',
                street: '  75676^&*^*& \\ //~!#$+__)-0  ',
                zip_code: '   75676^&*^*& \\ //~!#$+__)-0   ',
                city: ' 75676^&*^*& \\ //~!#$+__)-0   ',
                state: '  75676^&*^*& \\ //~!#$+__)-0   ',
                province: ' 75676^&*^*& \\ //~!#$+__)-0   '

            };
//            console.log(user.body);
            agent.put(`user/address`)
            .send(data)
            .expect(200)
            .end(function (err_address, user_address) {
                console.log('Fail do Bug');
//                console.log(user_address.body);
//                should.notEqual(user_address.body.company_name,data.company_name);
                should.equal(user_address.body.errors.country[0],'không được để trống');
                done();
            });

        });
    });
     // Agent Xem setting address của account
    it('7. Agent xem setting address của account ', function (done) {
        var us ={
            sub_domain: 'amy',
            email: 'amytest2009@gmail.com',
            password: 'R7jNrVxKgtqehJHbaEZbkEATy5rfw8VJhz'
        };
        agent.post(`auth/signin`)
        .send(us)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error

            if (err) {
                 return done(err);
            }
//            console.log(user.body);
            agent.get(`user/address`)
            .send()
            .expect(200)
            .end(function (err, user_address) {

//                console.log(user_address.body);
                should.equal(user_address.body.errors.single,'common.users.notgranted');
//
                done();
            });

        });
    });

    // Xem setting agent của account
    it('8. Xem setting agent của account ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            agent.get(`user/agent`)
            .send()
            .expect(200)
            .end(function (err, user_agent) {

//                console.log(user_agent.body);
                should.exist(user_agent.body._id);
                should.exist(user_agent.body.email_forwarding);
                should.exist(user_agent.body.is_delete_ticket);
                done();
            });

        });
    });
     // edit setting agent của account
    it('9. edit setting agent của account sai dữ liệu ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data = {
                _id: '     gjghj  ',
                upd_time: '   ghjhkk ',
                add_time: 'ghfhhf',
                ed_user_id: 'kjhkh',
                signature: '          ',
                email_forwarding: '',
                is_delete_ticket: ''
            }
            agent.put(`user/agent`)
            .send(data)
            .expect(200)
            .end(function (err, user_agent) {

                console.log('dang bug');
                should.notEqual(user_agent.body._id,data._id);
                should.notEqual(user_agent.body.upd_time,data.upd_time);
                should.notEqual(user_agent.body.ed_user_id,data.ed_user_id);
                should.equal(user_agent.body.signature,'');
                should.notEqual(user_agent.body.email_forwarding,data.email_forwarding);
                should.notEqual(user_agent.body.is_delete_ticket,data.is_delete_ticket);

                done();
            });

        });
    });
     // Agent Xem setting agent của account
    it('10. Agent xem setting agent của account ', function (done) {
        var us ={
            sub_domain: 'amy',
            email: 'amytest2009@gmail.com',
            password: 'R7jNrVxKgtqehJHbaEZbkEATy5rfw8VJhz'
        };
        agent.post(`auth/signin`)
        .send(us)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error

            if (err) {
                 return done(err);
            }
//            console.log(user.body);
            agent.get(`user/agent`)
            .send()
            .expect(200)
            .end(function (err, user_agent) {

//                console.log(user_agent.body);
                should.equal(user_agent.body.errors.single,'common.users.notgranted');
//
                done();
            });

        });
    });
     it('11. edit setting agent của account sai dữ liệu ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data = {
                _id: '     gjghj  ',
                upd_time: '   ghjhkk ',
                add_time: 'ghfhhf',
                ed_user_id: 'kjhkh',
                signature: '          ',
                email_forwarding: 'fdfsd',
                is_delete_ticket: 'dfsdfsd'
            }
            agent.put(`user/agent`)
            .send(data)
            .expect(200)
            .end(function (err, user_agent) {
//                console.log(user_agent.body);
                console.log('Ban đầu email và delete phai la False');
                should.notEqual(user_agent.body.email_forwarding,true);
                should.notEqual(user_agent.body.is_delete_ticket,true);

                done();
            });

        });
    });
    // xem setting API
    it('12. Xem setting API của account ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            agent.get(`user/api`)
            .send()
            .expect(200)
            .end(function (err, user_api) {

                console.log('xem setting default. Fail do da duoc edit ');
                should.exist(user_api.body._id);
                should.exist(user_api.body.ed_user_id);
                should.equal(user_api.body.is_enable,false);
                done();
            });

        });
    });
    // edit API
    it('13. edit setting API của account ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data={
                is_enable: 'hdfikdsk'
            };
            agent.put(`user/api`)
            .send(data)
            .expect(200)
            .end(function (err, user_api) {

                console.log('trước khi chạy đang disable');
//                console.log(user_api.body);
                should.exist(user_api.body._id);
                should.exist(user_api.body.ed_user_id);
                should.equal(user_api.body.is_enable,false);
                done();
            });

        });
    });
    it('14. edit setting API của account ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data={
                is_enable: true
            };
            agent.put(`user/api`)
            .send(data)
            .expect(200)
            .end(function (err, user_api) {
                should.exist(user_api.body._id);
                should.exist(user_api.body.ed_user_id);
                should.equal(user_api.body.is_enable,true);
                done();
            });

        });
    });
    it('15. add token setting API của account ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }

            agent.post(`user/api-token`)
            .send()
            .expect(200)
            .end(function (err, user_api) {
                console.log('dang bug , chi show 1 cái duy nhat ');
                done();
            });

        });
    });
    // xem setting branding
    it('16. xem branding của account ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }

            agent.get(`user/branding`)
            .send()
            .expect(200)
            .end(function (err, user_brand) {
//                console.log(user_brand.body);
                should.exist(user_brand.body._id);
                should.exist(user_brand.body.ed_user_id);
                should.exist(user_brand.body.account_name);
                done();
            });

        });
    });
    // edit setting branding
    it('17. edit branding của account giá trị sai 1 ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data = {
                color: '#78aFFFgrterftgrfgrfg',
                logo:'fdsdfsd',
                favicon:'2r3r2',
//                sub_domain:'amygdfgd'
            };
            agent.get(`user/branding`)
            .send()
            .expect(200)
            .end(function (err, user_brand) {
                console.log('đang bug');
                should.notEqual(user_brand.body.color,data.color);
                should.notEqual(user_brand.body.logo,data.logo);
                should.notEqual(user_brand.body.favicon,data.favicon);
//                should.notEqual(user_brand.body.sub_domain,data.sub_domain);

                done();
            });

        });
    });
//     // edit setting branding
//    it('18. Thay đổi subdomain trùng với subdomain hiện tại ', function (done) {
//        agent.post(`auth/signin`)
//        .send(credentials)
//        .expect(200)
//        .end(function (err, user) {
//                // Handle signin error
//            if (err) {
//                 return done(err);
//            }
//            var data = {
//                sub_domain:'amy'
//            };
//            agent.get(`user/branding/change-subdomain`)
//            .send()
//            .expect(200)
//            .end(function (err, user_brand) {
//                console.log('đang bug');
//                should.exist(user_brand.body.errors);
//                done();
//            });
//
//        });
//    });
//    it('19. Thay đổi subdomain trùng với subdomain trung voi account khac ', function (done) {
//        agent.post(`auth/signin`)
//        .send(credentials)
//        .expect(200)
//        .end(function (err, user) {
//                // Handle signin error
//            if (err) {
//                 return done(err);
//            }
//            var data = {
//                sub_domain:'amythai1010'
//            };
//            agent.get(`user/branding/change-subdomain`)
//            .send()
//            .expect(200)
//            .end(function (err, user_brand) {
////                console.log('đang bug');
//                should.equal(user_brand.body.errors.sub_domain,'common.unique');
//                done();
//            });
//
//        });
//    });
//    it('20. Thay đổi subdomain trùng với subdomain trong blacklist ', function (done) {
//        agent.post(`auth/signin`)
//        .send(credentials)
//        .expect(200)
//        .end(function (err, user) {
//                // Handle signin error
//            if (err) {
//                 return done(err);
//            }
//            var data = {
//                sub_domain:'hochiminh'
//            };
//            agent.get(`user/branding/change-subdomain`)
//            .send()
//            .expect(200)
//            .end(function (err, user_brand) {
////                console.log('đang bug');
//                should.equal(user_brand.body.errors.sub_domain[0],'user.sub_domain.blacklist');
//                done();
//            });
//
//        });
//    });
//    it('21. Thay đổi subdomain trùng với subdomain khoảng trống ', function (done) {
//        agent.post(`auth/signin`)
//        .send(credentials)
//        .expect(200)
//        .end(function (err, user) {
//                // Handle signin error
//            if (err) {
//                 return done(err);
//            }
//            var data = {
//                sub_domain:'    '
//            };
//            agent.get(`user/branding/change-subdomain`)
//            .send()
//            .expect(200)
//            .end(function (err, user_brand) {
////                console.log('đang bug');
//                should.equal(user_brand.body.errors.sub_domain[0],'user.branding.sub_domain.required');
//                should.equal(user_brand.body.errors.sub_domain[1],'user.branding.sub_domain.not_valid');
//
//                done();
//            });
//
//        });
//    });
//    it('22. Thay đổi subdomain trùng với subdomain khoảng trống đầu đuôi', function (done) {
//        agent.post(`auth/signin`)
//        .send(credentials)
//        .expect(200)
//        .end(function (err, user) {
//                // Handle signin error
//            if (err) {
//                 return done(err);
//            }
//            var data = {
//                sub_domain:'   hien   '
//            };
//            agent.get(`user/branding/change-subdomain`)
//            .send()
//            .expect(200)
//            .end(function (err, user_brand) {
//                console.log('đang bug');
//                should.equal(user_brand.body.sub_domain,data.sub_domain);
//
//                done();
//            });
//
//        });
//    });
//    it('22. Thay đổi subdomain trùng với subdomain khoảng trống đầu đuôi', function (done) {
//        agent.post(`auth/signin`)
//        .send(credentials)
//        .expect(200)
//        .end(function (err, user) {
//                // Handle signin error
//            if (err) {
//                 return done(err);
//            }
////            var data = {
////                sub_domain:'   hien   '
////            };
//            agent.get(`user/branding/change-subdomain`)
//            .send()
//            .expect(200)
//            .end(function (err, user_brand) {
//                console.log('đang bug');
//                should.equal(user_brand.body.sub_domain,data.sub_domain);
//
//                done();
//            });
//
//        });
//    });
    // xem calendar
    it('23. xem calendar cua account moi ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            agent.get(`user/calendar`)
            .send()
            .expect(200)
            .end(function (err, user_calendar) {
                console.log('đang bug- Acount moi tao ');
                should.equal(user_calendar.body.is_enable,false);
                done();
            });

        });
    });
//    // bat calendar len
    it('24. Enable calendar cua account moi  với gtrị sai 1', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data={
                is_enable : 'kdfjkdfj'
            };
//            console.log(user.body);
            agent.post(`user/calendar/toggle`)
            .send(data)
            .expect(200)
            .end(function (err, user_calendar) {
                console.log('đang bug- Acount ban đầu là false ');
                should.equal(user_calendar.body.is_enable,false);
                done();
            });

        });
    });
    it('25. Enable calendar cua account moi  với gtri sai 2', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data={
                is_enable : '    '
            };
            agent.post(`user/calendar/toggle`)
            .send(data)
            .expect(200)
            .end(function (err, user_calendar) {
                console.log('đang bug- Acount ban đầu là false ');
                should.equal(user_calendar.body.is_enable,false);
                done();
            });

        });
    });
    it('26. Enable calendar cua account moi  với gtri đúng', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data={
                is_enable : true
            };
            agent.post(`user/calendar/toggle`)
            .send(data)
            .expect(200)
            .end(function (err, user_calendar) {
                console.log('đang bug- Acount ban đầu là false ');
                should.equal(user_calendar.body.is_enable,true);
                done();
            });

        });
    });
    // thêm holiday khi chưa enable business hour
    it('27. them Holiday khi chua enable business hour', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data={
                is_enable : false
            };
            agent.post(`user/calendar/toggle`)
            .send(data)
            .expect(200)
            .end(function (err, user_calendar) {
                var data_holiday={
                    name: "Huy Nhon",
                    start_date:"2016-03-23T15:39:26.179+0700",
                    end_date:"2016-04-23T15:39:26.179+0700"
                };
//                console.log(user_calendar.body);
                agent.post(`user/holiday`)
                .send(data_holiday)
                .expect(200)
                .end(function (err_holiday, user_holiday) {
//                    console.log(user_holiday.body);
//                    console.log(err_holiday);

                    console.log('khong cho them holiday - dang bug');
                    should.exist(user_holiday.body.errors);
                    done();
                });

            });

        });
    });
    // thêm holiday khi chưa enable business hour
    it('28. them Holiday gia tri trỗng ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data={
                is_enable : true
            };
            agent.post(`user/calendar/toggle`)
            .send(data)
            .expect(200)
            .end(function (err, user_calendar) {
                var data_holiday={
                    name: "",
                    start_date:"  ",
                    end_date:"  "
                };
//                console.log(user_calendar.body);
                agent.post(`user/holiday`)
                .send(data_holiday)
                .expect(200)
                .end(function (err_holiday, user_holiday) {
//                    console.log(user_holiday.body);
//                    console.log(err_holiday);

                    console.log('khong cho them holiday - dang bug');
//                    should.exist(user_holiday.body.errors);
                    done();
                });

            });

        });
    });
     it('29. them Holiday gia tri ngay sai  ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data={
                is_enable : true
            };
            agent.post(`user/calendar/toggle`)
            .send(data)
            .expect(200)
            .end(function (err, user_calendar) {
                var data_holiday={
                    name: "",
                    start_date:"2016-03-23T15:39:26.179+0700",
                    end_date:"2016-02-23T15:39:26.179+0700"
                };
//                console.log(user_calendar.body);
                agent.post(`user/holiday`)
                .send(data_holiday)
                .expect(200)
                .end(function (err_holiday, user_holiday) {
//                    console.log(user_holiday.body);
//                    console.log(err_holiday);

                    console.log('khong cho them holiday - dang bug');
//                    should.exist(user_holiday.body.errors);
                    done();
                });

            });

        });
    });
     it('30. thêm Holiday gia tri dung  ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data={
                is_enable : true
            };
            agent.post(`user/calendar/toggle`)
            .send(data)
            .expect(200)
            .end(function (err, user_calendar) {
                var data_holiday={
                    name: "hien",
                    start_date:"2016-03-23T15:39:26.179+0700",
                    end_date:"2016-04-23T15:39:26.179+0700"
                };
//                console.log(user_calendar.body);
                agent.post(`user/holiday`)
                .send(data_holiday)
                .expect(200)
                .end(function (err_holiday, user_holiday) {
//                    console.log(user_holiday.body);
//                    console.log(err_holiday);

                    console.log('khong cho them holiday - dang bug');
//                    should.exist(user_holiday.body.errors);
                    done();
                });

            });

        });
    });
//    it('31. xoa Holiday gia tri dung  ', function (done) {
//        agent.post(`auth/signin`)
//        .send(credentials)
//        .expect(200)
//        .end(function (err, user) {
//                // Handle signin error
//            if (err) {
//                 return done(err);
//            }
//
//            agent.delete(`user/holiday/id`)
//            .send()
//            .expect(200)
//            .end(function (err, user_holiday) {
//
//                console.log(user_holiday.body);
//            });
//
//        });
//    });
    // Xem localization
    it('31. xem localization gia tri dung  ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }

            agent.get(`user/localization`)
            .send()
            .expect(200)
            .end(function (err, user_local) {

                should.exist(user_local.body._id);
                done();
            });

        });
    });
//     it('32. edit localization gia tri dung  ', function (done) {
//        agent.post(`auth/signin`)
//        .send(credentials)
//        .expect(200)
//        .end(function (err, user) {
//                // Handle signin error
//            if (err) {
//                 return done(err);
//            }
//
//            agent.put(`user/localization`)
//            .send()
//            .expect(200)
//            .end(function (err, user_local) {
//
//                should.exist(user_local.body._id);
//            });
//
//        });
//    });
    // xem mail account support
    it('33. xem mail account support ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }

            agent.get(`user/mail-accounts`)
            .send()
            .expect(200)
            .end(function (err, user_mail_account) {
                console.log(user_mail_account.body);
                //should.exist(user_mail_account.body._id);
                done();
            });

        });
    });
    // Thêm mail account mới thành công
    it('34. add mail account support thành công', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data={
                mail: 'amyagent2009@gmail.com',
                name: 'hien'
            };
            agent.post(`user/mail-accounts`)
            .send(data)
            .expect(200)
            .end(function (err, user_mail_account) {
                console.log('đổi lại email khac ');
                should.exist(user_mail_account.body._id);
                done();
            });

        });
    });
    // thêm mail acount không thành công voi gia tri sai
    it('35. add mail account support email sai', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data={
                mail: 'amyagent2009',
                name: 'hien'
            };
            agent.post(`user/mail-accounts`)
            .send(data)
            .expect(200)
            .end(function (err, user_mail_account) {
                console.log(user_mail_account.body);
                should.equal(user_mail_account.body.errors.mail[0],'user.mail_account.mail.not_valid');
                done();
            });

        });
    });
    it('36. add mail account support với empty', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data={
                mail: '   ',
                name: '   '
            };
            agent.post(`user/mail-accounts`)
            .send(data)
            .expect(200)
            .end(function (err, user_mail_account) {
                console.log(user_mail_account.body);
                should.equal(user_mail_account.body.errors.mail[0],'user.mail_account.mail.required');
                should.equal(user_mail_account.body.errors.name[0],'user.mail_account.name.required');
                done();
            });

        });
    });
    it('37. add mail account support với empty', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            agent.post(`user/mail-accounts`)
            .send()
            .expect(200)
            .end(function (err, user_mail_account) {
                console.log('dang bug');
                console.log(user_mail_account.body);

                should.equal(user_mail_account.body.errors.mail[0],'user.mail_account.mail.required');
                should.equal(user_mail_account.body.errors.name[0],'user.mail_account.name.required');
                done();
            });

        });
    });


    // cái giá trị ko truyền được

    it('38. add mail account support với gtri ko truyền được ', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            var data={
                ed_user_id:'456345435',
                mail: ' hien@hien.com  ',
                name: ' dfdfs  ',
                is_valid_spf:true,
                is_default: true,
                is_verified: true,
                provider: 'gmail'

            };
            agent.post(`user/mail-accounts`)
            .send(data)
            .expect(200)
            .end(function (err, user_mail_account) {
                console.log(user_mail_account.body);
                console.log('dang bug');
                should.exist(user_mail_account.body.mail,'hien@hien.com');
                should.equal(user_mail_account.body.is_valid_spf,false);
                should.equal(user_mail_account.body.is_default,false);
                should.equal(user_mail_account.body.is_verified,false);
//                should.equal(user_mail_account.body.provider,'local');

                done();
            });

        });
    });
    // xóa email default support
//    it('37. add mail account support với empty', function (done) {
//        agent.post(`auth/signin`)
//        .send(credentials)
//        .expect(200)
//        .end(function (err, user) {
//                // Handle signin error
//            if (err) {
//                 return done(err);
//            }
//            agent.delete(`user/mail-accounts/56cc1af410af949b27d5e700`)
//            .send()
//            .expect(200)
//            .end(function (err, user_mail_account) {
//                console.log('dang bug');
//
//                done();
//            });
//
//        });
//    });
    // xóa email đã được chọn làm default
    //chỉnh sửa mail support = thay đổi email
//    it('37. add mail account support với empty', function (done) {
//        agent.post(`auth/signin`)
//        .send(credentials)
//        .expect(200)
//        .end(function (err, user) {
//                // Handle signin error
//            if (err) {
//                 return done(err);
//            }
//            agent.put(`user/mail-accounts/56cc1af410af949b27d5e700`)
//            .send()
//            .expect(200)
//            .end(function (err, user_mail_account) {
//                console.log('dang bug');
//
//                done();
//            });
//
//        });
//    });
    // thay đổi nội dung ...
    // Xem setting mail
    it('37. xem mail account support với empty', function (done) {
        agent.post(`auth/signin`)
        .send(credentials)
        .expect(200)
        .end(function (err, user) {
                // Handle signin error
            if (err) {
                 return done(err);
            }
            agent.get(`user/mail`)
            .send()
            .expect(200)
            .end(function (err, user_mail) {
                /console.log('dang bug');
                console.log(user_mail_account.body);
                done();
            });

        });
    });
    // chỉnh sửa setting mail. -- đang bị lỗi

    afterEach(function (done) {
        done();
    });
});
