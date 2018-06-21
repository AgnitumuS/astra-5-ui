(function() {
"use strict";

window.SettingsSoftcamModule = {
	label: "Softcam",
	link: "#/settings-softcam",
	order: 10,
};

SettingsSoftcamModule.click = function() {
	app.selectHost(SettingsSoftcamModule.link, "-")
};

SettingsSoftcamModule.run = function() {
	app.on("set-softcam", function(event) {
		var hostId = event.host,
			appHost = app.hosts[hostId],
			data = event.data;

		if(data.gid) appHost.config.gid = data.gid;
		var sl = appHost.config.softcam;
		var idx = (sl == undefined) ? -1 : sl.indexOfID(data.softcam.id);
		if(data.softcam.remove && !data.softcam.up) {
			$.msg({ title: "Softcam \"{0}\" removed".format(sl[idx].name) })
		}
		if(idx != -1) {
			sl.splice(idx, 1);
			if(!sl.length) delete(appHost.config.softcam);
		}
		if(!data.softcam.remove) {
			if(!sl) appHost.config.softcam = sl = [];
			sl.push(data.softcam);
			$.msg({ title: "Softcam \"{0}\" saved".format(data.softcam.name) });
		}
	});
};

SettingsSoftcamModule.renderTest = function() {
	var modal = this,
		form = new Form(modal.scope, modal);

	form.input("CaID", "caid", "Testing...").addAttr("readonly");
	if(modal.scope.get("caid") != undefined) {
		form.input("AU", "au").addAttr("readonly");
		form.input("UA", "ua").addAttr("readonly");
		var idents = modal.scope.get("idents");
		if(idents) {
			form.header("Idents");
			$.forEach(idents, function(v, k) {
				form.input(v.id, "idents." + k + ".sa").addAttr("readonly")
			});
		}
	}

	var btnOk = $.element.button("Ok")
		.on("click", function() { modal.remove() });

	form.hr();
	form.submit().addChild(btnOk);
};

SettingsSoftcamModule.renderStreams = function(hostId, softcamId) {
	var modal = this,
		appHost = app.hosts[hostId],
		form = new Form(modal.scope, modal);

	var streams = [], allowedInputs = ["dvb","udp","rtp","http"];
	$.forEach(appHost.config.make_stream, function(s) {
		$.forEach(s.input, function(i, k) {
			i = parseUrl(i);
			if(allowedInputs.indexOf(i.format) != -1) streams.push({
				id: hostId + "/" + s.id,
				inputId: k,
				name: s.name + " #" + (k + 1),
				cam: (softcamId === i.cam),
			});
		})
	});

	streams.sort(function(a,b) { return a.name.localeCompare(b.name) });
	$.forEach(streams, function(v) {
		var x = form.checkbox(v.name, "")
			.on("change", function() {
				var s = $.clone(MainModule.streams[v.id].$config),
					i = parseUrl(s.input[v.inputId]);
				if(this.checked) i.cam = softcamId;
				else delete(i.cam);
				s.input[v.inputId] = makeUrl(i);
				var id = v.id.split("/"),
					streamId = id.pop(),
					hostId = id.pop();
				app.hosts[hostId].request({
					cmd: "set-stream",
					id: streamId,
					stream: s,
				}, function() {
					//
				}, function() {
					$.err({ title: "Failed to save stream" });
				});
			});
		if(v.cam) x.checked = true;
	});

	var btnOk = $.element.button("Ok")
		.addClass("submit")
		.on("click", function() { modal.remove() });

	form.hr();
	form.submit().addChild(btnOk);
}

SettingsSoftcamModule.render = function(hostId) {
	var self = this,
		object = app.renderInit(),
		softcamId = self.scope.get("$softcamId"),
		appHost = app.hosts[hostId],
		tabId = self.scope.get("$tab") || "",
		form = new Form(self.scope, object),
		type = self.scope.get("type");

	var softcamList = [
		{ value: "-", label: "New Softcam" },
		{ value: "", label: "---", disabled: true }
	];
	var softcamSortedList = [];
	$.forEach(appHost.config.softcam, function(i) {
		softcamSortedList.push({ value: i.id, label: i.name });
	});
	softcamSortedList.sort(function(a,b) { return a.label.localeCompare(b.label) });
	softcamList = softcamList.concat(softcamSortedList);
	form.choice("Softcam", "$softcamId", softcamList)
		.on("change", function() {
			if(this.value == "-") app.selectHost(SettingsSoftcamModule.link, "-");
			else $.route(SettingsSoftcamModule.link + "/" + hostId + "/" + this.value);
		});
	form.hr();

	form.tab("$tab", [
		{ label: "General", id: "" },
		{ label: "Advanced", id: "advanced" },
	]);

	if(tabId == "") {
		form.input("Name", "name", "SoftCAM Name").setRequired();
		var x = form.input("ID", "id", "Unique softcam identifier").addValidator(validateId);
		if(softcamId != "-") x.setRequired();
		form.choice("Protocol", "type", [{ value: "newcamd", label: "NewCAMd" }]);

		if(type == "newcamd") {
			form.input("Address", "host", "Domain or IP Address").setRequired();
			form.number("Port", "port", "Port").setRequired().addValidator(validatePort);

			form.input("Login", "user").setRequired();
			form.password("Password", "pass").setRequired();
		}
	}

	if(tabId == "advanced") {
		if(type == "newcamd") {
			form.input("DES Key", "key", "Default: 0102030405060708091011121314");
			form.input("CaID", "caid", "Change server CaID. Example: 06B0");
			form.number("Timeout", "timeout", "Default: 8 sec.");
		}

		form.checkbox("Make new connection for each input", "split_cam");

		form.checkbox("Allow EMM if allowed by the server", "disable_emm")
			.addAttr("data-true", "undefined")
			.addAttr("data-false", "true");

		form.checkbox("Use ECM response with valid checksum only", "ignore_cw")
			.addAttr("data-true", "undefined")
			.addAttr("data-false", "true");

		form.number("Skip ECM", "skip_ecm", "Ignore first ECM packets");
	}

	var serialize = function() {
		if(self.scope.get("$remove")) return { remove: true };

		var data = self.scope.serialize();
		if(!data.id) data.id = appHost.makeUid("softcam");

		return data;
	}

	form.hr();

	var btnApply = $.element.button("Apply")
		.addClass("submit")
		.on("click", function() {
			if(!self.scope.get("$remove") && !self.scope.validate()) {
				$.err({ title: "Form has errors" });
				return;
			}
			var softcam = serialize();
			appHost.request({
				cmd: "set-softcam",
				gid: appHost.config.gid,
				id: softcamId,
				softcam: softcam,
			}, function() {
				if(softcam.remove) {
					app.selectHost(SettingsSoftcamModule.link, "-");
				} else if(softcamId != softcam.id) {
					$.route(SettingsSoftcamModule.link + "/" + hostId + "/" + softcam.id);
				} else {
					self.scope.reset();
				}
			}, function() {
				$.err({ title: "Failed to save softcam" });
			});
		});

	var btnTest = $.element.button("Test")
		.on("click", function() {
			if(!self.scope.validate()) {
				$.err({ title: "Form has errors" });
				return;
			}
			var modal = $.modal().bindScope(SettingsSoftcamModule.renderTest, {});
			appHost.request({
				cmd: "test-softcam",
				config: serialize(),
			}, function(response) {
				var data = response.data;

				if(data.error) {
					modal.remove();
					$.err({ title: "Softcam test failed", text: data.error });
				} else {
					data.info.caid = data.info.caid.toHex(4);
					data.info.au = (data.info.au) ? "YES" : "NO";
					modal.scope.reset(data.info);
				}
			}, function() {
				modal.remove();
				$.err({ title: "Softcam test failed" });
			});
		});

	var btnClone = $.element.button("Clone")
		.on("click", function() {
			var data = self.scope.serialize();
			data.name = (data.name || "") + " (clone)";
			if(data.id != undefined) delete(data.id);
			SettingsSoftcamModule.softcamClone = data;
			app.selectHost(SettingsSoftcamModule.link, "-");
		});

	var btnStreams = $.element.button("Streams")
		.on("click", function() {
			$.modal().bindScope(SettingsSoftcamModule.renderStreams, {}, hostId, softcamId);
		});

	if(softcamId != "-") {
		if(tabId == "") {
			form.checkbox("Remove Softcam", "$remove")
				.setDanger()
				.on("change", function() {
					if(this.checked)
						btnApply.removeClass("submit").addClass("danger");
					else
						btnApply.removeClass("danger").addClass("submit");
				});
		}
	} else {
		btnClone.setDisabled(true);
		btnStreams.setDisabled(true);
	}

	form.submit().addChild(btnApply, btnTest, btnClone, btnStreams);
};

SettingsSoftcamModule.init = function() {
	if($.body.scope) $.body.scope.destroy();

	var scope,
		x = location.hash.slice(SettingsSoftcamModule.link.length + 1).split("/"),
		softcamId = decodeURIComponent(x.pop()),
		hostId = x.pop(),
		appHost = app.hosts[hostId];

	if(!appHost) { $.route(StreamsModule.link); return }

	if(softcamId == "-") {
		if(SettingsSoftcamModule.softcamClone) {
			scope = SettingsSoftcamModule.softcamClone;
			delete(SettingsSoftcamModule.softcamClone);
		} else {
			scope = { "name": "", "type": "newcamd" };
		}
	} else {
		var idx = (appHost.config.softcam) ? appHost.config.softcam.indexOfID(softcamId) : -1;
		if(idx == -1) { $.route(SettingsSoftcamModule.link); return }
		scope = $.clone(appHost.config.softcam[idx]);
	}
	scope.$softcamId = softcamId;

	$.body.bindScope(SettingsSoftcamModule.render, scope, hostId);
};

app.modules.push(SettingsSoftcamModule);
app.settings.push(SettingsSoftcamModule);
})();
