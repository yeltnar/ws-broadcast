// ==UserScript==
// @name        video ws controll
// @namespace   Violentmonkey Scripts
// @match       https://www.youtube.com/watch*
// @match       https://m.youtube.com/watch*
// @match       https://www.hulu.com/watch*
// @grant       none
// @grant       GM_setValue
// @grant       GM_getValue
// @version     0.10
// @author      -
// @description 10/7/2020, 11:58:24 AM
// @run-at      document-end
// @require     https://gist.githubusercontent.com/yeltnar/d288d6c2e8b255ab2ff3e31283b6823d/raw/ba822da3ec76a5945e522cc9168bae56630bdaa6/crypto-aes-gcm.js
// ==/UserScript==

const password = 'asdf';

(() => {
   
    const search_params = new URLSearchParams(window.location.search);
    const current_session_id = search_params.get("session_id") || undefined;
    console.log({current_session_id});

    const ACTIONS = {
        play: "play",
    };

    let video_element;
  
    (()=>{
      console.log('adding setup timeout...');
      setTimeout(()=>{
        console.log('adding...');
        video_element = document.querySelector("video");
        console.log('adding video element events to '+video_element);

        // add event listeners for the video
        video_element.addEventListener("play", () => {
            console.log('you clicked play ',video_element);
            socketSend(getPlayAction(video_element));
        });
        video_element.addEventListener("pause", () => {
            console.log('you clicked pause');
            socketSend(getPauseAction());
        });
      },3000);
    })();

    // setTimeout(()=>{
      if( search_params.get("session_id")===null ){        
        const session_id = GM_getValue("session_id") || localStorage.getItem("session_id");
        if( session_id!==null ){
          console.log(`GM_setValue session_id is ${GM_setValue("session_id")}`);
          const url=window.location.href+"&session_id="+session_id;
          console.log("findmedrew "+url)
          GM_setValue("session_id",session_id);;
          window.location.href=url
        }else{
          console.log('session_id else');
          console.log(`GM_getValue("session_id") is ${GM_getValue("session_id")}`);
        }   
        
      }   
    // },3000);

    // const url = "wss://Node-WSS.yeltnar.repl.co";
    // const url = "wss://192.168.1.132:8080";
    // const base_url = "abra-testing-node-server.herokuapp.com";
    const base_url = "localhost:8080";
    const ws_url = `ws://${base_url}`;
    // const ws_url = `wss://${base_url}`;
    const http_url = `http://${base_url}`;
    // const http_url = `https://${base_url}`;

    let socket = new WebSocket(ws_url);
  
    const ping_interval_socket = setInterval(()=>{
      socketSend(getKeepAliveAction())
    },30*1000);
  
    // const ping_interval_http = setInterval(()=>{
    //   fetch(http_url).then(()=>{console.log('http ping done')});
    // },60*1000*5);

    socket.onopen = function (e) {
        const obj = {
            "type": "host",
        };
        socketSend(obj)
      
    };

    socket.onmessage = async function (event) {
        console.log(`onmessage - ${event.data}`);

        const jso = JSON.parse(event.data);
        let {payload} = jso;
        console.log(jso);
        if( jso.enc===true ){
          payload = await aesGcmDecrypt(payload, password);
        }
        payload = JSON.parse(payload);
      
      
      console.log(`event ${JSON.stringify(event)}`);
      
      if(payload===undefined){debugger}
      
        parseAction(payload);
        console.log(`onmessage after - ${event.data} (${new Date().getTime()})`)
    };

    socket.onclose = function (event) {
        if (event.wasClean) {
            console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        } else {
            // e.g. server process killed or network down
            // event.code is usually 1006 in this case
            console.log(`connection died at ${new Date().getTime()}`);
            alert('[close] Connection died');
        }
        clearInterval(ping_interval_socket);
        // clearInterval(ping_interval_http);
    };

    socket.onerror = function (error) {
        alert(`[error] ${error.message}`);
    };

//     setTimeout(() => {
//         console.log('sending pause')
//         socketSend(getPauseAction());
//         setTimeout(() => {
//             console.log('sending play')
//             socketSend(getPlayAction(video_element));
//         }, 5000)

//     }, 5000);


    async function socketSend(obj){
      
      const ws_send_obj = {};
      
      ws_send_obj.session_id = current_session_id;
      ws_send_obj.time = new Date().getTime();
      
      if( obj.type==='host' ){
        ws_send_obj.type = obj.type;       
        //delete ws_send_obj.url // TODO add?
        ws_send_obj.enc=false;
      }else{
        obj.url = window.location.href;
        obj.session_id = current_session_id;
        
        let payload = JSON.stringify(obj);
        
        // const enc = aesGcmEncrypt('its working',password);
        payload = await aesGcmEncrypt(payload, password);
          
        //   .then(async(enc)=>{
        //   console.log(await aesGcmDecrypt(enc, password))
        // })
        
        ws_send_obj.payload = payload;
        ws_send_obj.enc=true;
      }
      
      let to_send = JSON.stringify(ws_send_obj);
      
      socket.send(to_send);
    }

    function parseAction(action_obj) {
        console.log(`parseAction`);

        console.log(`parseAction - ${JSON.stringify(action_obj, null, 2)}`);
      
        console.log(action_obj)
        console.log(action_obj.session_id)
        console.log(current_session_id)
      
      // if( current_session_id!==undefined && action_obj.session_id===current_session_id ){
      if( true ){
          
          // update time seperatly 
          if (action_obj.current_time !== undefined) {
              video_element.pause();
              video_element.currentTime = action_obj.current_time
          }

          if (action_obj.action === "pause") {
              video_element.pause();
              console.log('pausing');
          } else if (action_obj.action === "play") {
              video_element.play();
              console.log('playing')
          }
          
        }else{ // don't parse action 
            console.log(JSON.stringify({
                action_url: action_obj.url,
                curent_url: window.location.href
            }, null, 2))
            return;
        } 
    }

    function getPlayAction(video_element) {

        let current_time;
        // if (video_element !== undefined) {
        //     current_time = video_element.getCurrentTime();
        // }

        return {
            "videocontrol": true,
            "action": "play",
            // current_time
        }
    }

    function getPauseAction() {
        return {
            "videocontrol": true,
            "action": "pause",
        }
    }

    function getKeepAliveAction() {
        return {
            "videocontrol": false,
            "action": "keep_alive",
        }
    }

})();
