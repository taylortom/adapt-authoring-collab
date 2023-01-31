import { AbstractModule } from "adapt-authoring-core";
import path from "path";
import { WebSocketServer } from "ws";
let wss;

/**
 * Module to implement Totara connect API
 * @extends {AbstractModule}
 */
class CollaborationModule extends AbstractModule {
  /** @override */

  async init() {
    // do custom initialisation here
    // const server = await this.app.waitForModule("server");
    /*const PORT = 5000;
    const app = express();
    const server = http.createServer(app);
    const wsServer = new WebSocket.Server({
      server: server
    });

    wsServer.on("connection", function connection(ws) {
      ws.send("Welcome New Client!");

      ws.on("message", function incoming(message) {
        wsServer.clients.forEach(function each(client) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      });
    });

    app.get("/", (req, res) => res.send("Hello World!"));

    server.listen(3000, () => console.log(`Lisening on port :3000`));
    */

    this.sockets = [];

    await this.initRouter();

    const [auth, server] = await this.app.waitForModule("auth", "server");

    const router = server.api.createChildRouter("ws");
    router.addRoute({
      route: "/data",
      handlers: { get: this.getData.bind(this) }
    });
    auth.secureRoute(`${router.path}/data`, "GET", ["read:config"]);

    server.listeningHook.tap(() => {
      wss = new WebSocketServer({
        server: server.httpServer,
        path: "/socket"
      });
      wss.on("connection", this.onConnection.bind(this));

      // setInterval(() => this.send("just testing " + Date.now()), 3000);
    });

    const ui = await this.app.waitForModule("ui");
    ui.addUiPlugin(path.resolve(this.rootDir, "plugins"));
  }

  async initRouter() {
    const [auth, server] = await this.app.waitForModule("auth", "server");
    const router = server.api.createChildRouter("adaptcollab");
    [
      {
        route: "/getUser",
        handlers: { get: this.returnUser.bind(this) }
      }
    ].forEach((r) => {
      router.addRoute({ route: r.route, handlers: r.handlers });
      Object.entries(r.handlers).forEach(([method]) => {
        const scopes =
          method === "get" ? ["read:adaptcollab"] : ["write:adaptcollab"];
        auth.secureRoute(`${router.path}${r.route}`, method, scopes);
      });
    });
  }

  async getData(req, res, next) {
    res.json({ testing: true });
  }

  async onConnection(ws) {
    console.log("new ws connection");
    ws.on("message", this.onMessage.bind(this));
    // this.sockets.push(ws);
  }

  async onMessage(data) {
    const dataTest = data.buffer.toString();
    console.log("ws message", dataTest);
    wss.clients.forEach(function each(client) {
      client.send(dataTest);
    });
  }

  async send(data) {
    this.sockets.forEach((s) => s.send(data));
  }

  async returnUser(req, res, next) {
    const users = await this.app.waitForModule("users");
    const currentUSer = await users.find({ _id: req.auth.user._id });
    res.json(currentUSer);
  }
}

export default CollaborationModule;
