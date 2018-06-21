(function() {
"use strict";

window.MainModule = {
	label: "Dashboard",
	link: "#/",
	order: 0,
	search: true,
	node: $.element(),
	dvbDevList: {},
	adapters: {},
	streams: {},
	menu: [
		{ label: "New Adapter", hide: (app.observer == true), click: function() {
			app.selectHost(AdaptersModule.link, "-")
		}},
		{ label: "New Stream", hide: (app.observer == true), click: function() {
			app.selectHost(StreamsModule.link, "-")
		}},
		{ label: "View", click: function() {
			$.modal().bindScope(renderModalView, $.cookie.getObject("streams-view") || {});
		}},
	],
};

var view = $.cookie.getObject("streams-view") || {};

var renderModalView = function() {
	var modal = this,
		form = new Form(modal.scope, modal),
		masterHost = app.hosts[location.host];

	var arrangeList = [
		{ value: "", label: "Default: None" },
		{ value: "-", label: "---", disabled: true },
		{ value: "$type", label: "Type" },
		{ value: "$host", label: "Servers" },
		{ value: "$dvb", label: "Adapter" },
		{ value: "-", label: "---", disabled: true },
	];

	$.forEach(masterHost.config.categories, function(c) { arrangeList.push({ value: c.name }) });
	form.choice("Arrange By", "arrange", arrangeList);
	form.checkbox("Hide disabled items", "hide_disabled");
	form.checkbox("Hide inactive items", "hide_inactive");
	form.checkbox("Hide items without error", "hide_wo_error");

	form.hr();

	var btnOk = $.element.button("Ok")
		.addClass("submit")
		.on("click", function() {
			modal.remove();
			view = modal.scope.serialize();
			$.cookie.setObject("streams-view", ($.isObjectEmpty(view)) ? undefined : view);

			$.forEach(MainModule.adapters, function(node) { node.remove() });
			$.forEach(MainModule.streams, function(node) { node.remove() });
			$.forEach(app.hosts, function(appHost, host) {
				$.forEach(appHost.config.dvb_tune, function(c) { renderAdapter(host, c) });
				$.forEach(appHost.config.make_stream, function(c) { renderStream(host, c) });
			});
		});

	form.submit().addChild(btnOk);
};

MainModule.run = function() {
	app.on("set-adapter", function(event) {
		var host = event.host,
			data = event.data,
			appHost = app.hosts[host];

		if(data.gid) appHost.config.gid = data.gid;

		var al = appHost.config.dvb_tune;
		if(data.adapter.remove) {
			var idx = (!al) ? -1 : al.indexOfID(data.adapter.id);
			if(!data.adapter.up) $.msg({ title: "Adapter \"{0}\" removed".format(al[idx].name) });
			MainModule.adapters[host + "/" + data.adapter.id].remove();
			al.splice(idx, 1);
			if(!al.length) delete(appHost.config.dvb_tune);
		} else {
			if(!al) appHost.config.dvb_tune = al = [];
			al.push(data.adapter);
			renderAdapter(host, data.adapter);
			$.msg({ title: "Adapter \"{0}\" saved".format(data.adapter.name) });
		}
	});

	// TODO: rename to event-adapter
	app.on("adapter_event", function(event) {
		var data = event.data,
			node = MainModule.adapters[event.host + "/" + data.dvb_id];
		if(!node) return;

		data.ber_value = (data.ber > 99) ? "99+" : data.ber;
		data.unc_value = (data.unc > 99) ? "99+" : data.unc;

		if(node.$config.raw_signal) {
			data.svalue = data.signal;
			data.qvalue = Number(data.snr / 10).format(1);
		} else {
			data.svalue = Math.floor((data.signal * 99) / 65535);
			data.qvalue = Math.floor((data.snr * 99) / 65535);
		}

		node.setStatus(data);
	});

	app.on("set-stream", function(event) {
		var host = event.host,
			appHost = app.hosts[host],
			data = event.data;

		if(data.gid) appHost.config.gid = data.gid;

		var sl = appHost.config.make_stream;
		if(data.stream.remove) {
			var idx = (!sl) ? -1 : sl.indexOfID(data.stream.id);
			if(!data.stream.up) $.msg({ title: "Stream \"{0}\" removed".format(sl[idx].name) });
			MainModule.streams[host + "/" + data.stream.id].remove();
			sl.splice(idx, 1);
			if(!sl.length) delete(appHost.config.make_stream);
		} else {
			if(!sl) appHost.config.make_stream = sl = [];
			sl.push(data.stream);
			renderStream(host, data.stream);
			$.msg({ title: "Stream \"{0}\" saved".format(data.stream.name) });
		}
	});

	// TODO: rename to event-stream
	app.on("stream_event", function(event) {
		var data = event.data,
			node = MainModule.streams[event.host + "/" + data.channel_id];
		if(!node) return;

		node.setStatus(data);
	});

	app.on("stream_image", function(event) {
		var host = event.host,
			data = event.data,
			node = MainModule.streams[host + "/" + data.channel_id];
		if(!node) return;

		var i = new Image();
		i.onload = function() { node.$image.setStyle("background-image", "url('" + i.src + "')").setStyle("display", "block") };
		i.src = data.src;
	});
};

MainModule.dvbLevel = function(t, r) {
	var x = $.element("div").addClass("dvb-status row monospace");
	var x1 = $.element("div").addClass("text").setText(t);

	if(r) {
		var x2 = $.element("div").addClass("text col-expand");

		x.addChild(x1, x2);
		if(t == "S") x.setLevel = function(v) { x2.setText("-" + v + " dBm") };
		else x.setLevel = function(v) { x2.setText(v + " dB") };
	} else {
		var x2 = $.element("div").addClass("progress signal-level col-expand");
		var b = $.element("div").addClass("progress-level");
		var o = $.element("div").addClass("progress-overlay");
		x2.addChild(b, o);
		var x3 = $.element("div").addClass("text");

		x.addChild(x1, x2, x3);
		x.setLevel = function(v) {
			v = v + "%"
			b.style.width = v;
			x3.setText((" " + v).slice(-3));
		};
	}

	x.setLevel(0);

	return x;
};

var cmpStack = function(a, b) {
	return (b.$name) ? a.$name.localeCompare(b.$name) : 1;
};

var cmpItems = function(a, b) {
	if(a.$type !== b.$type)
		return (a.$type === "adapter") ? -1 : 1;
	if(a.$config.enable === b.$config.enable)
		return a.$config.name.localeCompare(b.$config.name);
	return (a.$config.enable === true) ? -1 : 1;
};

var renderStack = function(name) {
	var node = $.forEach(MainModule.node.childNodes, function(i) {
		if(i.$name == name) return i;
	});

	if(!node) {
		node = $.element().addClass("card-stack");
		node.$name = name;
		if(name) node.addAttr("data-header", name);
		// if(view.filter) node.addClass("card-filter-error");
		if(view.hide_disabled) node.addClass("card-hide-disabled");
		if(view.hide_inactive) node.addClass("card-hide-inactive");
		if(view.hide_wo_error) node.addClass("card-hide-wo-error");

		MainModule.node.insertSorted(node, cmpStack);
	}

	return node;
};

var getItemGroup = function(item) {
	switch(view.arrange) {
		case undefined: return "";
		case "$type": return item.$type + "s";
		case "$host": return app.hosts[item.$host].name;
		case "$dvb": return (item.$type == "adapter") ? (item.$config.name) : $.forEach(item.$config.input, function(i) {
			i = i.match(/^dvb:\/\/([^#]*)/);
			if(i) {
				i = item.$host + "/" + i[1];
				i = MainModule.adapters[i];
				if(i) return i.$config.name;
			}
		}) || "";
		default: return (item.$config.groups || {})[view.arrange] || ""
	}
};

var renderAdapter = function(host, config) {
	var node = $.element("a")
		.addClass("card")
		.addAttr("href", "#/adapter/" + host + "/" + encodeURIComponent(config.id));

	node.$type = "adapter";
	node.$host = host;
	node.$config = config;
	node.$lock = 0;

	node.addClass("card-" + config.enable.toString() + "-" + node.$lock);

	node.addChild($.element("div")
		.addClass("card-name")
		.setText(config.name)
		.addAttr("title", config.name));

	node.addChild($.element("select")
		.addClass("card-action button icon icon-more small")
		.addChild(
			$.element("option"),
			$.element("option")
				.setValue("-3")
				.setText("Restart"),
			$.element("option")
				.setValue("-1")
				.setText((config.enable == false) ? "Enable" : "Disable"),
			$.element("option")
				.setValue("-2")
				.setText("Remove"))
		.on("change", function() {
			var appHost = app.hosts[host];
			var restartAdapter = function() {
				appHost.request({
					cmd: "restart-adapter",
					id: config.id
				}, $.nop, function() {
					$.err({ title: "Failed to restart adapter" });
				});
			};
			var setAdapter = function(a) {
				appHost.request({
					cmd: "set-adapter",
					id: config.id,
					adapter: a
				}, $.nop, function() {
					$.err({ title: "Failed to save adapter" });
				});
			};
			switch(this.value) {
				case "-3": {
					restartAdapter();
					break;
				}
				case "-2": {
					if(confirm("Remove adapter \"{0}\" and all related streams?".format(config.name))) setAdapter({ remove: true });
					break;
				}
				case "-1": {
					var a = $.clone(config);
					a.enable = !a.enable;
					setAdapter(a);
					break;
				}
			}
			this.value = "";
		})
		.on("click", function(event) {
			event.preventDefault();
		}));

	var sS = MainModule.dvbLevel("S", config.raw_signal).addClass("card-status");
	var sQ = MainModule.dvbLevel("Q", config.raw_signal).addClass("card-status");
	node.addChild(sS, sQ);

	var eT = $.element("span").addClass("text");
	node.addChild($.element("div")
		.addClass("card-status monospace")
		.addChild(eT));

	node.setStatus = function(s) {
		sS.setLevel(s.svalue);
		sQ.setLevel(s.qvalue);
		eT.setText("ber:" + s.ber_value + " unc:" + s.unc_value);

		var l = (s.status & 0x10) ? 2 : 0;
		if(l != node.$lock) {
			node.removeClass("card-true-" + node.$lock);
			node.$lock = l;
			node.addClass("card-true-" + node.$lock);
		}
	};
	node.setStatus({ lock: false, svalue: 0, qvalue: 0, ber_value: 0, unc_value: 0 })

	node.$stack = renderStack(getItemGroup(node));
	node.$stack.insertSorted(node, cmpItems);

	node.remove = function() {
		var stack = this.$stack;
		delete(this.$stack);
		Element.prototype.remove.call(this);
		delete(MainModule.adapters[host + "/" + config.id]);
		if(!stack.childNodes.length) stack.remove();
	};
	MainModule.adapters[host + "/" + config.id] = node;
};

var renderStream = function(host, config) {
	var node = $.element("a")
		.addClass("card", "stream-" + (config.type || "unknown"))
		.addAttr("href", "#/stream/" + host + "/" + encodeURIComponent(config.id));

	var onairDef = 0;
	if(config.enable) {
		if(config.type == "mpts") {
			onairDef = 2;
		} else if(config.http_keep_active != -1) {
			node.$activeInputId = -1;
			onairDef = 3;
			$.forEach(config.output, function(o) {
				if(!o.match(/^http:\/\//)) {
					onairDef = 0;
					return true;
				}
			});
		}
	}
	node.$onair = onairDef;
	node.addClass("card-" + config.enable.toString() + "-" + node.$onair);

	node.$type = "stream";
	node.$host = host;
	node.$config = config;
	node.$input = [];
	node.$total = null;

	node.addChild($.element("div")
		.addClass("card-name")
		.setText(config.name)
		.addAttr("title", config.name || "-"));

	node.addChild($.element.select([
			{ value: "" },
			/* {
				hide: (!config.enable) || (config.backup_type != "passive" && config.backup_type != "disable"),
				group: "Switch Input",
				items: [],
			}, */
			{ value: 3, label: "Toggle Input", hide: (!config.enable || (config.backup_type != "passive" && config.backup_type != "disable")) },
			{ value: 1, label: (!config.enable) ? "Enable" : "Disable" },
			{ value: 2, label: "Remove" }
		])
		.removeClass("input")
		.addClass("card-action button icon icon-more small")
		.on("change", function() {
			var appHost = app.hosts[host], req = { id: config.id };
			switch(this.value) {
				case "1": {
					req.cmd = "set-stream";
					req.stream = $.clone(config);
					req.stream.enable = !config.enable;
					break;
				}
				case "2": {
					if(!confirm("Remove stream \"" + config.name + "\"?")) {
						this.value = "";
						return;
					}
					req.cmd = "set-stream";
					req.stream = { remove: true };
					break;
				}
				case "3": {
					req.cmd = "set-stream-input";
					break;
				}
			}

			appHost.request(req, $.nop, function() {
				$.err({ title: "Failed to save stream" });
			});
			this.value = "";
		})
		.on("click", function(event) {
			event.preventDefault();
		}));

	node.$image = $.element("div").addClass("card-image");
	node.addChild(node.$image);

	$.forEach(config.input, function(v) {
		var inode = $.element("span")
			.addClass("text")
			.setText("Inactive");
		var iwrap = $.element("div")
			.addClass("card-status")
			.addAttr("title", v)
			.addChild(inode);
		node.addChild(iwrap);
		node.$input.push(inode);
	});

	if(config.type == "mpts") {
		var tc = $.element("span")
			.addClass("text")
			.setText("Inactive");
		var tr = $.element("div")
			.addClass("card-status card-footer")
			.addChild(tc);
		node.addChild(tr);
		node.$total = tc;

		var sm = {};
		$.forEach(config.sdt, function(v) {
			sm[v.pnr] = v.name;
		});

		$.forEach(config.input, function(v, i) {
			var ac = parseUrl(v);
			var pnr = ac.set_pnr || ac.pnr || 0;
			if(pnr != 0) {
				var n = sm[pnr];
				if(n) node.$input[i].addAttr("data-name", "[" + n + "]");
			}
		});
	}

	node.$stack = renderStack(getItemGroup(node));
	node.$stack.insertSorted(node, cmpItems);

	node.setStatus = function(s) {
		// s.input_id first index is 1
		var c = "text",
			t = "" + s.bitrate + "Kbit/s",
			inode = (!!s.input_id) ? node.$input[s.input_id - 1] : node.$total;

		if(s.onair) {
			c += " onair";
		} else if(s.scrambled) {
			t += " Scrambled";
			c += " scrambled";
		} else {
			if(s.pes_error > 0) t += " PES:" + ((s.pes_error > 99) ? "99+" : s.pes_error);
			c += " error";
		}

		if(s.cc_error > 0) {
			t += " CC:" + ((s.cc_error > 99) ? "99+" : s.cc_error);
			c += " cc";
		}

		inode.setText(t);
		if(inode.className != c) inode.className = c;

		if(onairDef == 2) return; /* mpts */
		if(inode.$onair == s.onair) return;
		inode.$onair = s.onair;

		var onair = onairDef;

		var inodeReset = function(i) {
			var x = node.$input[i];
			if(x.$onair != undefined) {
				x.className = "text";
				x.setText("Inactive");
				delete(x.$onair);
			}
		}

		if(config.backup_type == "passive" || config.backup_type == "disable") {
			if(s.onair) {
				onair = 2;
			}

			for(var i = 0, l = s.input_id - 1; i < l; i++) inodeReset(i);
			for(var i = s.input_id, l = node.$input.length; i < l; i++) inodeReset(i);
		} else {
			if(s.onair) {
				if(s.input_id == 1) onair = 2;
				else if(onair == 0) onair = 1;

				for(var i = s.input_id, l = node.$input.length; i < l; i++) inodeReset(i);
			}
		}

		if(node.$onair != onair) {
			node.removeClass("card-true-" + node.$onair);
			node.$onair = onair;
			node.addClass("card-true-" + node.$onair);
		}
	};

	node.remove = function() {
		var stack = this.$stack;
		delete(this.$stack);
		Element.prototype.remove.call(this);
		delete(MainModule.streams[host + "/" + config.id]);
		if(!stack.childNodes.length) stack.remove();
	};
	MainModule.streams[host + "/" + config.id] = node;
};

var initDvbDevList = function(hostId) {
	var appHost = app.hosts[hostId],
		gAvail = { group: "Available", items: [] },
		gError = { group: "Error", items: [] },
		dvbDevList = [{ value: "", label: "" }, gAvail, gError],
		dl = appHost.sysinfo.dvb_list;

	if(dl) dl.sort(function(a, b) {
		if(a.error === b.error) {
			if(a.busy === b.busy) {
				if(a.adapter === b.adapter) {
					if(a.device === b.device) {
						return 0;
					}
					return (a.device < b.device) ? -1 : 1;
				}
				return (a.adapter < b.adapter) ? -1 : 1;
			}
			return (a.busy != true) ? -1 : 1;
		}
		return (a.error == undefined) ? -1 : 1;
	});

	$.forEach(dl, function(a, i) {
		a.value = String(i);
		var d = a.adapter + "." + a.device + " : ";
		if(a.error) {
			a.label = d + a.error;
			gError.items.push(a);
		} else {
			a.label = d + a.frontend;
			gAvail.items.push(a);
		}
	});

	return dvbDevList;
};

MainModule.addHost = function(host) {
	var appHost = app.hosts[host];
	if(!appHost.config)
		return;

	MainModule.dvbDevList[host] = initDvbDevList(host);

	$.forEach(appHost.config.dvb_tune, function(c) {
		renderAdapter(host, c);
	});

	$.forEach(appHost.config.make_stream, function(c) {
		renderStream(host, c);
	});
};

MainModule.removeHost = function(host) {
	$.forEach(MainModule.adapters, function(node, i) {
		if(node.$host == host) node.remove();
	});

	$.forEach(MainModule.streams, function(node, i) {
		if(node.$host == host) node.remove();
	});

	delete(MainModule.dvbDevList[host]);
};

var renderCards = function() {
	var self = this,
		object = app.renderInit();

	object.addChild(MainModule.node);

	app.search = function(value) {
		value = value.toLowerCase();
		$.forEach(MainModule.node.childNodes, function(stack) {
			stack.removeClass("hide");
			var sh = true;
			$.forEach(stack.childNodes, function(item) {
				if(!item.removeClass) console.log(item);
				item.removeClass("hide");
				if(!!value && item.$config.name.toLowerCase().indexOf(value) == -1) item.addClass("hide");
				else sh = false;
			});
			if(sh) stack.addClass("hide");
		});
	};

	var info = app.hosts[location.host].sysinfo;
	var text = "Astra " + info.version + " [" + info.commit + "]";
	if($.isObject(info.license)) {
		switch(info.license.type) {
			case 1:
			case 2:
				text += " Expiration date: " + (new Date(info.license.expire * 1000)).toISOString().substring(0, 10);
				break;
			case 4:
				text += " Lifetime License";
				break;
			default:
				break;
		}
	}
	$.body.addChild($.element()
		.addClass("version monospace")
		.setText(text));

	if(app.hosts[location.host].config.users[app.login].firstrun) {
		var x = $.msg({
			text: "For security reasons, please, change default password!",
			delay: -1,
		});
		x.addChild($.element()
			.addClass("row")
			.addChild($.element.button("Change Password")
				.addClass("col-4")
				.on("click", function(event) {
					x.remove();
					SettingsUsersModule.openConfig(app.login);
				})));
	}
};

MainModule.init = function() {
	$.body.bindScope(renderCards, {});
};

app.modules.push(MainModule);
app.menu.push(MainModule);
})();
