zxview
======

This is a replacement for the Zabbix Dashboard which is easier to look at (depends) and it also has a few little helpers to improve the overview if you've got a bigger setup.  Like:

  * hiding all hosts in maintenance
  * toggle display of selected groups/hostgroups
  * show all active and hide all exired maintenances after 2 hours
  * customizable colors for each group for easier estimation of importance
  * new problems will be highlighted some time

zxview uses the Zabbix JSON API to periodically pull all info.

## Tryout

        $ git clone http://github.com/allan/zxview.git
        $ cd zxview/test
        $ ruby -rrubygems app.rb # gem install sinatra yajl-ruby
        $ open http://localhost:4567/zxview.html # and fill in some nonsense user/pw

## Installation

  * Get all the files and put them in a directory your Zabbix webserver
    can access.  You have to serve these files from your Zabbix webserver,
    because `zxview` uses XMLHTTPRequests and your browser is only allowed
    to make those AJAX things to the same domain from which the HTML file was
    served (since Zabbix doesn't support JSONP and setting up an extra proxy
    for those things is annoying).  Since 99% of all Zabbix-installations will
    use Apache and the Apache configuration is annoying too, here's a snippet

        $ cat /etc/httpd/conf.d/zxview.conf
        Alias /zxview /path/to/zxview
        
        <Directory "/path/to/zxview">
            Options FollowSymLinks
            AllowOverride None
            Order allow,deny
            Allow from all
        </Directory>

  * use a newer Google Chrome build to view the page.  Zabbix's
    `frontends/php/api_jsonrpc.php` doesn't handle every Content-type it gets
    and Chrome is the only browser that by chance uses the Content-type that
    Zabbix's JSON API requires.  Other browsers append a `charset=UTF-8`,
    which then won't be matched by Zabbix.

        --- api_jsonrpc.php.original      2010-03-23 14:59:32.000000000 +0100
        +++ api_jsonrpc.php       2010-03-23 15:00:00.000000000 +0100
        @@ -24,7 +24,7 @@
      
        $allowed_content = array(
                                        'application/json-rpc'          => 'json-rpc',
                                        'application/json'                      => 'json-rpc',
        +                               'application/json; charset=UTF-8;'      => 'json-rpc',
                                        'application/jsonrequest'       => 'json-rpc',
        //                             'application/xml-rpc'           => 'xml-rpc',
        //                             'application/xml'                       => 'xml-rpc',

  * Since the Zabbix API doesn't use cookies for authentication, everytime
    you reload the page, a login dialog will be shown.

  * In the Zabbix Admin Interface you need to setup a user with the proper
    rights to acces the Zabbix API.  There is a special group for `API access`
    I believe.  `readonly` rights are sufficient.  After setting up the user,
    you can test the API access with `curl`:

        $ zabbixuser="..." zabbixpass="..." zabbixserver="..."
        $ export zabbixuser zabbixpass zabbixserver
        $ curl -s -i -d '
        { "auth":null
        , "method":"user.authenticate"
        , "id":0
        , "params":
          { "user":"'$zabbixuser'"
          , "password":"'$zabbixpass'"
          }
        , "jsonrpc":"2.0"
        }' \
        -H "Content-Type: application/json" \
        -k https://$zabbixserver/zabbix/api_jsonrpc.php

    The output of this command should look something like this:

        {"jsonrpc":"2.0","result":"8d4a5d5a5a63888e9273baeafa227","id":0}

    For later use, you could copy&paste the result, e.g.

        $ export authtoken="8d4a5d5a5a63888e9273baeafa227"

  * Now you can login to the API.  Check if your user has the proper rights to 
    view some hosts:

        $  curl -s -d '
        { "auth":"'$authtoken'"
        , "method":"host.get"
        , "id":0
        , "params":
          { "select_groups": true
          , "extendoutput": true
          }
        , "jsonrpc":"2.0"
        }' \
        -H "Content-Type: application/json" \
        -k https://$zabbixserver/zabbix/api_jsonrpc.php

  * At this point zxview should already run.

## zxview customization

  * In `zxview` you can give your hostgroups different colors.  To do that
    you have to edit the first lines of the file `zxview.js`:

        { // if you want to give a special color to a specific hostgroup          
          "sample Hostgroup": { displayname: "prod", color: "#3dbc34" },
          "another name":     { displayname: "qa",   color: "#f370ff" },

          "others":           { displayname: "allHosts",  color: "#e7a000" } 
        }
          ^                     ^                         ^
          |                     |    _____________________|
          |                     |   |_.- the HTML color for the hostgroup                  
          |                     |_____.- short name to display on page (only
          |                              alphanumeric chars allowed, no spaces or
          |                              else)                    
          |___________________________.- this must be the *exact* hostgroup
                                         name like it is configured in Zabbix
    (Yes! ;) 

  * All hosts that are viewable by the user configured for API access 
    will be in the group `others` which exists only in `zxview`.  If
    you delete this group without adding some other group nothing will
    be displayed.

  * If you have a common domain name scheme, for example _all_ your
    configured hosts end with the same domain, it can be helpful for the
    overview to delete the domainpart.  To do this search for {HOSTNAME} in
    `zxview.js`

## Maintenances

If you've got a lot of maintenances, some maybe scheduled repeatedly,
and you don't want to see them in the list of maintenances, put the string
'zx.filtered' somewhere in the description of the actual maintenance.


#### Todo

  * test
  * screenshot
  * external config file

