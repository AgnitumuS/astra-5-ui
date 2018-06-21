(function() {
"use strict";

var SettingsHttpPlayModule = {
	label: "HTTP Play",
	link: "#/settings-http-play",
	order: 7,
};

SettingsHttpPlayModule.render = function() {
	var self = this,
		object = app.renderInit(),
		masterHost = app.hosts[location.host],
		form = new Form(self.scope, object);

	var categoriesMap = [{ value: "" }];
    $.forEach(masterHost.config.categories, function(x) {
        categoriesMap.push({ value: x.name });
    });
    categoriesMap.sort(function(a,b) { return a.value.localeCompare(b.value) });

	form.checkbox("Allow HTTP access to all streams", "http_play_stream");
	form.checkbox("Allow HLS access to all streams", "http_play_hls");
	form.choice("Playlist Arrange", "playlist_arrange", categoriesMap);
	form.group().setHtml("<a href=\"/playlist.m3u8\" target=\"_blank\">playlist.m3u8</a>");

	form.hr();

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

SettingsHttpPlayModule.init = function() {
	var h = app.hosts[location.host];
	var s = $.clone(h.config.settings) || {};
	$.body.bindScope(SettingsHttpPlayModule.render, s);
};

app.modules.push(SettingsHttpPlayModule);
app.settings.push(SettingsHttpPlayModule);
})();
