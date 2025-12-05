// ====== 只修改两个核心变量 UUID/DOMAIN ======

const UUID   = (process.env.UUID   || "00000000-0000-0000-0000-000000000000").trim(); // 双引号内填入UUID

const DOMAIN = (process.env.DOMAIN || "your-domain.example.com").trim(); // 托管到CF的域名（带前缀） 

// Panel
const NAME   = "DirectAdmin-eishare";
const PORT = 0; // 0 = 随机端口
const BEST_DOMAINS = [
  "www.visa.cn",
  "usa.visa.com",
  "www.wto.org",
  "shopify.com",
  "time.is",
  "www.digitalocean.com",
  "www.visa.com.hk",
  "www.udemy.com",
];

// ============================================================
// ===============            模块加载区             ===============
// ============================================================
const http = require('http');
const net = require('net');
const { execSync } = require('child_process');

// 自动安装 ws
try {
    require.resolve("ws");
} catch (e) {
    console.log("缺少模块 ws，正在安装...");
    execSync("npm install ws", { stdio: 'inherit' });
}
const { WebSocket, createWebSocketStream } = require("ws");


// ============================================================
// ===============      生成 VLESS 节点链接函数      ===============
// ============================================================
function generateLink(address) {
    return `vless://${UUID}@${address}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F#${NAME}`;
}


// ============================================================
// ===============             HTTP 服务            ===============
// ============================================================
const server = http.createServer((req, res) => {

    if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`VLESS WS TLS Running\n访问 /${UUID} 查看所有节点\n`);
    }

    else if (req.url === `/${UUID}`) {
        let txt = "═════ easyshare VLESS-WS-TLS 节点 ═════\n\n";

        // 优选域名节点
        BEST_DOMAINS.forEach(d => txt += generateLink(d) + "\n\n");

        txt += "节点已全部生成，可直接复制使用。\n";

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(txt);
    }

    else {
        res.writeHead(404);
        res.end("404 Not Found");
    }
});


// ============================================================
// ===============         WebSocket（后端）         ===============
// ============================================================
const wss = new WebSocket.Server({ server });
const uuid_clean = UUID.replace(/-/g, "");

wss.on("connection", ws => {
    ws.once("message", msg => {

        const [VERSION] = msg;

        // UUID 校验
        const id = msg.slice(1, 17);
        if (!id.every((v, i) => v === parseInt(uuid_clean.substr(i * 2, 2), 16))) return;

        // 跳过长度
        let p = msg.slice(17, 18).readUInt8() + 19;

        const port = msg.slice(p, p += 2).readUInt16BE();
        const ATYP = msg.slice(p, p += 1).readUInt8();

        let host = "";
        if (ATYP === 1) {
            host = msg.slice(p, p += 4).join(".");
        } else if (ATYP === 2) {
            const len = msg.slice(p, p + 1).readUInt8();
            host = new TextDecoder().decode(msg.slice(p + 1, p + 1 + len));
            p += 1 + len;
        } else if (ATYP === 3) {
            host = msg
                .slice(p, p += 16)
                .reduce((s, b, i, a) => (i % 2 ? s.concat(a.slice(i - 1, i + 1)) : s), [])
                .map(b => b.readUInt16BE(0).toString(16))
                .join(":");
        }

        // 返回成功握手
        ws.send(new Uint8Array([VERSION, 0]));

        const duplex = createWebSocketStream(ws);

        // TCP 转发
        net.connect({ host, port }, function () {
            this.write(msg.slice(p));
            duplex.pipe(this).pipe(duplex);
        }).on("error", () => ws.close());
    });
});


// ============================================================
// ===============               启动信息              ===============
// ============================================================
const listenPort = Number(PORT) || 0;  // 0 = 随机端口
server.listen(listenPort, "127.0.0.1", () => {
    const actualPort = server.address().port;

    console.log("\n===============================================");
  
    console.log("          VLESS-WS-TLS 已成功启动");
    console.log("===============================================\n");

    console.log("优选域名：\n");
    BEST_DOMAINS.forEach((d, i) => console.log(`${i + 1}. ${generateLink(d)}\n`));

    console.log(`访问：http://<服务器IP>:${PORT}/${UUID}`);
    console.log("查看全部节点（适用于 DirectAdmin）\n");
});

// ==========================
//     KeepAlive 每5~10分钟 自动访问DOMAIN/UUID实现保活
// ==========================
function keepAlive() {
    const url = `https://${DOMAIN}/${UUID}`;

    // GET 请求启动 KeepAlive
    http.get(url, () => {}).on("error", () => {});

    const min = 5 * 60 * 1000;
    const max = 10 * 60 * 1000;
    const rand = Math.floor(Math.random() * (max - min + 1)) + min;

    setTimeout(keepAlive, rand);
}

// 启动 keepalive 循环
keepAlive();
