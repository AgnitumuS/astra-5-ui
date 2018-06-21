(function() {
"use strict";

window.SettingsUsersModule = {
	label: "Users",
	link: "#/settings-users",
	order: 5,
	search: true,
	menu: [
		{ label: "New User", click: function() {
			SettingsUsersModule.openConfig();
		}},
	],
};

SettingsUsersModule.typeMap = {
	"3": "User" ,
	"2": "Observer",
	"1": "Administrator" ,
};

SettingsUsersModule.modules = [];

SettingsUsersModule.run = function() {
	app.on("set-user", function(event) {
		var hostId = event.host,
			data = event.data,
			appHost = app.hosts[hostId];

		if(data.id == app.login) {
			location.reload(false);
			return;
		}

		if(data.user.remove) {
			$.msg({ title: "User \"{0}\" removed".format(data.id) });
			delete(appHost.config.users[data.id])
			if(SettingsUsersModule.removeUser) {
				SettingsUsersModule.removeUser(data.id);
			}
		} else {
			appHost.config.users[data.id] = data.user;
			$.msg({ title: "User \"{0}\" saved".format(data.id) });
			if(SettingsUsersModule.addUser) {
				SettingsUsersModule.removeUser(data.id);
				SettingsUsersModule.addUser(data.id, data.user);
			}
		}
	});
};

SettingsUsersModule.renderConfig = function() {
	var modal = this,
		form = new Form(modal.scope, modal),
		login = modal.scope.get("login"),
		appHost = app.hosts[location.host];

	if(app.login != login) {
		form.checkbox("Enable", "user.enable").addAttr("data-false", "false");
	}

	var inputLogin = form.input("Login", "login");
	var inputPass = form.password("Password", "user.password");

	if(login) {
		inputLogin.setDisabled(true);

		if(modal.scope.get("user.firstrun")) {
			inputPass.setRequired();
			modal.scope.set("user.firstrun");
		}
	} else {
		inputLogin
			.setRequired()
			.addValidator(function(value) {
				if(value == login) return true;
				return appHost.config.users[value] == undefined;
			});
	}

	form.input("IP", "user.ip");
	form.input("Comment", "user.comment");

	if(app.login != login) {
		var typeMap = [];
		$.forEach(SettingsUsersModule.typeMap, function(label, value) {
			typeMap.push({ value: value, label: label })
		});
		typeMap.sort(function(a,b) { return a.label.localeCompare(b.label) });
		form.choice("Type", "user.type", typeMap);
	}

	$.forEach(SettingsUsersModule.modules, function(module) {
		form.hr();
		module.renderSettings.call(modal, form);
	});

	form.hr();

	var btnApply = $.element.button("Apply")
		.addClass("submit")
		.on("click", function() { if(modal.scope.validate()) modal.submit() });

	var btnCancel = $.element.button("Cancel")
		.on("click", function() { modal.remove() });

	if(login && app.login != login)
		form.checkbox("Remove user", "user.remove")
			.setDanger()
			.on("change", function() {
				if(this.checked)
					btnApply.removeClass("submit").addClass("danger");
				else
					btnApply.removeClass("danger").addClass("submit");
			});

	form.submit().addChild(btnApply, btnCancel);
};

SettingsUsersModule.openConfig = function(login) {
	var modalData = {};
	if(login == undefined) {
		modalData.login = "";
		modalData.user = { enable: true, type: 3 };
	} else {
		modalData.login = login;
		modalData.user = $.clone(app.hosts[location.host].config.users[login]);
	}

	$.modal()
		.bindScope(SettingsUsersModule.renderConfig, modalData)
		.on("submit", function() {
			var data = this.scope.serialize();
			if(data.user.remove) data.user = { remove: true };

			var appHost = app.hosts[location.host];
			appHost.request({
				cmd: "set-user",
				id: data.login,
				user: data.user
			}, function() {
				//
			}, function() {
				$.err({ title: "Failed to save user" });
			});
		});
};

SettingsUsersModule.render = function() {
	var self = this,
		object = app.renderInit();

	var orderString = function(a, b) {
		var ca = a.innerHTML;
		var cb = b.innerHTML;
		return ca.localeCompare(cb);
	};

	var orderNumber = function(a, b) {
		var ca = Number(a.dataset.value);
		var cb = Number(b.dataset.value);
		return (ca == cb) ? 0 : ((ca > cb) ? 1 : -1);
	};

	var header = $.element("thead")
		.addChild($.element("tr")
			.addChild(
				$.element("th")
					.setText("Login")
					.setStyle("width", "200px")
					.dataOrder(orderString, true),
				$.element("th")
					.setText("Comment")
					.addClass("expand")
					.dataOrder(orderString),
				$.element("th")
					.setText("Type")
					.setStyle("width", "150px")
					.dataOrder(orderNumber),
				$.element("th")
					.setText("Created")
					.setStyle("width", "150px")
					.dataOrder(orderNumber)));

	$.forEach(SettingsUsersModule.modules, function(module) {
		if(module.renderHeader) module.renderHeader(header.firstChild);
	});

	var content = $.element("tbody");
	content.nodes = {};

	var table = $.element("table")
		.addClass("table hover")
		.addChild(header, content);
	object.addChild(table);

	$.tableInit(table);

	SettingsUsersModule.addUser = function(login, u) {
		var d = new Date(u.created * 1000);
		var dd = ("0" + d.getDate()).slice(-2);
		var dm = monthMap[d.getMonth()];
		var dy = d.getFullYear();

		var row = $.element("tr")
			.addChild(
				$.element("td")
					.setText(login),
				$.element("td")
					.setText(u.comment || ""),
				$.element("td")
					.addAttr("data-value", u.type)
					.setText(SettingsUsersModule.typeMap[u.type]),
				$.element("td")
					.addAttr("data-value", u.created)
					.setText(dd + " " + dm + " " + dy))
			.on("click", function() {
				SettingsUsersModule.openConfig(login);
			});

		$.forEach(SettingsUsersModule.modules, function(module) {
			if(module.renderItem) module.renderItem(row, u);
		});

		if(u.enable == undefined) u.enable = true;
		if(!u.enable) row.addClass("text-delete text-gray");

		content.nodes[login] = row;
		$.tableSortInsert(table, row);
	};

	SettingsUsersModule.removeUser = function(id) {
		if(content.nodes[id]) {
			content.nodes[id].remove();
			delete(content.nodes[id]);
		}
	};

	var appHost = app.hosts[location.host];
	$.forEach(appHost.config.users, function(data, login) {
		SettingsUsersModule.addUser(login, data);
	});

	app.search = function(value) {
		$.tableFilter(content, value.toLowerCase());
	};

	self.on("destroy", function() {
		content.empty();
		content.nodes = {};

		delete(SettingsUsersModule.addUser);
		delete(SettingsUsersModule.removeUser);
	});

	self.on("ready", function() {
		document.querySelector(".search").focus()
	});
};

SettingsUsersModule.init = function() {
	$.body.bindScope(SettingsUsersModule.render, {});
};

app.modules.push(SettingsUsersModule);
app.settings.push(SettingsUsersModule);
})();
