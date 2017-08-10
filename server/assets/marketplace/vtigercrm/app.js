var vtigerSessionId = null;
var vtigerUserId = null;
var loginErr  = true;
var awaitLogin = false ;
var vtigerBaseUrl = $.apps.get_param(app.secret,app.params.url);
var vtigerUrl = getUrlInfo(vtigerBaseUrl);
var vtigerAccessKey = $.apps.get_param(app.secret,app.params.access_key);
var vtigerApiPath =  "/webservice.php";
var requesterEmails = Array();

var app_id = "#"+ app.data.name;

$(app_id+ ' .btn_refresh').bind("click", function(e){
    e.preventDefault();
    fetchAllCRMData();
});

loginVtigerCRM();

if (app.params_url && app.params_url.ticket_id) {
    $.ajax({
        type : 'GET',
        url : '/api/ticket/contact-requester/' + app.params_url.ticket_id,
        cache : false,
        dataType : 'json',
        success : function(result) {
            if (result.is_error == false) {
               requesterEmails = result.data.emails;
               fetchAllCRMData();
            }
        },
        error : function(XMLHttpRequest, textStatus, errorThrown) {
            console.log(textStatus);
        }
    });
}

/**
 *  Break apart any path into parts
 *  'http://myhost.com:8080/vtigercrm?startIndex=1&pageSize=10' ->
 *    {
 *      "host": "myhost.com",
 *      "port": "8080",
 *      "search": {
 *        "startIndex": "1",
 *        "pageSize": "10"
 *      },
 *      "path": "/vtigercrm",
 *      "protocol": "http:"
 *    }
 */
function getUrlInfo(url) {

    //  create a link in the DOM and set its href
    var link = document.createElement('a');
    link.setAttribute('href', url);

    //  return an easy-to-use object that breaks apart the path
    var objUrl = {
        host:     link.hostname,  //  'mydomain.com'
        port:     link.port,      //  8080
        search:   link.search? processSearchParams(link.search): {},  //  {startIndex: 1, pageSize: 10}
        path:     link.pathname,  //  '/vtigercrm'
        protocol: link.protocol.toLowerCase().trim()   //  'http:'
    };

    delete link ;//delete memory

    return objUrl;

}

/**
 *  Convert search param string into an object or array
 *  '?startIndex=1&pageSize=10' -> {startIndex: 1, pageSize: 10}
 */
function processSearchParams(search, preserveDuplicates) {
    //  option to preserve duplicate keys (e.g. 'sort=name&sort=age')
    preserveDuplicates = preserveDuplicates || false;  //  disabled by default

    var outputNoDupes = {};
    var outputWithDupes = [];  //  optional output array to preserve duplicate keys

    //  sanity check
    if(!search) throw new Error('processSearchParams: expecting "search" input parameter');

    //  remove ? separator (?foo=1&bar=2 -> 'foo=1&bar=2')
    search = search.split('?')[1];

    //  split apart keys into an array ('foo=1&bar=2' -> ['foo=1', 'bar=2'])
    search = search.split('&');

    //  separate keys from values (['foo=1', 'bar=2'] -> [{foo:1}, {bar:2}])
    //  also construct simplified outputObj
    outputWithDupes = search.map(function(keyval){
        var out = {};
        keyval = keyval.split('=');
        out[keyval[0]] = keyval[1];
        outputNoDupes[keyval[0]] = keyval[1]; //  might as well do the no-dupe work too while we're in the loop
        return out;
    });

    return (preserveDuplicates) ? outputWithDupes : outputNoDupes;
}

/*
* getchallenge
*/
function getChallenge(callback){
    var vtigerPath = vtigerUrl.path + vtigerApiPath+ "?operation=getchallenge&username=#param.username#";

     var option_request = {
        request_opts : {
            host : vtigerUrl.host,
            path: vtigerPath,
            port : vtigerUrl.port,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method : 'GET'
        },
        data_type : "json",
        is_https : vtigerUrl.protocol === "https:"
    };

    var success = function(response){
        if ( !response  && typeof response != 'object'){
            $(app_id + ' .info-list').html("<li class='no-result'><span class='text-danger'>Can not connect</span></li>");
            return callback(true);
        }

        if ( !response.success){
            var message = response.error.message;
            $(app_id + ' .info-list').html("<li class='no-result'><span class='text-danger'>"+message+"</span></li>");
            return callback(true);
        }

        var challengeToken = response.result.token;
        callback(false, challengeToken);
    };

    var error = function(errMsg){
         return callback(true);
    };

    $.apps.fetch_data(app.data.name, option_request, success, error );
}
/*
 * get sessionId
 */
function loginVtigerCRM(){
    getChallenge(function(err, token){
        if( err ){
            setTimeout(function(){
                $('#vtiger-refresh').removeAttr("disabled");
                $(app_id + ' .info-list').html("<li class='no-result'><span class='text-danger'>Can not connect</span></li>");
            }, 2000);

            return;
        }

        var generatedKey = CryptoJS.MD5(token+vtigerAccessKey).toString();
        console.log(token);
        var vtigerPath =vtigerUrl.path + vtigerApiPath;

        var dataToPost = {
                operation: 'login',
                username: '#param.username#',
                accessKey: generatedKey
            };

       var option_request = {
            request_opts : {
                host : vtigerUrl.host,
                path: vtigerPath,
                port : vtigerUrl.port,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                method : 'POST'
            },
            post_data : dataToPost,
            data_type : "json",
            is_https : vtigerUrl.protocol === "https:"
        };

        awaitLogin = true; //wating async login

        $.apps.fetch_data(app.data.name, option_request, success, error );
    });

    var success = function(data){
        if ( !data  && typeof data != 'object'){
            loginErr = true;
            awaitLogin = false;
            return;
        }

        if ( !data.success ){

            //console.log("Error: "+ data.error.message +"\n.");
            loginErr = true;
            awaitLogin = false;
            return;
        }

        vtigerSessionId = data.result.sessionName;
        vtigerUserId = data['result']['userId'];
        awaitLogin = false;
        loginErr = false;
    };

    var error = function(errMsg){
         loginErr = true;
         awaitLogin = false;
         $(app_id+ " .btn_refresh").removeAttr("disabled");
         $(app_id + ' .info-list').html("<li class='no-result'><span class='text-danger'>Can not connect</span></li>");
    };




}

/*
 * fetch all Requester info each  requester email
 *
 */
function fetchAllCRMData(){
    $(app_id+ ' .btn_refresh').attr("disabled", "disabled");
    // reset list requeter info html
    $(app_id + ' .info-list').html('');

    if(requesterEmails && Array.isArray(requesterEmails)){
        if( !vtigerSessionId  && !awaitLogin ){
              loginVtigerCRM();
        }
        var checkSession = setInterval(function(){
                  if(!awaitLogin){
                      clearInterval(checkSession);
                      done();
                  }
           },1000);

        function done(){
            if( loginErr ){
                $(app_id+ " .btn_refresh").removeAttr("disabled");
            }
            else{
                $.each(requesterEmails, function(key, email){
                    getVtigerCRMData(key, email);
                });
            }
        }
    }
    else{
         $(app_id + ' .info-list').html("<li class='no-result'>No result info.</li>");
    }
}


/*
 * get requester info from VtigerCRM
 * params emails
 *      list email
 */

function getVtigerCRMData(index, email){
    var vtigerPath =vtigerUrl.path + vtigerApiPath ;
    var dataToPost = {
            operation : "crmdata",
            sessionName : vtigerSessionId,
            email : email
        };

    var option_request = {
        request_opts : {
            host : vtigerUrl.host,
            path: vtigerPath,
            port : vtigerUrl.port,
            method : "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        },
        post_data : dataToPost,
        data_type : "json",
        is_https : vtigerUrl.protocol === "https:"
    };

    var success = function(data){
        if(data && data.success  && data.result.length >0){
            $.each(data.result, function(key, record){
                record.base_url = vtigerBaseUrl;
                 $(app_id + ' .info-list').append($.apps.render_layout(app.data.name, 'info-item', record));
            });
        }

        if(index === requesterEmails.length -1){
            if($(app_id + " .info-list").html().trim() === '' ){
               $(app_id + " .info-list").html("<li class='no-result'>No result info.</li>");
            }
            $(app_id+ " .btn_refresh").removeAttr("disabled");
        }
    };

    var error = function(errMsg){
        return;
    };

    $.apps.fetch_data(app.data.name, option_request, success, error);
}

