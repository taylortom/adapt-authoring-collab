import { AbstractModule } from "adapt-authoring-core";
import path from "path";
import WebSocket from "ws";
import express from "express";
import * as http from "http";

/**
 * Module to implement Totara connect API
 * @extends {AbstractModule}
 */
class CollaborationModule extends AbstractModule {
  /** @override */

  async init() {
    // do custom initialisation here
    const server = await this.app.waitForModule("server");
    const PORT = 5000;
    const app = express();
    // const server = http.createServer(app);
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

    await this.initRouter();
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

  async returnUser(req, res, next) {
    const users = await this.app.waitForModule("users");
    const currentUSer = await users.find({ _id: req.auth.user._id });
    res.json(currentUSer);
  }
}

export default CollaborationModule;
