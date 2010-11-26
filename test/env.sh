test -n "$authtoken" || authtoken="eb5b65662dc6f302b15182fe900943e4"
test -n "$zabbixuser" -a -n "$zabbixpass" || {
  zabbixuser="Admin" zabbixpass="zabbix"
}
test -n "$zabbixserver" || zabbixserver="http://172.16.166.136/zabbix"
export zabbixuser zabbixpass zabbixserver authtoken

function zx() {
    case $1
    in auth)
        curl $v -s -d '
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
            -k $zabbixserver/api_jsonrpc.php
        echo
    ;; trigger)
        curl $v -s -d '
            { "auth":"'$authtoken'"
            , "method":"trigger.get"
            , "id":0
            , "params":
              { "select_hosts": true
              , "only_true": true
              , "extendoutput": true
              , "monitored": true
              }
            , "jsonrpc":"2.0"
            }' \
            -H "Content-Type: application/json" \
            -k $zabbixserver/api_jsonrpc.php
    ;; u)
        curl $v -s -d '
            { "auth":"'$authtoken'"
            , "method":"'$2'"
            , "id":0
            , "params":
              { "select_hosts": true
              , "select_groups": true
              , "only_true": true
              , "monitored": true
              , "extendoutput": true
              }
            , "jsonrpc":"2.0"
            }' \
            -H "Content-Type: application/json" \
            -k $zabbixserver/api_jsonrpc.php
    esac
}
