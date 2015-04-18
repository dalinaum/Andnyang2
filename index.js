var request = require('request');
var ws = require('ws');

var token = process.env.BOT_TOKEN
if (!token) {
  console.log('BOT_TOKEN is needed.');
  return;
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
      s.send(JSON.stringify({id: id, type: 'ping'}));
      id++;
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

    if (parsed['type'] == 'message' && parsed['user'] && parsed['text'] && !parsed['reply_to']) {
      if (parsed['text'].indexOf('!') == 0) {
        var uri = 'https://slack.com/api/users.info?token=' + token + '&user=' + parsed['user'];
        request(uri, function (error, response, body) {
          console.log(body);
          var parsedUser = JSON.parse(body);
          var user = parsedUser['user']['name'];
          var channel = parsed['channel'];
          var text = parsed['text'].substr(1);
          s.send(JSON.stringify({id: id, type: 'message', channel: channel, text: '@' + user + ':' + text}));
          id++; 
        });
      }
    }
  });
});
