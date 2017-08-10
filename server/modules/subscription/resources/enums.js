'use strict';

exports.paymentMethod = {
    'atm': 'atm',
    'credit' : 'credit'
};


exports.PaymentStatus = {
     payment_success : 0,
     payment_failured : 101,
     payment_pending : 102
};

exports.PaymentAtmStatus = {
    payment_success : 0,
    bank_declined : 1,
    merchant_not_exist : 3,
    invalid_access_code : 4,
    invalid_amount : 5,
    invalid_currency_code : 6,
    unspecified_failure : 7,
    invalid_card_number : 8,
    invalid_card_name : 9,
    expired_card : 10,
    card_not_registed_service : 11,
    invalid_card_date : 12,
    exist_amount : 13,
    insufficient_fund : 21,
    user_cancel : 99,
    payment_failured : 100,
    no_secure_secret : 101,
    payment_pending : 102
};

exports.PaymentCreditStatus = {
    payment_success : "0",
    payment_status_unknown : "?",
    bank_sys_reject : "1",
    bank_declined : "2",
    no_replay : "3",
    expired_card : "4",
    insufficient_fund : "5",
    error_communicating : "6",
    server_sys_error : "7",
    transaction_type_not_supported : "8",
    bank_declined_not_contact : "9",
    transaction_aborted : "A",
    transaction_cancelled : "C",
    deferred_transaction : "D",
    secure_authentication_failed : "F",
    card_security_code_verification_failed : "I",
    shopping_transaction_locked : "L",
    cardholder_is_not_enrolled_in_authentication_scheme : "N",
    transaction_has_been_received : "P",
    transaction_was_not_processed : "R",
    duplicate_sessionid : "S",
    address_verification_failed : "T",
    card_security_code_failed : "U",
    address_verification_and_card_security_code_failed : "V",
    user_cancel : "99",
    payment_failured : "100",
    no_secure_secret : "101",
    payment_pending : "102"
};
