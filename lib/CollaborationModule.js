import { AbstractModule } from "adapt-authoring-core";
import path from "path";
import { WebSocketServer } from "ws";

/**
 * Module to implement Totara connect API
 * @extends {AbstractModule}
 */
class CollaborationModule extends AbstractModule {
  /** @override */
  static get USER_STATUS() {
    return {
      ACTIVE: "ACTIVE",
      IDLE: "IDLE"
    };
  }

  async init() {
    this.sockets = [];
    this.allActiveUsers = [];
    this.activeUsers = {};
    this.idleTime = 1;
    this.wss;

    await this.initRouter();

    const [auth, server] = await this.app.waitForModule("auth", "server");

    const router = server.api.createChildRouter("ws");
    router.addRoute({
      route: "/data",
      handlers: { get: this.getData.bind(this) }
    });
    auth.secureRoute(`${router.path}/data`, "GET", ["read:config"]);

    server.listeningHook.tap(() => {
      this.wss = new WebSocketServer({
        server: server.httpServer,
        path: "/socket"
      });
      this.wss.on("connection", this.onConnection.bind(this));
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
      router.addRoute(r);
      Object.entries(r.handlers).forEach(([method]) => {
        auth.secureRoute(`${router.path}${r.route}`, method, [`${method === "get" ? 'read' : 'write'}:adaptcollab`]);
      });
    });
  }

  async getData(req, res, next) {
    res.json({ testing: true });
  }

  async onConnection(ws) {
    ws.on("close", this.onClose.bind(this));
    ws.on("message", this.onMessage.bind(this));
    this.sockets.push(ws);
  }

  async onMessage(data) {
    const message = data.toString();
    const arr = message.split("::");

    switch (arr[1]) {
      case "newUser":
        this.newUser(arr[0], arr[2]);
        break;
      case "idle":
        this.checkIdle(arr[0], arr[2]);
        break;
      case "location":
        this.updateLocation(arr[0], arr[2]);
        break;
      default:
        console.log("no message found on switch");
    }
  }

  async updateActiveUsers(currentUser) {
    //console.log(currentUser.userLocation)
    const location = currentUser.userLocation
    const notifyUsers = this.allActiveUsers.filter(user => user.userLocation === location);
    const data = JSON.stringify(notifyUsers)
    notifyUsers.forEach(user => user.socket.send(data));
  }

  async checkIdle(userID, status) {
    // CollaborationModule.USER_STATUS.IDLE
    const index = this.allActiveUsers.findIndex((x) => x.id === userID);
    this.allActiveUsers[index].status = status
    this.updateActiveUsers(this.allActiveUsers[index]);
  }

  async updateLocation(userID, location) {
    if (this.allActiveUsers === 0) return;

    const index = this.allActiveUsers.findIndex((x) => x.id === userID);
    if (index === undefined || index === -1) return

    this.allActiveUsers[index].userLocation = location
    this.updateActiveUsers(this.allActiveUsers[index]);
  }

  async newUser(userID, user) {
    let newUser = JSON.parse(user);
    const index = this.allActiveUsers.findIndex((x) => x.id === userID);

    if (index !== -1) {
      this.allActiveUsers.splice(index, 1).pop();
    }

    newUser.socket = this.sockets.slice(-1).pop();
    this.allActiveUsers.push(newUser);
    this.updateActiveUsers(newUser);
  }

  async onClose(data) {
    const index = this.sockets.findIndex((socket) => socket === this);
    this.sockets.splice(index, 1).pop();
  }

  async returnUser(req, res, next) {
    try {
      const users = await this.app.waitForModule("users");
      res.json(await users.find({ _id: req.auth.user._id }));
    } catch(e) {
      res.sendError(e);
    }
  }
}

export default CollaborationModule;
