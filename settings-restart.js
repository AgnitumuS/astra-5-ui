(function() {
"use strict";

var SettingsRestartModule = {
	label: "Restart",
	order: 99,
};

SettingsRestartModule.click = function() {
	var modal = $.modal();
	modal.addClass("main-menu");
	$.forEach(app.hosts, function(appHost, hostId) {
		var x = $.element("a")
			.setText(appHost.name)
			.addAttr("href", "#");
		x.on("click", function(event) {
			event.preventDefault();
			modal.remove();
			appHost.restart();
		});
		modal.addChild(x);
	})
	modal.addChild($.element("hr"));
	modal.addChild($.element("a")
		.setText("Cancel")
		.addClass("text-center")
		.addAttr("href", "#/")
		.on("click", function(event) {
			event.preventDefault();
			modal.remove();
		}));
};

app.modules.push(SettingsRestartModule);
app.settings.push(SettingsRestartModule);
})();
