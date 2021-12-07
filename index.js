const WebSocket = require('ws');

const server = require('http').createServer();

const express = require('express');
const app = express();

app.use("/",express.static('./controller'));

server.on('request',app)
 
const wss = new WebSocket.Server({ 
  // port: process.env.PORT 
  server
});

const ws_table = {};
 
wss.on('connection', function connection(ws) {

  console.log('new connection');

  const connection_id = (()=>{
    let time = new Date().getTime()
    while( ws_table[time] !== undefined ){
      time=time/10;
    }
    return `${time}`;
  })();

  ws_table[connection_id] = ws;
  ws.connection_id = connection_id;

  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
    forwardMessage(ws, JSON.parse(message));
  });

  ws.on('close',()=>{
    console.log('disconnected '+connection_id);
    delete ws_table[connection_id]
  });

  ws.send(JSON.stringify({
    payload: JSON.stringify({
      type:'welcome',
      connection_id
    })
  }));
});

server.listen(process.env.PORT, function(){
  console.log(`server.listen on port ${process.env.PORT}`);
})

function forwardMessage( ws_from, action_obj ){

  // initial set up 
  if( action_obj.type !== undefined ){
    ws_from.type = action_obj.type;
    return; // return because we won't forward to itself any way 
  }

  for(let k in ws_table ){
    const ws = ws_table[k];
    if( ws.type==="host" && ws!==ws_from ){
      ws.send(JSON.stringify(action_obj));
    }
  }
}
