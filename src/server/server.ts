import bodyParser from "body-parser";
import * as chokidar from "chokidar";
import compression from "compression";
import cors from "cors";
import express from "express";
import * as fs from "fs";
import * as http from "http";
import { Pool } from "pg";
import WebSocket, { WebSocketServer } from "ws";
import { getTimeDifference, sleep } from "../utils/utils.js";
import { Firehose } from "./firehose.js";
import { initializePushNotifications } from "./pushnotifications.js";
import { initializeQuotes } from "./quotes.js";

const port = process.env.PORT ?? 3333;
const dbName = process.env.DATABASE;
if (!dbName) {
    console.error("Environment variable DATABASE missing");
    process.exit(-1);
}
const dbUser = process.env.DATABASE_USER;
if (!dbUser) {
    console.error("Environment variable DATABASE_USER missing");
    process.exit(-1);
}
const dbPassword = process.env.DATABASE_PASSWORD;
if (!dbPassword) {
    console.error("Environment variable DATABASE_PASSWORD missing");
    process.exit(-1);
}

const pool = new Pool({
    host: "db",
    database: dbName,
    user: dbUser,
    password: dbPassword,
    port: 5432,
});

let serverStart = new Date();
let numDidWebRequests = 0;
let numHtmlRequests = 0;

(async () => {
    const result = await connectWithRetry(5, 3000);
    if (result instanceof Error) {
        process.exit(-1);
    }

    if (!fs.existsSync("docker/data")) {
        fs.mkdirSync("docker/data");
    }

    const app = express();
    app.set("json spaces", 2);
    app.use(cors());
    app.use(compression());
    app.use(bodyParser.urlencoded({ extended: true }));

    const firehose = new Firehose();
    const pushNotifications = await initializePushNotifications(firehose);
    const quotes = await initializeQuotes(firehose);
    firehose.start();

    app.get("/api/register", async (req, res) => {
        try {
            const token = req.query.token;
            const did = req.query.did;
            if (!token || !did || token.length == 0 || did.length == 0 || typeof token != "string" || typeof did != "string") {
                console.error("Invalid token or did, token: " + token + ", did: " + did);
                res.status(400).send();
                return;
            }
            console.log("Registration: " + token + ", " + did);
            pushNotifications.registrations.add(did, token);
            console.log(`${did}: ${(await pushNotifications.registrations.get(did))?.length} tokens`);
            res.send();
        } catch (e) {
            res.status(400).json(e);
        }
    });

    app.get("/api/unregister", async (req, res) => {
        try {
            const token = req.query.token;
            const did = req.query.did;
            if (
                !token ||
                !did ||
                token.length == 0 ||
                did.length == 0 ||
                typeof token != "string" ||
                typeof did != "string" ||
                !pushNotifications.registrations.has(did)
            ) {
                console.error("Invalid token or did, or token not registered. token: " + token + ", did: " + did);
                res.status(400).send();
                return;
            }
            pushNotifications.registrations.remove(did, token);
            console.log(`Removed token for ${did}: ${(await pushNotifications.registrations.get(did))?.length} tokens`);
            res.send();
        } catch (e) {
            res.status(400).json(e);
        }
    });

    app.get("/api/status", async (req, res) => {
        try {
            const regs: Record<string, number> = {};
            for (const did of await pushNotifications.registrations.keys()) {
                regs[did] = (await pushNotifications.registrations.get(did))?.length || 0;
            }

            const uptime = getTimeDifference(serverStart.getTime());
            const memory = process.memoryUsage();
            memory.heapTotal /= 1024 * 1024;
            memory.heapUsed /= 1024 * 1024;
            res.json({
                serverStart,
                uptime,
                registrations: regs,
                firehoseStats: {
                    ...firehose.stats,
                    numStreamEventsPerSecond: firehose.stats.numStreamEvents / ((performance.now() - firehose.stats.streamStartNano) / 1000),
                },
                pushNotificationStats: pushNotifications.stats,
                quotesStats: quotes.stats,
                numDidWebRequests,
                numHtmlRequests,
                memoryUsage: memory.heapUsed.toFixed(2) + " / " + memory.heapTotal.toFixed(2) + " MB",
            });
        } catch (e) {
            res.status(400).json(e);
        }
    });

    app.get("/api/numquotes", async (req, res) => {
        try {
            const uris: string[] | string = req.query.uri as string[] | string;
            const quotesPerUri: Record<string, number> = {};
            if (Array.isArray(uris)) {
                for (const uri of uris) {
                    quotesPerUri[uri] = (await quotes.store.get(uri))?.length ?? 0;
                }
            } else if (uris) {
                quotesPerUri[uris] = (await quotes.store.get(uris))?.length ?? 0;
            }
            res.json(quotesPerUri);
        } catch (e) {
            res.status(400).json(e);
        }
    });

    app.get("/api/quotes", async (req, res) => {
        try {
            res.json((await quotes.store.get(req.query.uri as string)) ?? []);
        } catch (e) {
            res.status(400).json(e);
        }
    });

    app.get("/api/resolve-did-web", async (req, res) => {
        numDidWebRequests++;
        try {
            const did = req.query.did as string;
            if (!did.startsWith("did:web:")) {
                res.status(400).json({ error: "Not a did:web" });
                return;
            }
            const didDocUrl = "https://" + did.replace("did:web:", "") + "/.well-known/did.json";
            const response = await fetch(didDocUrl);
            if (!response.ok) {
                res.status(400).json({ error: "Couldn't fetch did.json" });
                return;
            }
            res.json(await response.json());
        } catch (e) {
            res.status(400).json(e);
        }
    });

    app.get("/api/resolve-blob", async (req, res) => {
        numDidWebRequests++;
        try {
            const response = await fetch(req.query.url as string);
            if (!response.ok) {
                res.status(400).json({ error: `Couldn't retrieve ${req.query.url}` });
                return;
            }

            res.setHeader("Content-Type", response.headers.get("content-type") || "application/octet-stream");
            const buffer = await response.arrayBuffer();
            const nodeBuffer = Buffer.from(buffer);
            res.send(nodeBuffer);
        } catch (e) {
            res.status(400).json({ error: "An error occurred" });
        }
    });

    app.get("/api/html", async (req, res) => {
        numHtmlRequests++;
        try {
            const url = req.query.url as string;
            const response = await fetch(url);
            if (!response.ok) {
                res.status(400).json({ error: "Couldn't fetch " + url });
                return;
            }
            res.send(await response.text());
        } catch (e) {
            res.status(400).json(e);
        }
    });

    const server = http.createServer(app);
    server.listen(port, async () => {
        console.log(`App listening on port ${port}`);
    });

    setupLiveReload(server);
})();

async function connectWithRetry(maxRetries = 5, interval = 2000) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const client = await pool.connect();
            try {
                const result = await client.query("SELECT NOW()");
                console.log("Query result:", result.rows);
                return undefined; // Successful connection, exit the function
            } finally {
                client.release();
            }
        } catch (err) {
            console.error("Connection attempt failed:", err);
            retries++;
            if (retries === maxRetries) {
                return new Error("Failed to connect to the database after retries");
            }
            await sleep(interval);
        }
    }
}

function setupLiveReload(server: http.Server) {
    const wss = new WebSocketServer({ server });
    const clients: Set<WebSocket> = new Set();
    wss.on("connection", (ws: WebSocket) => {
        clients.add(ws);
        ws.on("close", () => {
            clients.delete(ws);
        });
    });

    chokidar.watch("html/", { ignored: /(^|[\/\\])\../, ignoreInitial: true }).on("all", (event, path) => {
        clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(`File changed: ${path}`);
            }
        });
    });
    console.log("Initialized live-reload");
}
