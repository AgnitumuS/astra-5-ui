(function() {
"use strict";

window.SettingsGroupsModule = {
	label: "Groups",
	link: "#/settings-groups",
	order: 20,
};

SettingsGroupsModule.run = function() {
	app.on("set-category", function(event) {
		var masterHost = app.hosts[location.host],
			data = event.data;

		if(data.category.remove) {
			var n = masterHost.config.categories[data.id].name;
			$.msg({ title: "Category \"{0}\" removed".format(n) });
			masterHost.config.categories.splice(data.id, 1);
			if(!masterHost.config.categories.length) delete(masterHost.config.categories);
		} else {
			if(data.id != undefined) {
				masterHost.config.categories[data.id] = data.category;
			}else {
				if(!masterHost.config.categories) masterHost.config.categories = [];
				masterHost.config.categories.push(data.category);
			}
			$.msg({ title: "Category \"{0}\" saved".format(data.category.name) });
		}
	});
};

SettingsGroupsModule.renderStreams = function() {
	var modal = this,
		form = new Form(modal.scope, modal),
		category = modal.scope.get("category"),
		group = modal.scope.get("group");

	if(group == "") group = undefined;

	form.header(category);
	form.choice("", "group", modal.scope.get("groups"))
		.on("change", function() {
			modal.scope.reset();
		});
	form.hr();

	var streams = [];
	$.forEach(MainModule.streams, function(v, k) {
		var g;
		if(v.$config.groups) g = v.$config.groups[category];
		streams.push({ id: k, name: v.$config.name, group: g == group });
	});
	streams.sort(function(a,b) { return a.name.localeCompare(b.name) });
	$.forEach(streams, function(v) {
		var x = form.checkbox(v.name, "");
		if(v.group) x.checked = true;
		x.on("change", function() {
			var s = $.clone(MainModule.streams[v.id].$config)
			if(this.checked == false) {
				if(!group) {
					this.checked = true;
					return;
				} else {
					delete(s.groups[category]);
					if($.isObjectEmpty(s.groups)) delete(s.groups);
				}
			} else {
				if(!group) {
					delete(s.groups[category]);
					if($.isObjectEmpty(s.groups)) delete(s.groups);
				} else {
					if(!s.groups) s.groups = {};
					s.groups[category] = group;
				}
			}
			var id = v.id.split("/"),
				streamId = id.pop(),
				hostId = id.pop(),
				appHost = app.hosts[hostId];
			appHost.request({
				cmd: "set-stream",
				id: streamId,
				stream: s,
			}, function() {
				//
			}, function() {
				$.err({ title: "Failed to save stream" });
			});
		});
	});

	var btnOk = $.element.button("Ok")
		.addClass("submit")
		.on("click", function() { modal.remove() });

	form.hr();
	form.submit().addChild(btnOk);
}

SettingsGroupsModule.render = function() {
	var self = this,
		object = app.renderInit(),
		categoryId = self.scope.get("$categoryId"),
		masterHost = app.hosts[location.host],
		form = new Form(self.scope, object);

	var categoriesList = [
		{ value: "-", label: "New Category" },
		{ value: "", label: "---", disabled: true }
	];
	var categoriesSortedList = [];
	$.forEach(masterHost.config.categories, function(i,k) {
		categoriesSortedList.push({ value: k, label: i.name });
	});
	categoriesSortedList.sort(function(a,b) { return a.label.localeCompare(b.label) });
	categoriesList = categoriesList.concat(categoriesSortedList);
	form.choice("Category", "$categoryId", categoriesList)
		.on("change", function() {
			$.route(SettingsGroupsModule.link + "/" + this.value);
		});
	form.hr();

	form.input("Name", "name", "Category Name").setRequired();

	var groups = self.scope.get("groups");
	if(!groups) { groups = []; self.scope.set("groups", groups); }

	form.header("Groups", "Add Group", function() {
		groups.push({ name: "" });
		self.scope.reset();
		document.querySelector("[name=\"groups." + (groups.length - 1) + ".name\"]").focus();
	});

	$.forEach(groups, function(v, k) {
		if(v.name == undefined) return;
		var s = $.element("select")
			.addClass("button icon icon-move")
			.on("change", function() {
				if(this.value == "-1") groups.splice(k, 1);
				else groups.move(k, Number(this.value));
				self.scope.reset();
			});
		for(var j = 0; j < groups.length; ++j) s.addChild($.element("option").setValue(j.toString()).setText(j + 1));
		s.addChild(
			$.element("option").setDisabled(true).setText("---"),
			$.element("option").setValue("-1").setText("Remove"));
		s.value = k.toString();

		form.input(k + 1, "groups." + k + ".name", "Group Name")
			.addButton(s)
			.on("keydown", function() {
				if(event.keyCode == 13) {
					event.preventDefault();
					var n = k + 1;
					if(n == groups.length) {
						groups.push({ name: "" });
						self.scope.reset();
					}
					document.querySelector("[name=\"groups." + (n) + ".name\"]").focus();
				}
			})
	});

	form.hr();

	var serialize = function() {
		if(self.scope.get("$remove")) return { remove: true };

		var data = self.scope.serialize();

		$.forEach(data.groups, function(g) {
			if(!g.name) {
				g.remove = true;
				delete(g.name);
			}
		});

		// TODO: clean groups

		return data;
	}

	var btnApply = $.element.button("Apply")
		.addClass("submit")
		.on("click", function() {
			var category = serialize();
			masterHost.request({
				cmd: "set-category",
				id: (categoryId != "-") ? categoryId : undefined,
				category: category,
			}, function(data) {
				if(category.remove) {
					$.route(SettingsGroupsModule.link);
				} else if(categoryId == "-") {
					var i = masterHost.config.categories.length - 1;
					$.route(SettingsGroupsModule.link + "/" + i);
				} else {
					self.scope.reset();
				}
			}, function() {
				$.err({ title: "Failed to save category" });
			});
		});

	var btnStreams = $.element.button("Streams")
		.setDisabled(true)
		.on("click", function() {
			var category = masterHost.config.categories[categoryId];
			var modalData = { category: category.name, groups: [{ value: "", label: "No Group" }, { value: "", label: "---", disabled: true }] };
			$.forEach(category.groups, function(v) { modalData.groups.push({ value: v.name }) });
			$.modal().bindScope(SettingsGroupsModule.renderStreams, modalData);
		});

	if(categoryId != "-") {
		btnStreams.setDisabled(false);

		form.checkbox("Remove Category", "$remove")
			.setDanger()
			.on("change", function() {
				if(this.checked)
					btnApply.removeClass("submit").addClass("danger");
				else
					btnApply.removeClass("danger").addClass("submit");
			});
	}

	form.submit().addChild(btnApply, btnStreams);
};

SettingsGroupsModule.init = function() {
	var scope,
		categoryId = location.hash.slice(SettingsGroupsModule.link.length + 1);

	if(!categoryId) { $.route(SettingsGroupsModule.link + "/-"); return }

	if(categoryId == "-") {
		scope = { "name": "", "groups": [] };
	} else {
		var masterHost = app.hosts[location.host];
		categoryId = Number(categoryId);
		scope = $.clone(masterHost.config.categories[categoryId]);
		if(!scope) { $.route(SettingsGroupsModule.link); return }
		if(!scope.groups || !scope.groups.length) scope.groups = [];
	}
	scope.$categoryId = categoryId;

	$.body.bindScope(SettingsGroupsModule.render, scope);
};

app.modules.push(SettingsGroupsModule);
app.settings.push(SettingsGroupsModule);
})();
