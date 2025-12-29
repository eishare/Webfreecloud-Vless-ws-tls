process.on("uncaughtException", () => {});
process.on("unhandledRejection", () => {});

// ====== 只修改两个核心变量 UUID/DOMAIN ======
const UUID = (process.env.UUID || "969ef8fd-fe04-4583-8872-b2ea769e3b6b").trim();        // 替换"双引号中的UUID"
const DOMAIN = (process.env.DOMAIN || "2.hgxt68.de5.net").trim();                    // 替换"双引号中的完整域名"
 
// Panel 配置
const NAME = "DirectAdmin-easyshare";
const LISTEN_PORT = Number(process.env.PORT) || 0;     // 自适应端口

const BEST_DOMAINS = [
    "www.visa.cn",
    "www.shopify.com",
    "store.ubi.com",
    "www.wto.org",
    "time.is",
    "www.udemy.com",
];

// ============================================================
// =============== 模块加载区 ================================
// ============================================================
const http = require("http");
const net = require("net");
const { WebSocketServer, createWebSocketStream } = require("ws");

// ============================================================
// =============== WebSocket Path ============================
// ============================================================
const WS_PATH = `/${UUID}`;

// ============================================================
// =============== 生成 VLESS 节点链接函数 ====================
// ============================================================
function generateLink(address) {
    return (
        `vless://${UUID}@${address}:443` +
        `?encryption=none&security=tls&sni=${DOMAIN}` +
        `&fp=chrome&type=ws&host=${DOMAIN}` +
        `&path=${encodeURIComponent(WS_PATH)}` +
        `#${NAME}`
    );
}

// ============================================================
// =============== HTTP 服务 ==================================
// ============================================================
const server = http.createServer((req, res) => {
    if (req.headers.upgrade) {
        res.writeHead(426);
        return res.end();
    }

    if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end(`VLESS WS TLS Running\n访问 ${WS_PATH} 查看节点\n`);
    }

    if (req.url === WS_PATH) {
        let txt = "═════ EasyShare VLESS WS TLS ═════\n\n";
        for (const d of BEST_DOMAINS) {
            txt += generateLink(d) + "\n\n";
        }
        txt += "节点已全部生成，可直接复制使用。\n";

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end(txt);
    }

    res.writeHead(404);
    res.end("404 Not Found");
});

// ============================================================
// =============== WebSocket 后端 ============================
// ============================================================
const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 256 * 1024,
});

const uuidClean = UUID.replace(/-/g, "");

server.on("upgrade", (req, socket, head) => {
    if (req.url !== WS_PATH) {
        socket.destroy();
        return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
    });
});

wss.on("connection", (ws) => {
    let tcp = null;

    ws.once("message", (msg) => {
        if (!Buffer.isBuffer(msg) || msg.length < 18) {
            ws.close();
            return;
        }

        const version = msg[0];
        const id = msg.slice(1, 17);

        for (let i = 0; i < 16; i++) {
            if (id[i] !== parseInt(uuidClean.substr(i * 2, 2), 16)) {
                ws.close();
                return;
            }
        }

        let p = msg[17] + 19;
        const port = msg.readUInt16BE(p); p += 2;
        const atyp = msg[p++];

        let host = "";

        if (atyp === 1) {
            host = Array.from(msg.slice(p, p + 4)).join(".");
            p += 4;
        } else if (atyp === 2) {
            const len = msg[p];
            host = msg.slice(p + 1, p + 1 + len).toString();
            p += 1 + len;
        } else if (atyp === 3) {
            const raw = msg.slice(p, p + 16);
            const parts = [];
            for (let i = 0; i < 16; i += 2) {
                parts.push(raw.readUInt16BE(i).toString(16));
            }
            host = parts.join(":");
            p += 16;
        } else {
            ws.close();
            return;
        }

        ws.send(Buffer.from([version, 0]));

        tcp = net.connect({ host, port }, () => {
            tcp.setNoDelay(true);
            tcp.write(msg.slice(p));
            const duplex = createWebSocketStream(ws);
            duplex.pipe(tcp).pipe(duplex);
        });

        tcp.on("error", () => {
            try { ws.close(); } catch {}
        });
    });

    ws.on("close", () => {
        try { tcp && tcp.destroy(); } catch {}
    });

    ws.on("error", () => {});
});

// ============================================================
// =============== 启动 ============================
// ============================================================
server.listen(LISTEN_PORT, "0.0.0.0");
