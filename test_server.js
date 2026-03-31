/**
 * Standalone test server for MMM-TwBusEta (no MagicMirror required).
 *
 * Usage:
 *   1. Copy config.example.json to config.json and fill in your TDX credentials
 *   2. npm install
 *   3. node test_server.js
 *   4. Open http://localhost:3000 in your browser
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const TDX_AUTH_URL =
    "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";
const TDX_BUS_ETA_URL =
    "https://tdx.transportdata.tw/api/basic/v2/Bus/EstimatedTimeOfArrival/City";

// ── Load config ──────────────────────────────────────────────────────────────
const configPath = path.join(__dirname, "config.json");
if (!fs.existsSync(configPath)) {
    console.error("config.json not found. Copy config.example.json to config.json and fill in your TDX credentials.");
    process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

let token = null;
let tokenExpiry = 0;

// ── TDX helpers ──────────────────────────────────────────────────────────────
async function getAccessToken() {
    const now = Date.now();
    if (token && now < tokenExpiry) return token;
    if (!config.clientId || !config.clientSecret) {
        throw new Error("clientId / clientSecret missing in config.json");
    }
    const res = await axios.post(
        TDX_AUTH_URL,
        new URLSearchParams({
            grant_type: "client_credentials",
            client_id: config.clientId,
            client_secret: config.clientSecret,
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    token = res.data.access_token;
    tokenExpiry = now + (res.data.expires_in - 60) * 1000;
    return token;
}

async function fetchRouteEta(route) {
    const url =
        TDX_BUS_ETA_URL + "/" + route.city + "/" + encodeURIComponent(route.routeName) +
        "?$filter=Direction eq " + route.direction +
        "&$orderby=StopSequence asc" +
        "&$format=JSON";

    const accessToken = await getAccessToken();
    const res = await axios.get(url, {
        headers: { Authorization: "Bearer " + accessToken },
    });

    const lang = config.language || "Zh_tw";
    const stops = res.data.map(function (item) {
        return {
            stopSequence: item.StopSequence,
            stopName: (item.StopName && item.StopName[lang]) || item.StopName.Zh_tw || "",
            estimateTime: item.EstimateTime != null ? item.EstimateTime : null,
            stopStatus: item.StopStatus,
        };
    });
    stops.sort((a, b) => a.stopSequence - b.stopSequence);

    return {
        city: route.city,
        routeName: route.routeName,
        direction: route.direction,
        stops: stops,
    };
}

async function fetchAllRoutes() {
    const results = [];
    for (const route of config.routes) {
        try {
            results.push(await fetchRouteEta(route));
        } catch (err) {
            results.push({
                city: route.city,
                routeName: route.routeName,
                direction: route.direction,
                error: err.message,
                stops: [],
            });
        }
    }
    return results;
}

// ── HTTP server ──────────────────────────────────────────────────────────────
const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
};

function serveFile(res, filePath, contentType) {
    try {
        const content = fs.readFileSync(filePath, "utf8");
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
    } catch {
        res.writeHead(404);
        res.end("Not found");
    }
}

const server = http.createServer(async (req, res) => {
    if (req.url === "/" || req.url === "/index.html") {
        serveFile(res, path.join(__dirname, "test_page.html"), MIME[".html"]);
    } else if (req.url === "/api/eta") {
        try {
            const data = await fetchAllRoutes();
            res.writeHead(200, { "Content-Type": MIME[".json"] });
            res.end(JSON.stringify(data));
        } catch (err) {
            res.writeHead(500, { "Content-Type": MIME[".json"] });
            res.end(JSON.stringify({ error: err.message }));
        }
    } else {
        const ext = path.extname(req.url);
        const filePath = path.join(__dirname, req.url);
        serveFile(res, filePath, MIME[ext] || "text/plain");
    }
});

const PORT = process.env.PORT || 3000;
server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error("Port " + PORT + " is already in use. Try: set PORT=3001 && node test_server.js");
    } else {
        console.error("Server error:", err.message);
    }
    process.exit(1);
});
server.listen(PORT, () => {
    console.log("──────────────────────────────────────────");
    console.log(" MMM-TwBusEta test server running");
    console.log(" Open http://localhost:" + PORT + " in your browser");
    console.log("──────────────────────────────────────────");
});
