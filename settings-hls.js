(function() {
"use strict";

var SettingsHlsModule = {
	label: "HLS",
	link: "#/settings-hls",
	order: 6,
};

SettingsHlsModule.click = function() {
	app.selectHost(SettingsHlsModule.link)
};

SettingsHlsModule.render = function(hostId) {
	var self = this,
		object = app.renderInit(),
		appHost = app.hosts[hostId],
		form = new Form(self.scope, object);

	form.input("Duration", "duration", "Segments duration in seconds. Default: 5");
	form.input("Quantity", "quantity", "Number of segments. Default: 6");

	form.choice("Segments naming", "naming", [
		{ value: "", label: "Default: PCR hash" },
		{ value: "seq", label: "Sequence"},
	]);

	form.checkbox("Round duration value", "round_duration");
	form.checkbox("Use Expires header", "expires_header");

	var defaultHeaders = {
		m3u8: [
			"Access-Control-Allow-Origin: *",
			"Access-Control-Allow-Methods: GET",
			"Access-Control-Allow-Credentials: true",
			"Content-Type: application/vnd.apple.mpegURL",
		],
		ts: [
			"Access-Control-Allow-Origin: *",
			"Access-Control-Allow-Methods: GET",
			"Access-Control-Allow-Credentials: true",
			"Content-Type: video/MP2T",
		],
	};

	var makeHeader = function(v) {
		var l = self.scope.get(v + "_headers");
		self.scope.set("$default_" + v + "_headers", !l);
		form.checkbox("Use default headers for ." + v, "$default_" + v + "_headers")
			.on("change", function() {
				var x = (this.checked) ? undefined : defaultHeaders[v];
				self.scope.set(v + "_headers", x);
				self.scope.reset();
			});
		if(!!l) {
			form.header(v + " Headers", "New Header", function() {
				l.push("");
				self.scope.reset();
				document.querySelector("[name=\"" + v + "_headers." + (l.length - 1) + "\"]").focus();
			});
			$.forEach(l, function(lv, k) {
				form.input("", v + "_headers." + k);
			});
		}
	};

	form.hr();
	makeHeader("m3u8");
	form.hr();
	makeHeader("ts");

	form.hr();

	var serialize = function() {
		var data = self.scope.serialize();
		$.forEach(["m3u8_headers", "ts_headers"], function(v) {
			var a = data[v];
			if(a) {
				for(var i = 0; i < a.length; ) {
					if(!a[i]) a.splice(i, 1);
					else i++;
				}
				if(!a.length) delete(data[v]);
			}
		});
		return ($.isObjectEmpty(data)) ? undefined : data;
	};

	var btnApply = $.element.button("Apply")
		.addClass("submit")
		.on("click", function() {
			appHost.request({
				cmd: "set-config",
				key: "hls",
				data: serialize(),
			}, function(data) {
				//
			}, function() {
				$.err({ title: "Failed to save settings" });
			});
		});

	form.submit().addChild(btnApply);
};

SettingsHlsModule.init = function() {
	var hostId = location.hash.slice(SettingsHlsModule.link.length + 1).split("/");
	if(!hostId || !app.hosts[hostId]) { $.route(StreamsModule.link); return }
	var s = $.clone(app.hosts[hostId].config.hls) || {};
	$.body.bindScope(SettingsHlsModule.render, s, hostId, 1234, 5678);
};

app.modules.push(SettingsHlsModule);
app.settings.push(SettingsHlsModule);
})();
