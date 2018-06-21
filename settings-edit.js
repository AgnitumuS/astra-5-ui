(function() {
"use strict";

var SettingsEditModule = {
	label: "Edit Config",
	link: "#/settings-edit",
	order: 91,
};

SettingsEditModule.click = function() {
	app.selectHost(SettingsEditModule.link)
};

SettingsEditModule.render = function(hostId) {
	var self = this,
		object = app.renderInit(),
		appHost = app.hosts[hostId];

	var wrap = $.element("div")
		.addClass("settings-edit");
	object.addChild(wrap);

	var text = $.element("textarea")
		.addClass("input monospace")
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

	var btnSave = $.element.button("Save")
		.addClass("danger")
		.on("click", function() {
			appHost.request({
				cmd: "import",
				gid: appHost.config.gid,
				data: text.value,
			}, function() {
				try {
					var r = JSON.parse(text.value || "{}");
					appHost.config = r;
				} catch(e) {
					$.err({ title: "Error", text: e.toString() });
					return;
				}

				MainModule.removeHost(hostId);
				MainModule.addHost(hostId);

				var x = $.msg({
					title: appHost.name,
					text: "Press \"Apply & Restart\" button to complete export or Reload page to discard changes",
					delay: -1,
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
				$.err({ title: "Failed to save settings" });
			});
		});

	var submit = $.element("div")
		.addClass("form-submit")
		.addChild(btnSave);

	wrap.addChild(text, submit);

	self.on("ready", function() {
		text.textContent = JSON.stringify($.clone(appHost.config), null, 4);
		text.setSelectionRange(0, 0);
		text.focus();
	});
};

SettingsEditModule.init = function() {
	var hostId = location.hash.slice(SettingsEditModule.link.length + 1);
	if(!app.hosts[hostId]) {
		$.route(SettingsModule.link);
	} else {
		$.body.bindScope(SettingsEditModule.render, {}, hostId);
	}
};

app.modules.push(SettingsEditModule);
app.settings.push(SettingsEditModule);
})();
