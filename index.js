// ===== VLESS-WS-TLS 多节点（代码+面板双重变量添加）=====
const http = require('http');
const net  = require('net');
const { WebSocket, createWebSocketStream } = require('ws');

// ================== 双重变量（同时在代码+面板添加）==================
const UUID   = (process.env.UUID   || "00000000-0000-0000-0000-000000000000").trim();
const PORT   = (process.env.PORT   || "3000").trim();
const DOMAIN = (process.env.DOMAIN || "your-domain.example.com").trim();

// 8个优选域名（可自行增删）
const BEST_DOMAINS = [
  "www.visa.com.hk",
  "www.visa.com.tw",
  "www.visa.cn",
  "cf.877774.xyz",
  "cmcc.877774.xyz",
  "ct.877774.xyz",
  "cu.877774.xyz"
];

function generateLink(address) {
  return `vless://${UUID}@${address}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F#${DOMAIN}-${address.split('.').join('-')}`;
}

// 关键：去掉 charset，面板 Content-Type 
const HTML_HEADER = { 'Content-Type': 'text/html' };
const TEXT_HEADER = { 'Content-Type': 'text/plain' };

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, HTML_HEADER);
    res.end('<html><body><h1>VLESS-WS-TLS Node Running</h1><p>访问 /' + UUID + ' 获取节点链接</p></body></html>');
  }
  else if (req.url === `/${UUID}`) {
    let txt = "═════ 8 条节点链接 ═════\n\n";
    txt += generateLink(DOMAIN) + "\n\n";
    BEST_DOMAINS.forEach(d => txt += generateLink(d) + "\n\n");
    txt += "控制台已完整输出，可直接复制使用";
    res.writeHead(200, TEXT_HEADER);
    res.end(txt);
  }
  else {
    res.writeHead(404);
    res.end('404 Not Found');
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
    i += 1 + msg.slice(i, i + 1).readUInt8();
    i += 2;
    ws.send(new Uint8Array([version, 0]));

    const duplex = createWebSocketStream(ws);
    net.connect(msg.slice(i - 2, i).readUInt16BE(), '0.0.0.0', () => {
      this.write(msg.slice(i));
      duplex.pipe(this).pipe(duplex);
    }).on('error', () => ws.close());
  });
});

// ================== 启动成功打印8条链接 ==================
server.listen(Number(PORT), () => {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║            VLESS-WS-TLS 8节点启动成功！                      ║");
  console.log(`║ 主域名   : ${DOMAIN.padEnd(45)}║`);
  console.log(`║ 后端端口 : ${PORT.padEnd(45)}║`);
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

  console.log("↑ 上面8条链接已全部输出，直接复制使用！\n");
});
