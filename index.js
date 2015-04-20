var querystring = require('querystring');
var request = require('request');
var ws = require('ws');

var token = process.env.BOT_TOKEN;
var cseKey = process.env.CSE_KEY;
var cseCx = process.env.CSE_CX;

if (!token || !cseKey || !cseCx) {
  console.log('BOT_TOKEN, CSE_KEY and CSE_CX are needed to run this bot.');
  return;
}

var id = 1;

function sendMessage(socket, message) {
  socket.send(JSON.stringify(message));
  id++;
}

request('https://slack.com/api/rtm.start?token=' + token, function (error, response, body) {
  var parsed = JSON.parse(body);
  var wsUrl = parsed['url'];
  console.log('wsUrl: ' + wsUrl);

  var s = new ws(wsUrl);
  var id = 1;
  var pingInterval;

  s.on('open', function () {
    console.log('open ======================');
    pingInterval = setInterval(function () {
      console.log('sending ping.');
      sendMessage(s, {id: id, type: 'ping'});
      //s.send(JSON.stringify({id: id, type: 'ping'}));
      //id++;
    }, 3000);
  });

  s.on('close', function () {
    clearInterval(pingInterval);
    console.log('close =====================');
  });

  s.on('message', function (data, flags) {
    console.log(data);
    console.log('===============');
    var parsed = JSON.parse(data);
    var text = parsed['text'];
    var channel = parsed['channel'];
    var id = parsed['user'];

    if (parsed['type'] == 'message' && parsed['user'] && text && !parsed['reply_to']) {
      var googleExp = /!g (.+)/;
      var googleMatches = googleExp.exec(text);
      console.log('m' + googleMatches);

      if (googleMatches) {
        var keyword = googleMatches[1];
        console.log('m[1]' + keyword);
        var encoded = querystring.escape(keyword);
        var uri = 'https://www.googleapis.com/customsearch/v1?key=' + cseKey + '&cx=' + cseCx + '&q=' + encoded;
        console.log('uri:' + uri);

        request(uri, function (error, response, body) {
          var parsed = JSON.parse(body);
          if (!parsed['items']) {
            console.log(parsed);
          } else {
            if (!parsed['items'][0]) {
              console.log(parsed['items']);
            } else {
              var firstItem = parsed['items'][0];
              console.log(firstItem);
              var title = firstItem['title'];
              var link = firstItem['link'];
              sendMessage(s, {
                id: id,
                type: 'message',
                channel: channel, text: '<@' + id + '>:*' + title + '* | ' +  keyword + '\n' + link
              });
            }
          }
        });
      } else if (text.indexOf('!') == 0) {
        console.log(body);
        var text = text.substr(1);

        sendMessage(s, {id: id, type: 'message', channel: channel, text: '<@' + id + '>:' + text});
        //s.send(JSON.stringify({id: id, type: 'message', channel: channel, text: '<@' + id + '>:' + text}));
        //id++; 
      }
    }
  });
});
