let password;

(() => {
  
    if(password===undefined){
      
      const url_pw = window.location.href.split("#")[1]
      if(url_pw!==undefined){
        password = url_pw;        
      }else{
        password = prompt('Whats the ws controll password');
        window.location.href=`${window.location.href}#${password}`;
        return;
      }
    }
  
    if(password===undefined){return;}
     
    const search_params = new URLSearchParams(window.location.search);
    const current_session_id = search_params.get("session_id") || undefined;
    console.log({current_session_id});

    const ACTIONS = {
        play: "play",
    };

    // let video_element;
  
    // (()=>{
    //   console.log('adding setup timeout...');
    //   setTimeout(()=>{
    //     console.log('adding...');
    //     video_element = document.querySelector("video");
    //     console.log('adding video element events to '+video_element);

    //     // add event listeners for the video
    //     video_element.addEventListener("play", () => {
    //         console.log('you clicked play ',video_element);
    //         socketSend(getPlayAction(video_element));
    //     });
    //     video_element.addEventListener("pause", () => {
    //         console.log('you clicked pause');
    //         socketSend(getPauseAction());
    //     });
    //   },3000);
    // })();

    // const url = "wss://Node-WSS.yeltnar.repl.co";
    // const url = "wss://192.168.1.132:8080";
    // const base_url = "abra-testing-node-server.herokuapp.com";
    const base_url = /https?:\/\/(.*)\//.exec(window.location.href)[1];

    let ws_url='';
    if(/https/.test(window.location.href)){
        ws_url = `wss://${base_url}`;
    }else{
        ws_url = `ws://${base_url}`;        
    }

    // const ws_url = `wss://${base_url}`;
    const http_url = `http://${base_url}`;
    // const http_url = `https://${base_url}`;

    let socket = new WebSocket(ws_url);
  
    const ping_interval_socket = setInterval(()=>{
      socketSend(getKeepAliveAction())
    },30*1000);

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
    };

    socket.onerror = function (error) {
        alert(`[error] ${error.message}`);
    };

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
    //     console.log(`parseAction`);

    //     console.log(`parseAction - ${JSON.stringify(action_obj, null, 2)}`);
      
    //     console.log(action_obj)
    //     console.log(action_obj.session_id)
    //     console.log(current_session_id)
      
    //   // if( current_session_id!==undefined && action_obj.session_id===current_session_id ){
    //   if( true ){
          
    //       // update time seperatly 
    //       if (action_obj.current_time !== undefined) {
    //           video_element.pause();
    //           video_element.currentTime = action_obj.current_time
    //       }

    //       if (action_obj.action === "pause") {
    //           video_element.pause();
    //           console.log('pausing');
    //       } else if (action_obj.action === "play") {
    //           video_element.play();
    //           console.log('playing')
    //       } else if (action_obj.action === "set_url") {
    //           console.log('setting url')
    //           window.location.href=action_obj.new_url;
    //       }
          
    //     }else{ // don't parse action 
    //         console.log(JSON.stringify({
    //             action_url: action_obj.url,
    //             curent_url: window.location.href
    //         }, null, 2))
    //         return;
    //     } 
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

    function getSetUrlAction(new_url) {
        return {
            "videocontrol": false,
            "action": "set_url",
            "new_url": new_url
        }
    }

    function getKeepAliveAction() {
        return {
            "videocontrol": false,
            "action": "keep_alive",
        }
    }

    window.sendPause=function(){
        console.log("socket pause "+password)
        socketSend(getPauseAction());
    }

    window.sendPlay=function(){
        console.log("socket play "+password)
        socketSend(getPlayAction());
    }

})();


/**
 * Encrypts plaintext using AES-GCM with supplied password, for decryption with aesGcmDecrypt().
 *                                                                      (c) Chris Veness MIT Licence
 *
 * @param   {String} plaintext - Plaintext to be encrypted.
 * @param   {String} password - Password to use to encrypt plaintext.
 * @returns {String} Encrypted ciphertext.
 *
 * @example
 *   const ciphertext = await aesGcmEncrypt('my secret text', 'pw');
 *   aesGcmEncrypt('my secret text', 'pw').then(function(ciphertext) { console.log(ciphertext); });
 */
 async function aesGcmEncrypt(plaintext, password) {
    const pwUtf8 = new TextEncoder().encode(password);                                 // encode password as UTF-8
    const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);                      // hash the password

    const iv = crypto.getRandomValues(new Uint8Array(12));                             // get 96-bit random iv
    const ivStr = Array.from(iv).map(b => String.fromCharCode(b)).join('');            // iv as utf-8 string

    const alg = { name: 'AES-GCM', iv: iv };                                           // specify algorithm to use

    const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['encrypt']); // generate key from pw

    const ptUint8 = new TextEncoder().encode(plaintext);                               // encode plaintext as UTF-8
    const ctBuffer = await crypto.subtle.encrypt(alg, key, ptUint8);                   // encrypt plaintext using key

    const ctArray = Array.from(new Uint8Array(ctBuffer));                              // ciphertext as byte array
    const ctStr = ctArray.map(byte => String.fromCharCode(byte)).join('');             // ciphertext as string

    return btoa(ivStr+ctStr);                                                          // iv+ciphertext base64-encoded
}


/**
 * Decrypts ciphertext encrypted with aesGcmEncrypt() using supplied password.
 *                                                                      (c) Chris Veness MIT Licence
 *
 * @param   {String} ciphertext - Ciphertext to be decrypted.
 * @param   {String} password - Password to use to decrypt ciphertext.
 * @returns {String} Decrypted plaintext.
 *
 * @example
 *   const plaintext = await aesGcmDecrypt(ciphertext, 'pw');
 *   aesGcmDecrypt(ciphertext, 'pw').then(function(plaintext) { console.log(plaintext); });
 */
async function aesGcmDecrypt(ciphertext, password) {
    const pwUtf8 = new TextEncoder().encode(password);                                 // encode password as UTF-8
    const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);                      // hash the password

    const ivStr = atob(ciphertext).slice(0,12);                                        // decode base64 iv
    const iv = new Uint8Array(Array.from(ivStr).map(ch => ch.charCodeAt(0)));          // iv as Uint8Array

    const alg = { name: 'AES-GCM', iv: iv };                                           // specify algorithm to use

    const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt']); // generate key from pw

    const ctStr = atob(ciphertext).slice(12);                                          // decode base64 ciphertext
    const ctUint8 = new Uint8Array(Array.from(ctStr).map(ch => ch.charCodeAt(0)));     // ciphertext as Uint8Array
    // note: why doesn't ctUint8 = new TextEncoder().encode(ctStr) work?

    try {
        const plainBuffer = await crypto.subtle.decrypt(alg, key, ctUint8);            // decrypt ciphertext using key
        const plaintext = new TextDecoder().decode(plainBuffer);                       // plaintext from ArrayBuffer
        return plaintext;                                                              // return the plaintext
    } catch (e) {
        throw new Error('Decrypt failed');
    }
}