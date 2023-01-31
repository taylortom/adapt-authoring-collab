// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function (require) {
  var Origin = require("core/origin");
  var AdaptCollabView = require("./views/adaptCollabView");
  var users = [];
  let allActiveUsers = [];
  const idleTime = 1;
  const socket = new WebSocket("ws://localhost:3000");

  Origin.on("login:changed", loadData);

  Origin.on("user:logout", function () {
    socket.close();
  });

  Origin.on("origin:dataReady", function init() {
    loadData();

    Origin.on("editorView:postRender", function () {
      render();
    });

    Origin.on("location:change", function () {
      locationChange();
    });
  });

  function render() {
    $(".toast-container").empty();
    var acv = new AdaptCollabView(allActiveUsers, users[0]);
    $(".toast-container").append(acv.$el);
  }

  function loadData() {
    $.get("/api/adaptcollab/getUser/")
      .done(function (allUSers) {
        users = allUSers;
        locationChange();
        checkIdle();
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        console.log(Origin);
      });

    socket.addEventListener("open", function (event) {
      // console.log("Connected to WS Server");
    });

    socket.addEventListener("close", function (event) {
      const message = JSON.parse(event.data);
    });

    // Listen for messages
    socket.addEventListener("message", function (event, isBinary) {
      const message = JSON.parse(event.data);
      updateUsers(message);
    });
  }

  function updateUsers(message) {
    if (allActiveUsers.length === 0) {
      allActiveUsers.push(message);
      return;
    }

    const index = allActiveUsers.findIndex((x) => x._id === message._id);

    if (index === undefined || index === -1) {
      allActiveUsers.push(message);
      render();
      return;
    }

    allActiveUsers[index] = message;
    render();
  }

  function userDataLoaded() {
    socket.send(JSON.stringify(users[0]));
    updateUsers(users[0]);
  }

  function locationChange() {
    if (users.length === 0) return;

    originLocation = Origin.location;
    let location = Object.values(originLocation)[3];

    if (!location) {
      location = Object.values(originLocation)[1];
    }

    let currentUser = users[0];

    Object.assign(currentUser, {
      userLocation: location,
      lastActive: new Date().toISOString(),
      idle: false
    });

    Origin.once("editorView:render", function () {
      userDataLoaded();
    });
  }

  function checkIdle() {
    let currentUser = users[0];
    currentUser.idle = false;
    userDataLoaded();

    loop = setInterval(function () {
      if (!currentUser.lastActive) {
        currentUser.lastActive = new Date().toISOString();
      }

      const currentDate = new Date();
      const lastAccess = new Date(currentUser.lastActive);
      const difference = currentDate - lastAccess;
      const minutesDifference = Math.floor(difference / 1000 / 60);

      if (minutesDifference >= idleTime && currentUser.idle !== true) {
        currentUser.idle = true;
        userDataLoaded();
      }
    }, 10000);
  }
});
