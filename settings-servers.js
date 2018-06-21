(function() {
"use strict";

window.SettingsServersModule = {
	label: "Servers",
	link: "#/settings-servers",
	order: 15,
};

SettingsServersModule.run = function() {
	app.on("set-server", function(event) {
		var masterHost = app.hosts[location.host],
			data = event.data;

		if(data.server.remove) {
			var s = masterHost.config.servers[data.id];
			app.removeHost(s);
			$.msg({ title: "Server \"{0}\" removed".format(s.name) });
			masterHost.config.servers.splice(data.id, 1);
			if(!masterHost.config.servers.length) delete(masterHost.config.servers);
		} else {
			if(data.id != undefined) {
				app.removeHost(masterHost.config.servers[data.id]);
				masterHost.config.servers[data.id] = data.server;
			}else {
				if(!masterHost.config.servers) masterHost.config.servers = [];
				masterHost.config.servers.push(data.server);
			}
			app.addHost(data.server);
			$.msg({ title: "Server \"{0}\" saved".format(data.server.name) });
		}
	});
};

SettingsServersModule.renderTest = function() {
	var modal = this,
		form = new Form(modal.scope, modal);

	form.input("Version", "version", "Testing...").addAttr("readonly");

	var btnOk = $.element.button("Ok")
		.on("click", function() { modal.remove() });

	form.hr();
	form.submit().addChild(btnOk);
};

SettingsServersModule.render = function() {
	var self = this,
		object = app.renderInit(),
		serverId = self.scope.get("$serverId"),
		masterHost = app.hosts[location.host],
		form = new Form(self.scope, object);

	var serversList = [
		{ value: "-", label: "New Server" },
		{ value: "", label: "---", disabled: true }
	];
	var sortedList = { streamer: [], transcoder: [], relay: [] };
	$.forEach(masterHost.config.servers, function(s, i) {
		sortedList[s.type].push({ value: i, label: s.name })
	});
	$.forEach(sortedList, function(sl) {
		sl.sort(function(a,b) { return a.label.localeCompare(b.label) })
	});
	if(sortedList.streamer.length) serversList.push({ group: "Streamers", items: sortedList.streamer });
	if(sortedList.transcoder.length) serversList.push({ group: "Transcoders", items: sortedList.transcoder });
	if(sortedList.relay.length) serversList.push({ group: "Relays", items: sortedList.relay });
	form.choice("Server", "$serverId", serversList)
		.on("change", function() {
			$.route(SettingsServersModule.link + "/" + this.value);
		});
	form.hr();

	form.input("Name", "name", "Server Name").setRequired();
	form.choice("Type", "type", [
		{ value: "streamer", label: "Streamer" },
		{ value: "transcoder", label: "Transcoder", disabled: true },
		{ value: "relay", label: "Relay", disabled: true },
	]);

	form.input("Address", "host", "Domain or IP Address").setRequired();
	form.number("Port", "port", "Port").setRequired().addValidator(validatePort);

	var maskPass = function(p) {
		var pm = (!p) ? "" : ((new Array(p.length + 1)).join("*"));
		self.scope.set("$maskPass", pm);
	};
	maskPass(self.scope.get("pass"));

	form.input("Login", "user");
	form.input("Password", "$maskPass")
		.on("focus", function() {
			self.scope.set("$maskPass", self.scope.get("pass") || "");
		})
		.on("blur", function() {
			self.scope.set("pass", this.value);
			maskPass(this.value);
		});

/*    _____ _    _ ____  __  __ _____ _______
     / ____| |  | |  _ \|  \/  |_   _|__   __|
    | (___ | |  | | |_) | \  / | | |    | |
     \___ \| |  | |  _ <| |\/| | | |    | |
     ____) | |__| | |_) | |  | |_| |_   | |
    |_____/ \____/|____/|_|  |_|_____|  |*/

	form.hr();

	var serialize = function() {
		if(self.scope.get("$remove")) return { remove: true };
		else return self.scope.serialize();
	}

	var btnApply = $.element.button("Apply")
		.addClass("submit")
		.on("click", function() {
			if(!self.scope.get("$remove") && !self.scope.validate()) {
				$.err({ title: "Form has errors" });
				return;
			}
			var server = serialize();
			masterHost.request({
				cmd: "set-server",
				id: (serverId != "-") ? serverId : undefined,
				server: server,
			}, function(data) {
				if(server.remove) {
					$.route(SettingsServersModule.link);
				} else if(serverId == "-") {
					var i = masterHost.config.servers.length - 1;
					$.route(SettingsServersModule.link + "/" + i);
				} else {
					self.scope.reset();
				}
			}, function() {
				$.err({ title: "Failed to save server" });
			});
		});

	var btnTest = $.element.button("Test")
		.on("click", function() {
			if(!self.scope.validate()) {
				$.err({ title: "Form has errors" });
				return;
			}
			var modal = $.modal().bindScope(SettingsServersModule.renderTest, {});
			var data = self.scope.serialize();
			var headers = {};
			if(data.user) {
				var token = data.user;
				if(data.pass) token += ":" + data.pass;
				headers["Authorization"] = "Basic " + $.base64Encode(token);
			}

			$.http({
				method: "POST",
				url: "http://" + data.host + ":" + data.port + "/control/",
				data: JSON.stringify({ cmd: "version" }),
				headers: headers,
			}, function(response) {
				var data = JSON.parse(response.text);
				data.version = "Astra " + data.version;
				modal.scope.reset(data);
			}, function(response) {
				modal.remove();
				$.err({ title: "Failed to test server" });
			});
		});

	if(serverId != "-") {
		form.checkbox("Remove Server", "$remove")
			.setDanger()
			.on("change", function() {
				if(this.checked)
					btnApply.removeClass("submit").addClass("danger");
				else
					btnApply.removeClass("danger").addClass("submit");
			});
	}

	form.submit().addChild(btnApply, btnTest);
};

SettingsServersModule.init = function() {
	var scope,
		serverId = location.hash.slice(SettingsServersModule.link.length + 1);

	if(!serverId) { $.route(SettingsServersModule.link + "/-"); return }

	if(serverId == "-") {
		scope = { "name": "", "type": "streamer" };
	} else {
		var masterHost = app.hosts[location.host];
		serverId = Number(serverId);
		scope = $.clone(masterHost.config.servers[serverId]);
		if(!scope) { $.route(SettingsServersModule.link); return }
	}
	scope.$serverId = serverId;

	$.body.bindScope(SettingsServersModule.render, scope);
};

app.modules.push(SettingsServersModule);
app.settings.push(SettingsServersModule);
})();
