// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function (require) {
  var Origin = require("core/origin");
  var AdaptCollabView = require("./views/adaptCollabView");
  const [protocol, serverRoot] = window.location.origin.split("//");
  this.socket;
  this.user = {};

  Origin.on("login:changed", loadData);

  Origin.on("origin:dataReady", function init() {
    loadData();
  });

  function render(users) {
    $(".toast-container").empty();
    var acv = new AdaptCollabView(users);
    $(".toast-container").append(acv.$el);
  }

  function setupEventListeners() {
    let timeout;
    $("body,html").bind(
      "touchstart touchmove scroll mousedown DOMMouseScroll mousewheel keyup",
      () => {
        if (timeout) {
          clearTimeout(timeout);
          if (this.user.status !== 'ACTIVE') {
            this.user.status = 'ACTIVE'
            this.socket.send(`${this.user.id}::idle::ACTIVE`)
          }
        }
        timeout = setTimeout(() => {
          this.user.status = 'INACTIVE'
          this.socket.send(`${this.user.id}::idle::INACTIVE`)
        }, 60000);
      }
    );

    Origin.on("location:change", function () {
      socket.send(`${user.id}::location::${window.location.hash}`);
    });

    Origin.on("editorView:postRender", function () {
      render();
    });

    this.socket.addEventListener("message", function (event) {
      const data = JSON.parse(event.data);
      console.log(data)
      render(data)
    });
  }

  function dataLoaded(currentUser) {
    this.socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${serverRoot}/socket`);

    this.user = {
      id: currentUser._id,
      email: currentUser.email,
      userLocation: window.location.hash,
      status: 'ACTIVE',
      socket: this.socket
    };

    this.socket.onopen = function (e) {
      const newUser = JSON.stringify(user)
      socket.send(`${user.id}::newUser::${newUser}`);
      setupEventListeners();
    };
  }

  function loadData() {
    $.get("/api/adaptcollab/getUser/")
      .done(function (currentUser) {
        dataLoaded(currentUser[0]);
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        console.log("user not found");
      });
  }
});
