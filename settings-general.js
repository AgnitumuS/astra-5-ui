(function() {
"use strict";

var SettingsGeneralModule = {
	label: "General",
	link: "#/settings-general",
	order: 1,
};

SettingsGeneralModule.run = function() {
	app.on("set-settings", function(event) {
		var hostId = event.host,
			data = event.data,
			appHost = app.hosts[hostId];

		if(data.gid) appHost.config.gid = data.gid;
		if(data.settings) appHost.config.settings = data.settings;
		else delete(appHost.config.settings);

		$.msg({ title: "Settings saved" });
	});

	app.on("set-config", function(event) {
		var hostId = event.host,
			data = event.data,
			appHost = app.hosts[hostId];

		if(data.data) appHost.config[data.key] = data.data;
		else delete(appHost.config[data.key]);

		$.msg({ title: "Settings saved" });
	});
};

SettingsGeneralModule.render = function() {
	var self = this,
		object = app.renderInit(),
		masterHost = app.hosts[location.host],
		form = new Form(self.scope, object);

	form.input("Monitoring", "event_request", "Export telemetry and events to the external server");

	form.checkbox("HTTP Sessions", "http_disable_sessions")
		.addAttr("data-true", "undefined")
		.addAttr("data-false", "true");

	form.header("Default Stream Options");

	form.checkbox("Start stream on demand", "http_keep_active")
		.addAttr("data-true", "undefined")
		.addAttr("data-false", "-1")
		.on("change", function() {
			self.scope.reset();
		});

	if(self.scope.get("http_keep_active") != -1)
		form.number("HTTP Keep Active", "$http_keep_active", "Delay before stop stream if no active connections. Default: 0 (turn off immediately)");

	form.number("Backup Start Delay", "backup_start_delay", "Delay before start next input. Default: 0");
	form.number("Backup Return Delay", "backup_return_delay", "Delay before return to previous input. Default: 0");

	form.number("HTTP Output Buffer", "http_buffer", "Size in Kb of the buffer for each client. Default: 1024");

	form.input("TCP Congestion Control", "http_congestion");
	form.number("CC Limit", "cc_limit", "Default: 0 (not limited)");

	var btnApply = $.element.button("Apply")
		.addClass("submit")
		.on("click", function() {
			masterHost.request({
				cmd: "set-settings",
				settings: self.scope.serialize(),
			}, function(data) {
				//
			}, function() {
				$.err({ title: "Failed to save settings" });
			});
		});

	form.submit().addChild(btnApply);
};

SettingsGeneralModule.init = function() {
	var h = app.hosts[location.host];
	var s = $.clone(h.config.settings) || {};
	$.body.bindScope(SettingsGeneralModule.render, s);
};

app.modules.push(SettingsGeneralModule);
app.settings.push(SettingsGeneralModule);
})();
