'use strict';
//
//  enums.js
//  define ticket enums
//
//  Created by thanhdh on 2016-01-18.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

exports.SMS_Type = {
    Receive : 0,
    Send : 1
};

exports.SmsCustomerType = {
    socially : 0,
    financial : 1,
    other : 2
};

exports.SMS_Status_Response = {
    WAITTING : 100,
    DELIVERED : 0,
    NOT_DELIVERED : 2,
    NOT_DELIVERED_PHONE_NUMBER_NOT_ACTIVE : 3, // SĐT của thuê bao không còn hoạt động (Vietnamobile & GMobile)
    NOT_DELIVERED_PHONE_NUMBER_REJECT : 4, // Từ chối bởi SĐT thuê bao (Vietnamobile & GMobile)
    NOT_DELIVERED_NETWORK_ERR : 8, // Lỗi mạng
    NOT_DELIVERED_MSG_REPEAT : 304, // Tin nhắn gửi bị lặp (cùng 1 SĐT trong thời gian ngắn khôn gửi cùng nội dung)
    NOT_DELIVERED_TEMPLATE : 509, // Nội dung bi sai Template hoặc Template chưa đăng ký
    NOT_DELIVERED_PHONE_NUMBER_SPECIAL_CHARACTERS : 105,
    NOT_DELIVERED_INVALID_MSG_LENGTH : 106,
    NOT_DELIVERED_PHONE_NUMBER_NOT_ACTION : 107,
    NOT_DELIVERED_NOT_YET_URLENCODED_MSG_CONTENT : 108,
    NOT_DELIVERED_CONTENT_HAS_UNICODE : 109
};

exports.SMS_Status_Response_Callback = {
    Success : 0,
    Fail : 1,
    Waiting : 2,
};

exports.SMS_Report = {
    'sms_stats': 1,
    'total_sms_send_and_received': 2,
    'sms_carrier': 3,
    'sms_cycle': 4
};

exports.Provider = {
    vht : 'vht',
    vietguys : 'vietguys'
}
