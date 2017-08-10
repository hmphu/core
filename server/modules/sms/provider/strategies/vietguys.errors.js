'use strict';
//
//  Created by khanhpq on 2016-07-29.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//
var _ = require('lodash');

module.exports = () => {
    return {
        MISS_FIELDS             : -1, // Chưa nhập đầy đủ thông tin các trường.
        CANNOT_CONNECT_SERVER   : -2, // Không thể kết nối máy chủ VIETGUYS trong thời gian này.
        ACCOUNT_LOGIN_INVALID   : -3, // Thông tin tài khoản chưa chính xác
        ACCOUNT_SUSSPEND        : -4, // Tài khoản đang bị khoá
        AUTH_FAIL               : -5, // Thông tin xác thực tài khoản chưa chính xác (mã lập trình)
        API_SUSSPEND            : -6, // Chức năng gửi API chưa được kích hoạt
        IP_INVALID              : -7, // IP bị giới hạn truy cập
        SENDER_INVALID          : -8, // Tên người gửi (from) chưa được khai báo.
        CREDITS_EXPIRE          : -9, // Tài khoản hết credits gửi tin (dành cho trả trước)
        RECEIVER_INVALID        : -10,// Số điện thoại người nhận chưa chính xác
        PHONE_NUMBER_BLACKLIST  : -11 // Số điện thoại nằm trong danh sách từ chối nhận tin
    }
}
