(function() {
"use strict";

var SettingsImportModule = {
	label: "Import",
	link: "#/settings-import",
	order: 90,
};

SettingsImportModule.click = function() {
	app.selectHost(SettingsImportModule.link)
};

SettingsImportModule.render = function(hostId) {
	var self = this,
		object = app.renderInit(),
		appHost = app.hosts[hostId];

	var wrap = $.element("div")
		.addClass("settings-edit");
	object.addChild(wrap);

	var text = $.element("textarea")
		.addClass("input monospace")
		.addAttr("placeholder", "Paste here Astra Script (any version) or JSON configuration")
		.addAttr("tabindex", "0")
		.on("keydown", function(event) {
			switch(event.keyCode) {
				case 9:
					event.preventDefault();
					document.execCommand("insertText", false, "    ");
					break;
				// case 13:
				// 	event.preventDefault();
				// 	document.execCommand("insertText", false, "\n");
				// 	break;
			}
		});

	var btnImport = $.element.button("Import")
		.addClass("submit")
		.on("click", function() {
			appHost.request({
				cmd: "import",
				gid: appHost.config.gid,
				data: text.value,
			}, function(response) {
				var data = response.data;

				if(data.error) {
					$.err({ title: "Import failed", text: data.error, delay: 5 });
					return;
				}

				var c = appHost.config;
				c.gid = data.gid;

				if(data.dvb_tune) {
					if(!c.dvb_tune) c.dvb_tune = [];
					c.dvb_tune = c.dvb_tune.concat(data.dvb_tune);
				}

				if(data.softcam) {
					if(!c.softcam) c.softcam = [];
					c.softcam = c.softcam.concat(data.softcam);
				}

				if(data.make_stream) {
					if(!c.make_stream) c.make_stream = [];
					c.make_stream = c.make_stream.concat(data.make_stream);
				}

				MainModule.removeHost(hostId);
				MainModule.addHost(hostId);

				var x = $.msg({
					title: appHost.name,
					text: "Press \"Apply & Restart\" button to complete import or Reload page to discard changes",
					delay: -1
				});
				x.addChild($.element()
					.addClass("row")
					.addChild($.element.button("Apply & Restart")
						.addClass("col-4")
						.on("click", function(event) {
							event.target.setDisabled(true);
							appHost.upload(function(success) {
								if(success) x.remove();
								else event.target.setDisabled(false);
							});
						})));
			}, function() {
				$.err({ title: "Failed to import settings" });
			});
		});

	var submit = $.element("div")
		.addClass("form-submit")
		.addChild(btnImport);

	wrap.addChild(text, submit);

	self.on("ready", function() {
		text.focus();
	});
};

SettingsImportModule.init = function() {
	var hostId = location.hash.slice(SettingsImportModule.link.length + 1);
	if(!app.hosts[hostId]) {
		$.route(SettingsModule.link);
	} else {
		$.body.bindScope(SettingsImportModule.render, {}, hostId);
	}
};

app.modules.push(SettingsImportModule);
app.settings.push(SettingsImportModule);
})();
