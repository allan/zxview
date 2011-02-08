(function () {
var zx =  //{{{
  { groups: //{{{ 

      { 
        // "produktion":       { displayname: "prod", color: "#3dbc34" },
        // "abnahme":          { displayname: "qa",   color: "#f370ff" },
        // "testing":          { displayname: "test", color: "#479bdb" },

        "others":           { displayname: "allHosts",  color: "#e7a000" }
      }

  , hiddenGroups: JSON.parse(localStorage.getItem('hiddenGroups')) || {}
  , hideHostsInMaint: false
  , log: function () { //{{{
      $('#log').append("--> ");
      for (var i = 0, len = arguments.length; i < len; ++i) {
        $('#log').append(JSON.stringify(arguments[i])+"<br>")
      }
    } //}}}
  , s_to_d: function(seconds) { //{{{
      var days    = Math.floor(seconds / 86400);
      var hours   = Math.floor((seconds - (days * 86400 ))/3600)
      var minutes = Math.floor((seconds - (days * 86400 ) - (hours *3600 ))/60)
      var seconds = Math.floor((seconds - (days * 86400 ) - (hours *3600 ) -
                      (minutes*60)))
      var date = []
      days    == 0 || date.push(   days + 'd')
      hours   == 0 || date.push(  hours + 'h')
      minutes == 0 || date.push(minutes + 'm')
      seconds == 0 || date.push(seconds + 's')
      return date.join(' ')
    } //}}}
  , chain: function chain() {
        var steps = Array.prototype.slice.call(arguments)
          , i = 0
        function cb() {
          if (i === steps.length) return
          steps[++i](cb)
        }
        steps[i](cb)
    }
  , sse: function(sse) { //{{{
      return new Date(sse*1000);
    } //}}}
  , sse2dur: function(sse) { //{{{
      var now = (+new Date / 1000).toFixed();
      return zx.s_to_d(now - sse)
    } //}}}
  , authenticate: function() { //{{{
      if (zx.authenticating) return false
      zx.authenticating = true
      if (zx.user && zx.pass) {
        var data =
          { auth: ""
          , method: "user.authenticate"
          , params:
            { user: zx.user
            , password: zx.pass
            }
          , jsonrpc: "2.0"
          , id: 0
          }
        send(data, function (msg) {
          zx.authtoken = msg.result;
          zx.run();
        })
      } else {
        alert("username and password required")
        location.reload();
      }
    } //}}}
  , login: function() { //{{{
      $('#login').show();
      $('#password').focus();
      $('#button').click(function() {
        zx.user = $('#username').val();
        zx.pass = $('#password').val();
        zx.authenticate();
        $('#login').hide();
        delete zx.user; delete zx.pass;
      })
    } //}}}
  , ustats: {}
  , run: function() { //{{{
      zx.chain(
        maintenances_bzzzt,
        ustats_bzzzt,
        problems_bzzzt,
        function() {
          setInterval(maintenances_bzzzt, 21500);
          setInterval(problems_bzzzt, 10000);
          setInterval(ustats_bzzzt, 300000);
        }
      )

      var style = '<style>';
      for (var group in zx.groups) {
        var _group = zx.groups[group];
        style += '.'+_group.displayname+' { background-color: '+_group.color+'; }'
      }
      style += '</style>';
      $('html > head').append($(style));

      function problems_bzzzt (cb) { //{{{
        var problems_query =
          { method: "trigger.get"
          , params:
              { select_hosts: true
              , select_groups: true
              , only_true: true
              , monitored: true
              , extendoutput: true
              }
          , auth: zx.authtoken
          , id: 0
          , jsonrpc: 2.0
          }
        send(problems_query, show_problems, cb)
      } //}}}
      function maintenances_bzzzt (cb) { //{{{
        var maintenances_query =
          { method: "maintenance.get"
          , params: { extendoutput: true }
          , auth: zx.authtoken
          , id: 0
          , jsonrpc: 2.0
          }
          send(maintenances_query, show_maintenances, cb);
      } //}}}
      function ustats_bzzzt (cb) { //{{{
        var ustats_query =
          { method: "host.get"
          , params:
            { select_groups: true
            , extendoutput: true
            , only_true: true
            , monitored: true
            }
          , auth: zx.authtoken
          , id: 0
          , jsonrpc: 2.0
          }
        send(ustats_query, show_ustats, cb);
      } //}}}
      function show_problems (json) { //{{{
        var resultset = { result: [] , hosts: {} }
          , now = +new Date / 1000
        zx.maintenancedProblems = 0;
        zx.realProblems = 0;

        json.result.forEach(function(trigger, i) {
          trigger.hosts[0] = 
            trigger.hosts[0] || { host: "undefined" , hostid: "0" };
          trigger.hosts[0].hostid = trigger.hosts[0].hostid || "0";

          //it seems that every zabbix has some host with this id
          //and i don't know what it's for, so don't display it
          if (trigger.hosts[0].hostid === "10007") return; //FIXME(zabbix)

          //here you could hide triggers with a priority lesser
          //than e.g. 4
          //if (parseInt(trigger.priority) < 4) return;

          var hostname = trigger.hosts[0].host;
          var shortHostName = hostname.replace(/\..*$/, '');
          var inMaintenance =
            trigger.hosts[0].maintenance_status === "1" ?  true : false;

          var groups = zx.ustats[trigger.hosts[0].hostid].groups || [];
          trigger.description = trigger.hosts[0].ip === "127.0.0.1"
            ? trigger.description.replace(/\{HOSTNAME\}/, shortHostName)
            : trigger.description.replace(/\{HOSTNAME\}/, trigger.hosts[0].ip);
          trigger.description = trigger.description.replace(/^\d+ /, '');
          trigger.description = trigger.description+": "+trigger.comments;
          inMaintenance ? zx.maintenancedProblems++ : zx.realProblems++;

          resultset.hosts[hostname] =
            resultset.hosts[hostname] ||
              { hostname: hostname
              , groups: groups
              , display: (function () {
                  var display = false;
                  groups.forEach(function(group) {
                    for (var g in zx.groups)
                      if (group === g) display = true;
                  });
                  if (trigger.value === "0") display = false;
                  return display;
                })()
              , umgebung: (function() {
                  var css = '';
                  groups.forEach(function(group) {
                    for (var g in zx.groups)
                      if (g === group) css = zx.groups[g].displayname;
                  });
                  if (inMaintenance) css += " inMaintenance";
                  return css;
                })()
              , problems: []
              };
          resultset.hosts[hostname].problems.push(
            { description: trigger.description
            , freshness: trigger.lastchange > (now - 60 * 30) ? true : false
            , duration: zx.sse2dur(trigger.lastchange)
            , triggerid: trigger.triggerid
            , sse: trigger.lastchange
            }
          );
        });
        for (var hn in resultset.hosts) {
          var host = resultset.hosts[hn]
          // sort inside host
          host.problems.sort(function(p1, p2) {
            return p2.sse - p1.sse
          })
          var np = host.problems.length
          if ( np > 1 && host.problems[0].sse < (now - 25 * 60 * 60)) {
            host.shorten = true
            host.problems.unshift(
              { description: "This host has "+np+" problems"
              , display: true
              , freshness: false
              , duration: host.problems[0].duration
              , sse: host.problems[0].sse
              }
            )
          }
          resultset.result.push(host);
        }
        // sort all hosts
        resultset.result.sort(function(a, b) {
          return b.problems[0].sse - a.problems[0].sse;
        });
        delete resultset.hosts

        var template = document.getElementById('problems_template').innerHTML
          , handlebar = Handlebars.compile(template)

        $("#problems").html(handlebar(resultset));
        for (var group in zx.hiddenGroups) {
          //$('.problem.'+group).css("background-color", "#555");
          $('.problem.u'+group).hide();
        }
        $('.shorten').toggle(function() {
          $(this).siblings('.trigger:hidden').show()
        }, function() {
          $(this).siblings('.trigger').hide()
        })
        if (zx.hideHostsInMaint) $('.inMaintenance').hide();
        $(".description, .maintenance > .name").hover(function() {
          $(this).css("background", "-moz-linear-gradient(top, #c1c1c1, #a8a8a8)")
                 .css("background", "-webkit-gradient(linear, left bottom, left top, from(#c1c1c1), to(#a8a8a8))")
                 .css({ "-webkit-border-radius": "3px",
                        "-moz-border-radius": "3px",
                        "color": "#333"
                      })
        }, function() {
          $(this).css({ "background": "", "color": "#ddd" })
        })
        delete template2; delete resultset; delete json;
      } //}}}
      function show_maintenances (json) { //{{{
        var html = 'Maintenances <span id="headerHide">(hidden)</span>'
          , now = +new Date / 1000

        json.result.forEach(function (maint) {
          maint.expired = (function() {
            if (maint.active_till < now) return "expired";
            if (maint.active_since > now) return "waiting";
          })()
          maint.display = (function () {
            var display = true
            if (maint.description.search(/zx.filtered/) != -1 ||
                maint.active_till < (now - 7200)) // 2 hours
              display = false

            return display
          })()
        })

        var template = document.getElementById('maintenances_template').innerHTML
          , handlebar = Handlebars.compile(template)

        $("#maintenances").html(handlebar(json));
        // toggle display of hosts in maintenance
        if (zx.hideHostsInMaint) $('#header').html(html);
        $('#header').click(function() {
          if (zx.hideHostsInMaint) {
            $(this).html('Maintenances');
            $('.inMaintenance').show()
            zx.hideHostsInMaint = false;
          } else {
            $(this).html(html);
            $('.inMaintenance').hide()
            zx.hideHostsInMaint = true;
          }
        })

        delete json; delete template;
      } //}}}
      function show_ustats (hosts) { //{{{
        // no comments for this function
        delete zx.ustats;
        var g = {}
          , result = {}
        zx.ustats = {};
        zx.ustats[0] = { groups: [] }   // XXX FIXME XXX

        hosts.result.forEach(function (host) {
          zx.ustats[host.hostid] = zx.ustats[host.hostid]
            ? zx.ustats[host.hostid] 
            : {};
          zx.ustats[host.hostid].groups = zx.ustats[host.hostid].groups ?
            zx.ustats[host.hostid].groups : [];
          host.groups.forEach(function (group) {
            zx.ustats[host.hostid].groups.push(group.name);
            zx.ustats[host.hostid].groups.unshift("others");
            g[group.name] = null;
          });
        });
        g["others"]=null; //asdf
        var glist = [];
        for (var i in g) glist.push(
            { name: zx.groups[i] && zx.groups[i].displayname
            , css:  zx.groups[i] && zx.groups[i].displayname
            });
        result.glist = glist;
        result.maintenancedProblems = zx.maintenancedProblems;
        result.realProblems = zx.realProblems;
        var template = document.getElementById('ustats_template').innerHTML
          , handlebar = Handlebars.compile(template)

        $("#umgebungen").html(handlebar(result));

        $('#uplus,#uminus')
          .mouseover(function() {
            $(this).css('background', '#333'); })
          .mouseout(function() {
            $(this).css('background', ''); });
        $('#uminus').click(function() { $('.glist-').fadeOut(300); });
        $('#uplus').click(function() { $('.glist-').fadeIn(300); });
        var getColorFor = function (displayname) {
          for (var i in zx.groups) {
            if (zx.groups[i].displayname === displayname) {
              return zx.groups[i].color;
            }
          }
        }
        for (var i=0; i<glist.length; i++) {
          $('.umgebung > .'+glist[i].name)
            .parent()
            .show()
            .css('background-color', getColorFor(glist[i].name));
        }
        $('.umgebung').click(function() {
          var group = $(this).children().attr('class') //e.g "p2"
            , hidden = false
          for (var hg in zx.hiddenGroups)
            if (hg === group) hidden = true
          if (hidden) {
            $(this).css("background-color", getColorFor(group));
            $(this).children().css("background-color", getColorFor(group));
            $('.u'+group+'.problem').show();
            delete zx.hiddenGroups[group];
            localStorage.setItem('hiddenGroups', JSON.stringify(zx.hiddenGroups));
          } else {
            $(this).css("background-color", "#555");
            $(this).children().css("background-color", "#555");
            $('.u'+group+'.problem').hide();
            zx.hiddenGroups[group] = true;
            localStorage.setItem('hiddenGroups', JSON.stringify(zx.hiddenGroups));
          }
        });
        for (var group in zx.hiddenGroups) {
          $('.umgebung > .'+group).parent().css("background-color", "#555");
          $('.umgebung > .'+group).css("background-color", "#555");
        }
        delete template; delete result; delete glist; delete g;
      } //}}}
    } //}}}
  }, //}}}
  send = function (req, fn1, fn2) { //{{{
    $.ajax({
      type: 'POST',
      dataType: "json",
      contentType: "application/json",
      url: "/api_jsonrpc.php",
      data: JSON.stringify(req),
      timeout: 20000,
      success: function (msg) {
        if (msg === null || msg.error) {
          //zx.log(msg);
          $('#error').html(
            "error"+
            "<div id='error_details'>("+
              //JSON.stringify(msg === null ? "connection timed out" : msg)+
              JSON.stringify(msg)+
            ")</div>");
          $('#error').fadeIn(500);
        } else {
          $('#error').fadeOut(500);
          fn1(msg)
          fn2 && fn2()
        }
      },
      error: function (res, textStatus, errorThrown) {
        $('#error').html(
            "<div id='error_details'>("
              +textStatus+" "+ res.responseText
            +")</div>");
        $('#error').fadeIn(500);
      }
    })
  } //}}}

$(document).ready(function(){
  zx.login();
  //zx.run()
});
})();
