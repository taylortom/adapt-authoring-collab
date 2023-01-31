// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function (require) {
  var Origin = require("core/origin");
  var OriginView = require("core/views/originView");
  const allUsers = [];
  let currentLocation = "";

  var AdaptCollabView = OriginView.extend(
    {
      className: "adaptcollab",
      model: new Backbone.Model(),

      events: {
        "mouseover .js-userIcon": "onUserTooltip",
        "mouseleave .js-userIcon": "removeUserToolTip"
      },

      initialize(users, currentUser) {
        console.log(currentUser);
        currentLocation = currentUser.userLocation;
        console.log(currentLocation);
        this.listenToEvents();
        this.render(users);
      },

      removeUserToolTip(event) {
        this.$(".collab__tooltip-container").empty();
      },

      onUserTooltip(event) {
        const previousToolTip = $(".collab__tooltip");
        if (previousToolTip.length > 0) return;

        var $target = $(event.currentTarget);
        const email = $target.attr("user");
        const element = {
          email: email
        };

        // Don't allow event to propogate, to stop the document over events
        event.stopPropagation();

        var $toolTipTemplate = $(Handlebars.partials.part_tooltip(element));
        this.$(".collab__tooltip-container").append($toolTipTemplate);
      },

      listenToEvents() {
        this.listenTo(Origin, {
          "remove:views": this.removeView,
          "location:change": this.locationChange
        });
      },

      removeView() {
        $(".toast-container").addClass("display-none");
        this.remove();
      },

      updateUsers(users) {
        users.forEach((element) => {
          if (element.userLocation !== currentLocation) return;

          const username = element.email.slice(0, 2).toUpperCase();
          element.userName = username;

          var user = $(Handlebars.partials.part_userIcon(element));
          this.$(".collab__icon-container").append(user);
        });
      },

      render(users) {
        $(".toast-container").removeClass("display-none");
        var template = Handlebars.templates[this.constructor.template];
        this.$el.html(template());
        this.updateUsers(users);
      }
    },
    {
      template: "adaptcollab"
    }
  );

  return AdaptCollabView;
});
