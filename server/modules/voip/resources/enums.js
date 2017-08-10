exports.VoipStatus = {
    "CALL_REJECTED" : 0,
    "INVALID_NUMBER_FORMAT" : 1,
    "LOSE_RACE" : 2,
    "NORMAL_CLEARING" : 3,
    "NO_ANSWER" : 4,
    "NO_ROUTE_DESTINATION" : 5,
    "ORIGINATOR_CANCEL" : 6,
    "USER_BUSY" : 7,
    "USER_NOT_REGISTERED" : 8,
    "DESTINATION_OUT_OF_ORDER" : 9,
    "NO_USER_RESPONSE" : 10,
    "NORMAL_TEMPORARY_FAILURE" : 11,
    "NONE" : 99
};

exports.VoipType = {
    "incoming_call" : 1,
    "outgoing_call" : 2,
    "incoming_missed_call" : 3,
    "outgoing_missed_call" : 4
};

exports.VoipReport = {
    'agent_activity' : 1,
    'queue_activity' : 2,
    'missed_call' : 3
};

exports.VoipisTicket = {
    'is_convert_to_ticket' : 1,
    'is_not_convert_to_ticket' : 2
};

exports.VoipStatsCallType = {
    "call_in" : 1,
    "call_out" : 2
};

exports.Provider = {
    ntt : 'ntt',
    digitel : 'digitel',
    epacific : 'epacific',
    vht : 'vht'
}

exports.Constants = {
    id_delimiter : '-local-'
}
