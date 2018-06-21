(function() {
"use strict";

window.SettingsCasModule = {
	label: "CAS",
	link: "#/settings-cas",
	order: 11,
};

SettingsCasModule.click = function() {
	app.selectHost(SettingsCasModule.link, "-")
};

SettingsCasModule.run = function() {
	app.on("set-cas", function(event) {
		var hostId = event.host,
			appHost = app.hosts[hostId],
			data = event.data;

		if(data.gid) appHost.config.gid = data.gid;
		var sl = appHost.config.cas;
		var idx = (sl == undefined) ? -1 : sl.indexOfID(data.cas.id);
		if(data.cas.remove && !data.cas.up) {
			$.msg({ title: "CAS \"{0}\" removed".format(sl[idx].name) })
		}
		if(idx != -1) {
			sl.splice(idx, 1);
			if(!sl.length) delete(appHost.config.cas);
		}
		if(!data.cas.remove) {
			if(!sl) appHost.config.cas = sl = [];
			sl.push(data.cas);
			$.msg({ title: "CAS \"{0}\" saved".format(data.cas.name) });
		}
	});
};

SettingsCasModule.render = function(hostId) {
	var self = this,
		object = app.renderInit(),
		casId = self.scope.get("$casId"),
		appHost = app.hosts[hostId],
		form = new Form(self.scope, object),
		advanced = self.scope.get("$advanced") == true;

	var casList = [
		{ value: "-", label: "New CAS" },
		{ value: "", label: "---", disabled: true }
	];
	var casSortedList = [];
	$.forEach(appHost.config.cas, function(i) {
		casSortedList.push({ value: i.id, label: i.name });
	});
	casSortedList.sort(function(a,b) { return a.label.localeCompare(b.label) });
	casList = casList.concat(casSortedList);
	form.choice("CAS", "$casId", casList)
		.on("change", function() {
			if(this.value == "-") app.selectHost(SettingsCasModule.link, "-");
			else $.route(SettingsCasModule.link + "/" + hostId + "/" + this.value);
		});
	form.hr();

	form.input("Name", "name", "CAS Name").setRequired();
	form.input("Super CAS ID (hex)", "super_cas_id", "00000000")
		.setRequired()
		.addValidator(validateHex)
		.addValidator(function(value) {
			return (!value || value.length == 8);
		});

	form.hr();

	form.input("ECMG Channel ID", "ecmg_channel_id")
		.setRequired()
		.addValidator(validatePort);
	form.input("ECMG Address", "ecmg_host")
		.setRequired();
	form.input("ECMG Port", "ecmg_port")
		.setRequired()
		.addValidator(validatePort);
	form.input("Crypto Period", "ecmg_cp")
		.setRequired();

	form.hr();

	form.choice("EMMG Protocol", "emmg_protocol", [
		{ value: "", label: "Default: TCP" },
		{ value: "udp", label: "UDP", disabled: true }
	]);
	form.number("EMMG Port", "emmg_port")
		.addValidator(validatePort);
	form.number("EMM PID", "emm_pid")
		.setRequired()
		.addValidator(validatePid);
	form.input("EMM Private Data (hex)", "emm_data")
		.addValidator(validateHex);

	form.hr();

	var serialize = function() {
		if(self.scope.get("$remove")) return { remove: true };

		var data = self.scope.serialize();
		if(!data.id) data.id = appHost.makeUid("cas");

		return data;
	}

	var btnApply = $.element.button("Apply")
		.addClass("submit")
		.on("click", function() {
			if(!self.scope.get("$remove") && !self.scope.validate()) {
				$.err({ title: "Form has errors" });
				return;
			}
			var cas = serialize();
			appHost.request({
				cmd: "set-cas",
				gid: appHost.config.gid,
				id: casId,
				cas: cas,
			}, function() {
				if(cas.remove) {
					app.selectHost(SettingsCasModule.link, "-");
				} else if(casId != cas.id) {
					$.route(SettingsCasModule.link + "/" + hostId + "/" + cas.id);
				} else {
					self.scope.reset();
				}
			}, function() {
				$.err({ title: "Failed to save CAS" });
			});
		});

	var btnClone = $.element.button("Clone")
		.on("click", function() {
			var data = self.scope.serialize();
			data.name = (data.name || "") + " (clone)";
			if(data.id != undefined) delete(data.id);
			SettingsCasModule.casClone = data;
			app.selectHost(SettingsCasModule.link, "-");
		});

	if(casId != "-") {
		form.checkbox("Remove", "$remove")
			.setDanger()
			.on("change", function() {
				if(this.checked)
					btnApply.removeClass("submit").addClass("danger");
				else
					btnApply.removeClass("danger").addClass("submit");
			});
	} else {
		btnClone.setDisabled(true);
	}

	form.submit().addChild(btnApply, btnClone);
};

SettingsCasModule.init = function() {
	var scope,
		x = location.hash.slice(SettingsCasModule.link.length + 1).split("/"),
		casId = decodeURIComponent(x.pop()),
		hostId = x.pop(),
		appHost = app.hosts[hostId];

	if(!appHost) { $.route(StreamsModule.link); return }

	if(casId == "-") {
		if(SettingsCasModule.casClone) {
			scope = SettingsCasModule.casClone;
			delete(SettingsCasModule.casClone);
		} else {
			scope = { "name": "" };
		}
	} else {
		var idx = (appHost.config.cas) ? appHost.config.cas.indexOfID(casId) : -1;
		if(idx == -1) { $.route(SettingsCasModule.link); return }
		scope = $.clone(appHost.config.cas[idx]);
	}

	scope.$casId = casId;

	$.body.bindScope(SettingsCasModule.render, scope, hostId);
};

app.modules.push(SettingsCasModule);
app.settings.push(SettingsCasModule);
})();
