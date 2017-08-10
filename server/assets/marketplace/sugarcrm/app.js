var sugarcrmSessionId = null;
var loginErr  = true;
var awaitLogin = true ;
var sugarUrl = getUrlInfo($.apps.get_param(app.secret,app.params.url));
var sugarApiPath =  "/custom/izihelpapi/v2/rest.php";
var requesterEmails = Array();

var app_id = "#"+ app.data.name;

$(app_id+ ' .btn_refresh').bind("click", function(e){
    e.preventDefault();
    fetchAllCRMData();
});

loginSugarCRM();

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
 *  'http://myhost.com:8080/sugarcrm?startIndex=1&pageSize=10' ->
 *    {
 *      "host": "myhost.com",
 *      "port": "8080",
 *      "search": {
 *        "startIndex": "1",
 *        "pageSize": "10"
 *      },
 *      "path": "/sugarcrm",
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
        path:     link.pathname,  //  '/sugarcrm'
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
 * get sessionId
 */
function loginSugarCRM(){

    var sugarPath =sugarUrl.path + sugarApiPath;
    var loginParams = {
            user_auth:{
                user_name: '#param.username#',
                password:  '#param.password#',
                encryption: 'PLAIN'
            },
            application: 'SugarCRM RestAPI'

        };

    var dataToPost = {
            method: "login",
            input_type: "JSON",
            response_type: "JSON",
            rest_data: JSON.stringify(loginParams)
        };

   var option_request = {
        request_opts : {
            host : sugarUrl.host,
            path: sugarPath,
            port : sugarUrl.port,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method : 'POST'
        },
        post_data : dataToPost,
        data_type : "json",
        is_https : sugarUrl.protocol === "https:"
    };

    awaitLogin = true; //wating async login
    var success = function(data){
        if ( !data  && typeof data != 'object'){
            console.log("Error handling result.\n");
            loginErr = true;
            awaitLogin = false;
            return;
        }

        if ( !data.id){

            console.log("Error: +"+ data.name+" - " + data.description+"\n.");
            loginErr = true;
            awaitLogin = false;
            return;
        }

        sugarcrmSessionId = data.id;
        awaitLogin = false;
        loginErr = false;
    };

    var error = function(errMsg){
         loginErr = true;
         awaitLogin = false;
         $(app_id+ " .btn_refresh").removeAttr("disabled");
         $(app_id + ' .info-list').html("<li class='no-result'><span class='text-danger'>Can not connect</span></li>");
    };

    $.apps.fetch_data(app.data.name, option_request, success, error );


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
        if( !sugarcrmSessionId  && !awaitLogin ){
              loginSugarCRM();
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
                    getSugarCRMData(key, email);
                });
            }
        }
    }
    else{
         $(app_id + ' .info-list').html("<li class='no-result'>No result info.</li>");
    }
}


/*
 * get requester info from SugarCRM
 * params emails
 *      list email
 */


function getSugarCRMData(index, email){
    var sugarPath =sugarUrl.path + sugarApiPath +"?callback=jQuery1910019300915533676744_1432870368768";

    var loginParams = {
            "session" : sugarcrmSessionId,
            "email" : email
        };
    var dataToPost = {
            method: "crmdata",
            input_type: "JSON",
            response_type: "JSON",
            rest_data: JSON.stringify(loginParams)
        };
    for ( var key in dataToPost ) {
        if ( dataToPost[ key ] ) {
            sugarPath += "&"+ key +"=" +encodeURIComponent(dataToPost[ key ]);
        }
    }

    sugarPath += "&_=1432870368769";

    var option_request = {
        request_opts : {
            host : sugarUrl.host,
            path: sugarPath,
            port : sugarUrl.port,
            method : "POST",
            headers: {
                "content-type": "application/json"
            }
        },
        data_type : "JSON",
        is_https : sugarUrl.protocol === "https:"
    };

    var success = function(data){
        if(data && Array.isArray(data) && data.length >0){
            $.each(data, function(key, record){
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
    };

    $.apps.fetch_data(app.data.name, option_request, success, error);
}

route("/okla/{id}", function(id){ alert(hello_world());
    $("#helloworld").html(id);
});
