// ====== 只修改两个核心变量 UUID/DOMAIN ======

const UUID = (process.env.UUID || "abcd1eb2-1c20-345a-96fa-cdf394612345").trim();   // 替换"双引号中的UUID"
const DOMAIN = (process.env.DOMAIN || "abc.domain.dpdns.org").trim();               // 替换"双引号中的完整域名"

// Panel 配置
const NAME = "DirectAdmin-easyshare";
const PORT = 0; // 随机端口
const BEST_DOMAINS = [
    "www.visa.cn",
    "www.shopify.com",
    "time.is",
    "www.wto.org",
    "usa.visa.com",
    "www.digitalocean.com",
    "www.visa.com.hk",
    "www.udemy.com",
];

// ============================================================
// =============== 模块加载区 ================================
// ============================================================
const http = require('http');
const net = require('net');
const { execSync } = require('child_process');

// 自动安装 ws
try {
    require.resolve("ws");
} catch (e) {
    execSync("npm install ws", { stdio: 'inherit' });
}

const { WebSocket, createWebSocketStream } = require("ws");

// ============================================================
// =============== 生成 VLESS 节点链接函数 ====================
// ============================================================
function generateLink(address) {
    return `vless://${UUID}@${address}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F#${NAME}`;
}

// ============================================================
// =============== HTTP 服务 ==================================
// ============================================================
const server = http.createServer((req, res) => {
    if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`VLESS WS TLS Running\n访问 /${UUID} 查看所有节点\n`);
    } else if (req.url === `/${UUID}`) {
        let txt = "═════ EasyShare VLESS-WS-TLS 节点 ═════\n\n";
        BEST_DOMAINS.forEach(d => txt += generateLink(d) + "\n\n");
        txt += "节点已全部生成，可全选复制使用。\n";
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(txt);
    } else {
        res.writeHead(404);
        res.end("404 Not Found");
    }
});

// ============================================================
// =============== WebSocket 后端 ============================
// ============================================================
const wss = new WebSocket.Server({ server });
const uuid_clean = UUID.replace(/-/g, "");

// WS 连接处理
wss.on("connection", ws => {
    let tcp = null; // TCP 对象作用域

    ws.on("error", () => { });
    ws.on("close", () => {
        try { tcp && tcp.destroy(); } catch { }
    });

    ws.once("message", msg => {
        if (!msg || msg.length < 18) return;

        const [VERSION] = msg;
        const id = msg.slice(1, 17);

        // UUID 校验
        if (!id.every((v, i) => v === parseInt(uuid_clean.substr(i * 2, 2), 16))) return;

        let p = msg.slice(17, 18).readUInt8() + 19;
        const port = msg.slice(p, p += 2).readUInt16BE();
        const ATYP = msg.slice(p, p += 1).readUInt8();
        let host = "";

        // ATYP 解析 host
        if (ATYP === 1) {
            host = msg.slice(p, p += 4).join(".");
        } else if (ATYP === 2) {
            const len = msg.slice(p, p + 1).readUInt8();
            host = new TextDecoder().decode(msg.slice(p + 1, p + 1 + len));
            p += 1 + len;
        } else if (ATYP === 3) {
            host = msg.slice(p, p += 16)
                .reduce((s, b, i, a) => (i % 2 ? s.concat(a.slice(i - 1, i + 1)) : s), [])
                .map(b => b.readUInt16BE(0).toString(16))
                .join(":");
        }

        // 发送握手成功
        ws.send(new Uint8Array([VERSION, 0]));

        // 建立 TCP + WebSocket 双向管道
        const duplex = createWebSocketStream(ws);
        tcp = net.connect({ host, port }, () => {
            tcp.write(msg.slice(p));
            duplex.pipe(tcp).pipe(duplex);
        });

        tcp.on("error", () => {
            try { ws.close(); } catch { }
        });
    });
});

// ============================================================
// =============== 启动 ============================
// ============================================================
const listenPort = Number(PORT) || 0;
server.listen(listenPort, "0.0.0.0", () => {
    // 访问一次端口，确保 Node.js 完成监听，避免客户端 -1
    server.address().port;
});
