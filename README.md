# Sforcejs :: node.js salesforce REST API wrapper with backpressure

Sforcejs is a copy of the [nforce](https://github.com/kevinohara80/nforce) module with support for streaming backpressure by using the Bayeuxjs package, instead 
of Faye. The following is an example of the additional feature this package provides.

## Streaming Client
### Lastevent trigger
The `lastevent` event is triggered after the last `data` event of the current page has been triggered. The `lastevent` 
event will receive a callback as a parameter that will request additional events when called. This mechanism provides a 
way to control the flow of events from the data source.

```js
org.authenticate({ username: user, password: pass }, function(err, oauth) {

  if(err) return console.log(err);

  console.log('subscribing to NewAccounts');
  var accs = org.subscribeAsync({ topic: 'NewAccounts' });

  accs.on('error', function(err) {
    console.log('subscription error');
    console.log(err);
    client.disconnect();
  });

  accs.on('data', function(data) {
    console.log(data);
  });
    
  accs.on('lastevent', lazyConnect => {
    console.log("lastEventReceived. Requesting more events");
    setTimeout(lazyConnect, 5000);
  });


});
```

### subscribe(opts)
* `channel`: (String:optional) A string value for the streaming channel (ex. /data/CaseChangeEvent).
* `isCDC`: (Boolean:optional) Specify `true` if the topic to be streamed is a Change Data Capture (CDC).