// ===== VLESS-WS-TLS 8节点终极版（此代码无需编辑）=====
const http = require('http');
const net  = require('net');
const { WebSocket, createWebSocketStream } = require('ws');

// ================== 以下变量在面板手动添加 ==================
const UUID   = process.env.UUID?.trim();      
const PORT   = process.env.PORT?.trim();      
const DOMAIN = process.env.DOMAIN?.trim();    

// 如果有任意一个没填，立即报错退出，防止启动后全是-1还找不到原因
if (!UUID || !PORT || !DOMAIN) {
  console.error("\n【严重错误】环境变量缺失！请在面板 Environment variables 里添加以下三行：");
  console.error("UUID   = 你的uuid（带不带-都行）");
  console.error("PORT   = 设定的端口号   （纯数字，和域名指向端口一致）");
  console.error("DOMAIN = 托管到CF的域名  （包含前缀）\n");
  process.exit(1);   // 直接退出，returncode 1
}

// 7个优选域名（可自行增删）
const BEST_DOMAINS = [
  "www.visa.com.hk",
  "www.visa.com.tw",
  "www.visa.cn",
  "cf.877774.xyz",
  "cmcc.877774.xyz",
  "ct.877774.xyz",
  "cu.877774.xyz"
];

// 生成单条链接
function generateLink(address) {
  return `vless://${UUID}@${address}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F#${DOMAIN}-${address.split('.').join('-')}`;
}

// HTTP 接口（可选，访问 http://IP:PORT/UUID 也能看到链接）
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === `/${UUID}`) {
    let txt = "8条节点链接（控制台已输出）\n\n";
    txt += generateLink(DOMAIN) + "\n";
    BEST_DOMAINS.forEach(d => txt += generateLink(d) + "\n");
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(txt);
  } else {
    res.writeHead(404); res.end();
  }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  ws.once('message', msg => {
    const [version] = msg;
    const id = msg.slice(1, 17);
    const clean = UUID.replace(/-/g, '');
    if (!id.every((v, i) => v === parseInt(clean.substr(i * 2, 2), 16))) return;

    let i = 17;
    i += 1 + msg.slice(i, i + 1).readUInt8();   // skip addr
    i += 2;                                     // skip port
    ws.send(new Uint8Array([version, 0]));

    const duplex = createWebSocketStream(ws);
    net.connect(msg.slice(i - 2, i).readUInt16BE(), '0.0.0.0', () => {
      this.write(msg.slice(i));
      duplex.pipe(this).pipe(duplex);
    }).on('error', () => ws.close());
  });
});

// ================== 启动成功后直接在控制台打印全部 8 条链接 ==================
server.listen(Number(PORT), () => {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                VLESS-WS-TLS 8节点启动成功！                  ║");
  console.log(`║ 主域名   : ${DOMAIN.padEnd(48)}║`);
  console.log(`║ 后端端口 : ${PORT.padEnd(48)}║`);
  console.log(`║ UUID     : ${UUID}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  console.log("1 主域名");
  console.log(generateLink(DOMAIN));
  console.log("");

  BEST_DOMAINS.forEach((d, i) => {
    console.log(`${i + 2} ${d}`);
    console.log(generateLink(d));
    console.log("");
  });

  console.log("↑ 上面共 8 条链接已全部输出，直接复制使用即可！\n");
});
