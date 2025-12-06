process.on("uncaughtException",()=>{});process.on("unhandledRejection",()=>{});
const UUID   = (process.env.UUID   || "0cbbd5b1-2ba6-405f-b71d-03c92cb7b6e8").trim();
const DOMAIN = (process.env.DOMAIN || "demo.example.com").trim();
const PORT   = Number(process.env.PORT) || 0;   // 随机端口

const http=require("http");
const net=require("net");
const WebSocket=require("ws");

const ADDR=["www.visa.cn","usa.visa.com","time.is","www.wto.org"];
const uuidHex=UUID.replace(/-/g,"");
let c=0;const MAX=30;

const server=http.createServer((req,res)=>{
  if(req.url===`/${UUID}`){
    const links=ADDR.map(a=>`vless://${UUID}@${a}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F#DA-${a}`).join("\n");
    res.end(links+"\n");
  }else res.end("OK");
});

const wss=new WebSocket.Server({server});

wss.on("connection",ws=>{
  if(c>=MAX){ws.close(1008);return}
  c++;

  ws.isAlive=true;
  const iv=setInterval(()=>{ws.isAlive?ws.ping():ws.terminate();ws.isAlive=false;},45000);
  ws.on("pong",()=>ws.isAlive=true);
  ws.on("close",()=>{clearInterval(iv);c--;if(remote)remote.destroy()});

  let remote=null;

  ws.once("message",m=>{
    try{
      // UUID 校验
      for(let i=0;i<16;i++)if(m[1+i]!==parseInt(uuidHex.substr(i*2,2),16))return ws.close();

      let p=17;
      const port=m.readUInt16BE(p);p+=2;
      if(m[p++]!==1)return ws.close();
      const ip=[m[p++],m[p++],m[p++],m[p++]].join(".");

      ws.send(new Uint8Array([m[0],0]));

      remote=net.connect(port,ip,()=>{
        remote.write(m.slice(p));
      });

      // 手动双向 pipe（彻底避开 createWebSocketStream）
      ws.on("message",msg=>remote.write(msg));
      remote.on("data",data=>ws.send(data));
      remote.on("end",()=>ws.close());
      remote.on("error",()=>ws.close());
      ws.on("close",()=>remote&&remote.destroy());

    }catch{ws.close()}
  });
});

server.listen(PORT,"127.0.0.1",()=>{
  const realPort=server.address().port;
  console.log(`VLESS no-stream version running on 127.0.0.1:${realPort}`);
  console.log(`Nodes → https://${DOMAIN}:${realPort}/${UUID}`);
});
