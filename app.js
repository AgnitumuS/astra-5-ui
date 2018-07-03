app = {
	scope: null,
	hosts: {},
	modules: [],
	menu: [],
	settings: [],

	themes: [
		{ value: "", label: "Default: Light" },
		{ value: "dark", label: "Dark" },
	],
};

monthMap = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];

codepages = [
	{ value: "", label: "Default: Latin (ISO 6937)" },
	{ value: "1", label: "West European (ISO 8859-1)" },
	{ value: "2", label: "East European  (ISO 8859-2)" },
	{ value: "3", label: "South European (ISO 8859-3)" },
	{ value: "4", label: "North European (ISO 8859-4)" },
	{ value: "5", label: "Cyrillic (ISO 8859-5)" },
	{ value: "6", label: "Arabic (ISO 8859-6)" },
	{ value: "7", label: "Greek (ISO 8859-7)" },
	{ value: "8", label: "Hebrew (ISO 8859-8)" },
	{ value: "9", label: "Turkish (ISO 8859-9)" },
	{ value: "10", label: "Nordic (ISO 8859-10)" },
	{ value: "11", label: "Thai (ISO 8859-11)" },
	{ value: "13", label: "Baltic (ISO 8859-13)" },
	{ value: "15", label: "West European (ISO 8859-15)" },
	{ value: "21", label: "UTF-8" },
];

dvbPolarization = [
	{ value: "" },
	{ value: "V", label: "Vertical" },
	{ value: "H", label: "Horizontal" },
	{ value: "-", label: "----", disabled: true },
	{ value: "R", label: "Right" },
	{ value: "L", label: "Left" },
];

dvbFec = [
	{ value: "", label: "Default: Auto" },
	{ value: "NONE" },
	{ value: "1/2" },
	{ value: "2/3" },
	{ value: "3/4" },
	{ value: "4/5" },
	{ value: "5/6" },
	{ value: "6/7" },
	{ value: "7/8" },
	{ value: "8/9" },
	{ value: "3/5" },
	{ value: "9/10" },
];

dvbsModulation = [
	{ value: "", label: "Default: not set" },
	{ value: "QPSK" },
	{ value: "PSK8", label: "8PSK" },
	{ value: "QAM16", label: "16-QAM" },
];

dvbcModulation = [
	{ value: "", label: "Default: not set" },
	{ value: "QAM16", label: "16-QAM" },
	{ value: "QAM32", label: "32-QAM" },
	{ value: "QAM64", label: "64-QAM" },
	{ value: "QAM128", label: "128-QAM" },
	{ value: "QAM256", label: "256-QAM" },
];

validateId = function(value) {
	if(value == undefined || value == "") return true;
	return (/^[^\\\/&%\.+]*$/).test(value);
};

validatePort = function(value) {
	if(value == undefined || value == "") return true;
	value = Number(value);
	return (!isNaN(value) && value > 0 && value <= 0xFFFF);
};

validatePid = function(value) {
	if(value == undefined || value == "") return true;
	value = Number(value);
	return (!isNaN(value) && value > 20 && value <= 0x1FFF);
};

validatePnr = function(value) {
	if(value == undefined || value == "") return true;
	value = Number(value);
	return (!isNaN(value) && value > 0 && value <= 0xFFFF);
};

validateBiss = function(value) {
	if(value == undefined || value == "") return true;
	return (/^[0-9A-Fa-f]{16}$/).test(value);
};

validateUrl = function(value) {
	if(value == undefined || value == "") return true;
	return (!!parseUrl(value));
};

validateHex = function(value) {
	if(value == undefined || value == "") return true;
	return (value.length % 2) == 0 && (/^[0-9A-Fa-f]*$/).test(value);
};

Array.prototype.indexOfID = function(id) {
	for(var i = 0; i < this.length; ++i) {
		if(this[i].id == id) return i;
	}
	return -1;
};

Array.prototype.uniq = function() {
	var i = 1
	while(i < this.length) {
		if(this[i - 1] == this[i]) this.splice(i, 1);
		else ++i;
	}
};

Number.prototype.format = function(c, d, t) {
	var n = this,
		c = isNaN(c = Math.abs(c)) ? 2 : c,
		d = d == undefined ? " " : d,
		t = t == undefined ? "." : t,
		s = n < 0 ? "-" : "",
		i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
		j = (j = i.length) > 3 ? j % 3 : 0;

	return s
		+ (j ? i.substr(0, j) + d : "")
		+ i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + d)
		+ (c ? t + Math.abs(n - i).toFixed(c).slice(2) : "");
};

Number.prototype.toHex = function(p,u) {
	var n = this,
		p = p == undefined ? 2 : p,
		h = n.toString(16);
	if(u) h = h.toUpperCase();
	while(h.length < p) h = "0" + h;
	return "0x" + h;
};

function ip2num(x) {
	if(!x) return 0;
	x = x.split(".");
	while(x.length != 4) x.splice(-1, 0, 0);
	return ((((((+x[0])*256)+(+x[1]))*256)+(+x[2]))*256)+(+x[3]);
}

/* URL */

parseUrlFormat = {};

parseUrlFormat["udp"] = function(r) {
	var b = r.addr.indexOf("/");
	if(b != -1) r.addr = r.addr.substring(0, b);
	b = r.addr.indexOf("@");
	if(b != -1) {
		if(b > 0) r.localaddr = r.addr.substring(0, b);
		r.addr = r.addr.substring(b + 1);
	}
	b = r.addr.indexOf(":");
	if(b != -1) {
		r.port = Number(r.addr.substring(b + 1));
		if(isNaN(r.port) || r.port < 1 || r.port > 65535) return false;
		r.addr = r.addr.substring(0, b);
	} else {
		r.port = 1234;
	}
	if(!r.addr.length) return false;
	var a = r.addr.split(".");
	if(a.length > 4) return false;
	while(a.length) {
		var o = Number(a.shift());
		if(isNaN(o) || o < 0 || o > 255) return false;
	}
	return true;
};
parseUrlFormat["rtp"] = parseUrlFormat["udp"];

parseUrlFormat["http"] = function(r) {
	var b = r.addr.indexOf("/");
	if(b != -1) {
		r.path = r.addr.substring(b);
		r.addr = r.addr.substring(0, b);
	} else {
		r.path = "/";
	}
	b = r.addr.indexOf("@");
	if(b != -1) {
		if(b > 0) {
			var a = r.addr.substring(0, b).split(":");
			if(a.length == 2) {
				r.login = a[0];
				r.password = a[1];
			}
		}
		r.addr = r.addr.substring(b + 1);
	}
	b = r.addr.indexOf(":");
	if(b != -1) {
		r.port = Number(r.addr.substring(b + 1));
		if(isNaN(r.port) || r.port < 1 || r.port > 65535) return false;
		r.host = r.addr.substring(0, b);
	} else {
		switch(r.format) {
			case "http": r.port = 80; break;
			case "https": r.port = 443; break;
			case "rtsp": r.port = 554; break;
			default: r.port = 80; break;
		}
		r.host = r.addr;
	}
	delete(r.addr);
	if(!r.host.length) return false;
	return true;
};
parseUrlFormat["https"] = parseUrlFormat["http"];
parseUrlFormat["rtsp"] = parseUrlFormat["http"];
parseUrlFormat["np"] = parseUrlFormat["http"];

parseUrlFormat["file"] = function(r) {
	r.filename = r.addr;
	delete(r.addr);
	return true;
};

function parseUrl(url) {
	if(!url) return null;
	var b = url.indexOf("://");
	if(b == -1 || url.length <= b + 3) return null;
	var r = {};
	r.format = url.substring(0, b);
	url = url.substring(b + 3);
	b = url.indexOf("#");
	if(b == -1) {
		r.addr = url;
	} else {
		r.addr = url.substring(0, b);
		url = url.substring(b + 1).split("&");
		for(var i = 0; i < url.length; ++i) {
			var o = url[i].split("="),
				k = o[0],
				v = (o.length == 2) ? o[1] : true;
			r[k] = v;
		}
	}

	if(parseUrlFormat.hasOwnProperty(r.format) && !parseUrlFormat[r.format](r)) return null;
	return r
}

makeUrlFormat = {};

makeUrlFormat["udp"] = function(d) {
	if(d.localaddr) { d.addr = d.localaddr + "@" + d.addr; delete(d.localaddr) }
	if(d.port) { d.addr += ":" + d.port; delete(d.port) }
};
makeUrlFormat["rtp"] = makeUrlFormat["udp"];

makeUrlFormat["http"] = function(d) {
	d.addr = "";
	if(d.login) {
		d.addr += d.login;
		delete(d.login);
		if(d.password) {
			d.addr += ":" + d.password;
			delete(d.password);
		}
		d.addr += "@";
	}
	if(d.host) { d.addr += (d.host != "0.0.0.0") ? d.host : "0"; delete(d.host) }
	if(d.port) { d.addr += ":" + d.port; delete(d.port) }
	if(d.path) { d.addr += d.path; delete(d.path) }
};
makeUrlFormat["https"] = makeUrlFormat["http"];
makeUrlFormat["rtsp"] = makeUrlFormat["http"];
makeUrlFormat["np"] = makeUrlFormat["http"];

makeUrlFormat["file"] = function(d) {
	d.addr = d.filename;
	delete(d.filename);
};

function makeUrl(data) {
	var d = $.clone(data);
	if(makeUrlFormat.hasOwnProperty(d.format)) makeUrlFormat[d.format](d);
	var r = d.format + "://" + (d.addr || "")
	delete(d.format);
	delete(d.addr);
	var o = [];
	for(k in d) {
		var v = d[k];
		if(!v) {
			continue;
		} else if(v === true) {
			o.push(k);
		} else {
			o.push(k + "=" + v);
		}
	}
	if(o.length) r += "#" + o.join("&");
	return r
};

/* MENU */

app.renderInit = function() {
	var menu = $.element().addClass("main-menu fixed");

	var renderMenu = function(list) {
		$.forEach(list, function(item) {
			menu.addChild($.element.a(item.link || "#", item.label)
				.addClass(item.hide ? "hide" : null)
				.on("click", function(event) {
					if(item.click) {
						event.preventDefault();
						item.click(event);
					}
				}));
		});
	};

	var renderSearch = function() {
		var s = (!app.module.search) ? $.element() : $.element.input("Search")
			.addAttr("autocomplete", "off")
			.dataBind("search")
			.on("input", function() {
				app.search(this.value)
			})
			.on("keydown", function(event) {
				if(event.keyCode == 27) {
					this.value = "";
					app.search("");
				}
			});

		s.addClass("search");
		menu.addChild(s);
	};

	var renderHelp = function() {
		menu.addChild($.element.a("#", "Help")
			.on("click", function(event) {
				event.preventDefault();
				var modal = $.modal();
				var doc = $.element();
				modal.addChild(
					doc,
					$.element()
						.addClass("text-center")
						.addChild($.element.button("Ok")
							.on("click", function(event) {
								event.preventDefault();
								modal.remove();
							})));
			}));
	};

	renderMenu(app.menu);
	renderSearch();
	renderMenu(app.module.menu);
	$.body.addChild(menu);

	var content = $.element().addClass("main-content");
	$.body.addChild(content);

	return content;
};

/* FORM */

function Form(scope, parent) {
	var form = $.element("form")
		.addClass("form")
		.addAttr("novalidate")
		.addAttr("autocomplete", "off")
		.on("keydown", function(event) {
			if(event.which == 13) {
				switch(event.target.tagName) {
					case "TEXTAREA":
					case "BUTTON":
						break;
					default:
						event.preventDefault();
						break;
				}
			}
		});

	this.node = form;
	this.scope = scope;
	if(parent) parent.addChild(form);

	this.loading = function() {
		var x = $.element().addClass("loading");
		for(var i = 0; i < 4; ++i) x.addChild($.element().addClass("bullet"));
		form.addChild(x);
		return x
	};

	this.group = function() {
		var g = $.element()
			.addClass("form-group");
		form.addChild(g);
		return g
	};

	this.header = function(title, action, click) {
		var g = $.element()
			.addClass("form-group-header")
			.addChild(title || "");
		if(action && click) g.addChild($.element.a("#", action)
			.addClass("form-group-action")
			.on("click", function(event) {
				event.preventDefault();
				click();
			}));
		form.addChild(g);

		return g
	};

	this.hr = function() {
		var x = $.element("hr");
		form.addChild(x);

		return x
	};

	this.tab = function(tabId, options) {
		var g = this.group(),
			c = scope.get(tabId),
			l = $.element().addClass("tab");
		if(c == undefined) c = options[0].id;
		$.forEach(options, function(v) {
			l.addChild((c == v.id) ?
				$.element("span")
					.setText(v.label) :
				$.element.a(v.link || "#", v.label)
					.on("click", function(event) {
						event.preventDefault();
						scope.set(tabId, v.id);
						scope.reset();
					}));
		});
		g.addChild(l);

		return l
	};

	this.checkbox = function(title, bind) {
		var g = this.group();
		var x = $.element.checkbox(title || "");
		x.checkbox
			.dataBind(bind)
			.addAttr("data-false", "undefined");

		x.checkbox.setDisabled = function(value) {
			var f = (!!value) ? "addAttr" : "removeAttr";
			var a = "disabled";
			x.checkbox[f](a);
			x[f](a);
			return x.checkbox;
		};

		x.checkbox.setDanger = function() {
			x.addClass("danger");
			return x.checkbox;
		};

		x.checkbox.awaiting = function(value) {
			x.checkbox.setDisabled(value);
			var f = (!!value) ? "addClass" : "removeClass";
			x[f]("awaiting");
		};

		g.addChild(x);

		return x.checkbox;
	};

	this.input = function(title, bind, placeholder) {
		var x = $.element.input().dataBind(bind);
		if(placeholder) x.addAttr("placeholder", placeholder);

		var g = this.group(title)
			.addAttr("data-label", title)
			.addChild(x);

		x.on("mousewheel", function() { this.blur() });

		x.setRequired = function() {
			x.addAttr("required");
			x.addValidator(function(value) { return (value != undefined && value != "") });
			return x;
		};

		x.setError = function(value) {
			if(value) {
				g.addClass("error");
				x.addClass("error");
			} else {
				g.removeClass("error");
				x.removeClass("error");
			}
		};

		x.addButton = function(button) {
			if(!x.buttonWrap) {
				x.buttonWrap = $.element()
					.addClass("button-wrap");
				g
					.addClass("io-wizard")
					.addChild(x.buttonWrap);
			}
			x.buttonWrap.addChild(button);
			return x;
		};

		return x
	};

	this.password = function(title, bind, placeholder) {
		var x = this.input(title, "$" + bind, placeholder);
		var h = function(p) { p = p || ""; return (new Array(p.length + 1)).join("*") };
		scope.set("$" + bind, h(scope.get(bind)));
		x
			.on("focus", function() {
				scope.set("$" + bind, scope.get(bind) || "");
			})
			.on("blur", function() {
				scope.set(bind, scope.get("$" + bind));
				scope.set("$" + bind, h(scope.get(bind)));
			});

		return x;
	};

	this.number = function(title, bind, placeholder) {
		var x = this.input(title, bind, placeholder);
		x.addAttr("type", "number");
		return x
	};

	this.choice = function(title, bind, options) {
		var x = $.element.select(options).dataBind(bind);

		var g = this.group(title)
			.addAttr("data-label", title)
			.addChild(x);

		x.setRequired = function() {
			x.addAttr("required");
			x.addValidator(function(value) { return (value != undefined && value != "") });
			return x
		};

		x.setError = function(value) {
			if(value) {
				g.addClass("error");
				x.addClass("error");
			} else {
				g.removeClass("error");
				x.removeClass("error");
			}
		};

		return x
	};

	this.hidden = function(bind) {
		var x = $.element("input")
			.addAttr("type", "hidden")
			.dataBind(bind);
		form.addChild(x);
		return x
	};

	this.submit = function(btn) {
		var x = $.element().addClass("form-submit");
		form.addChild(x);
		return x
	};
}

/* HOST */

function Host(hostConfig, callback) {
	var self = this,
		host = hostConfig.host,
		token = null;

	if(hostConfig.port) host += ":" + hostConfig.port;
	if(hostConfig.user) {
		token = hostConfig.user;
		if(hostConfig.pass) token += ":" + hostConfig.pass;
	}

	self.name = hostConfig.name || host;
	self.sysinfo = null;
	self.config = null;

	self.makeUid = function(type) {
		var arr = self.config[type];
		do {
			self.config.gid = self.config.gid + 1;
			var r = (self.config.gid).toString(36);
			if(!arr || arr.indexOfID(r) == -1) return r;
		} while(true);
	};

/* WebSocket */

	var ws, wsError;
	var connect = function() {
		ws = new WebSocket("ws://" + host + "/control/event/");
		ws.onopen = function() {
			ws.send(JSON.stringify({ scope: "auth", auth: token }))
		};

		ws.onclose = function() {
			app.removeHost(hostConfig);
			if(host == location.host) $.body.scope.destroy();

			wsError = $.err({
				title: self.name,
				text:  "Connection closed. Retrying in {0}...",
				delay: 4,
			})
				.on("remove", function() {
					app.addHost(hostConfig);
				});
		};

		ws.onmessage = function(event) {
			var data;
			try {
				data = JSON.parse(event.data);
				if(!data.scope) throw "event scope not defined";
			} catch(e) {
				console.error(e); return;
			}
			app.emit(data.scope, {
				host: host,
				data: data,
			});
		};
	};

/* Control API */

	var headers = { "Content-Type": "application/json" };

	self.request = function(data, onLoad, onError) {
		$.http({
			method: "POST",
			url: "http://" + host + "/control/",
			data: JSON.stringify(data),
			headers: headers,
		}, function(response) {
			if(onLoad) {
				response.data = JSON.parse(response.text);
				onLoad(response);
			}
		}, function(response) {
			if(onError) {
				onError(response);
			}
		});
	};

	self.restart = function() {
		self.request({ cmd: "restart" });
	};

	self.upload = function(fn) {
		self.request({
			cmd: "upload",
			config: self.config
		}, function() {
			if(fn) fn(true);
			self.restart();
		}, function() {
			$.err({
				title: self.name,
				text: "Upload failed"
			});
			if(fn) fn(false);
		})
	};

	var authForm = null;
	var authFormInit = function() {
		if(authForm) {
			authForm.setDisabled(false);
			return;
		}

		var u = $.element.input("Login");
		var p = $.element.input("Password", "password");
		var r = $.element.checkbox("Remember me");
		var s = $.element.button("Sign In")
			.addAttr("type", "submit")
			.addClass("submit");

		authForm = $.element("form")
			.addClass("auth")
			.addChild(u, p, r, s)
			.on("submit", function(event) {
				event.preventDefault();
				authForm.setDisabled(true);
				app.login = u.value;
				token = u.value + ":" + p.value;
				$.cookie.set("auth", (r.checkbox.checked) ? token : undefined);
				p.value = "";
				load();
			});
		authForm.setDisabled = function(value) { s.setDisabled(value) };

		$.body.addChild(authForm);
		u.focus();
	};

	var loadError = null;
	var load = function() {
		if(token) headers["Authorization"] = "Basic " + $.base64Encode(token);

		if(loadError) {
			loadError.remove();
			loadError = null;
		}

		self.request({
			cmd: "status"
		}, function(response) {
			var data = response.data;

			if(authForm) {
				authForm.remove();
				authForm = null;
			}

			if(data.if_list) {
				data.if_list.sort();
				var ifList = [];
				var ipList = data.ip_list || {};
				$.forEach(data.if_list, function(i) {
					var n = { value: i, label: i };
					if(data.ip_list && data.ip_list[i]) {
						n.ip = data.ip_list[i];
						n.label += ": " + n.ip;
					}
					ifList.push(n);
				});
				data.if_list = ifList;
			}

			if(data.observer) {
				SettingsModule.hide = true;
				app.observer = true;
			}

			self.sysinfo = data;

			self.request({
				cmd: "load"
			}, function(response) {
				var data = response.data;
				self.config = $.isObject(data) ? data : {};
				if(!self.config.gid) self.config.gid = 466560;

				connect();
				callback.call(self);
			}, function() {
				loadError = $.err({
					title: "Configuration file has wrong format",
					delay: -1
				});
			});
		}, function(response) {
			if(response.status == 403) {
				var text = "Authentication failed.";
				if(location.host == host) {
					authFormInit();
					if(!token) return;
				} else {
					var idx = app.hosts[location.host].config.servers.indexOf(hostConfig);
					text += "<br/><a href=\"#/settings-servers/" + idx + "\">Check streamer configuration</a>";
				}
				loadError = $.err({
					title: self.name,
					text: text,
					delay: -1
				});
			} else {
				loadError = $.err({
					title: self.name,
					text:  "Connection failed. Retrying in {0}...",
					delay: 10,
				})
					.on("remove", function() {
						loadError = null;
						load();
					});
			}
		});
	};

	load();

	self.destroy = function() {
		if(loadError) {
			loadError.remove();
			loadError = null;
		}
		if(wsError) {
			wsError.remove();
			wsError = null;
		}
		if(ws) {
			ws.onclose = null;
			if(ws.readyState == WebSocket.OPEN) ws.close();
			ws = null;
		}
	};
}

app.addHost = function(config, fn) {
	var host = config.host;
	if(config.port) host += ":" + config.port;

	app.hosts[host] = new Host(config, function() {
		if(fn) fn.call(this);
		$.forEach(app.modules, function(m) {
			if(m.addHost) m.addHost(host);
		});
	});
};

app.removeHost = function(config) {
	var host = config.host;
	if(config.port) host += ":" + config.port;

	if(app.hosts[host]) {
		$.forEach(app.modules, function(m) {
			if(m.removeHost) m.removeHost(host);
		});

		app.hosts[host].destroy();
		delete(app.hosts[host]);
	}
};

app.selectHost = function(link, id) {
	id = (id) ? ("/" + id) : "";
	if(Object.keys(app.hosts).length == 1) {
		$.route(link + "/" + location.host + id);
		return;
	}

	var modal = $.modal().addClass("main-menu");
	$.forEach(app.hosts, function(appHost, hostId) {
		if(appHost.config) {
			modal.addChild($.element.a(link + "/" + hostId + id, appHost.name)
				.on("click", function() { modal.remove() }));
		}
	});
	modal.addChild($.element("hr"));
	modal.addChild($.element.a("#", "Cancel")
		.addClass("text-center")
		.on("click", function(event) {
			event.preventDefault();
			modal.remove();
		}));
};

/* SCAN */

function Scan(hostId, config, fn) {
	var scanId = null,
		scanTimer = null,
		tsid = -1,
		scanData = [],
		psiCache = [],
		appHost = app.hosts[hostId],
		changed = false;

	var getScanItem = function(pnr) {
		var i,x;
		for(i = 0; i < scanData.length; ++i) {
			x = scanData[i];
			if(x.pnr == pnr) return x;
		}
		x = { pnr: pnr, name: "Unknown" };
		scanData.insertSorted(x, function(a,b) {
			return a.pnr - b.pnr;
		});
		return x;
	};

	var scanCheckPsi = function(psi) {
		if(tsid == -1 && psi.psi != "pat") {
			psiCache.push(psi);
		} else if(scanCheckPsi[psi.psi] != undefined) {
			scanCheckPsi[psi.psi](psi);
		}
	};

	scanCheckPsi.pat = function(pat) {
		tsid = pat.tsid;

		$.forEach(psiCache, scanCheckPsi);
		psiCache = [];
		changed = true;
	};

	scanCheckPsi.nit = function(nit) {
		var data = getScanItem(0);

		$.forEach(nit.descriptors, function(d) {
			if(d.type_id == 64) data.name = d.network_name;
		});
		$.forEach(nit.streams, function(s) {
			if(s.tsid != tsid) return;
			$.forEach(s.descriptors, function(d) {
				switch(d.type_id) {
					case 67: {
						data.system = d;
						data.name = ((d.s2) ? "DVB-S2" : "DVB-S") + " : " + data.name;
						break;
					}
					case 68: {
						data.system = d;
						data.name = "DVB-C : " + data.name;
						break;
					}
					case 90: {
						data.system = d;
						data.name = "DVB-T : " + data.name;
						break;
					}
				}
			});
		});
		changed = true;
	};

	scanCheckPsi.pmt = function(pmt) {
		var data = getScanItem(pmt.pnr);
		data.streams = [];
		data.cas = [];
		$.forEach(pmt.descriptors, function(d) {
			if(d.type_id == 9) data.cas.push(d.caid.toHex(4));
		});
		$.forEach(pmt.streams, function(x) {
			if(["VIDEO","AUDIO"].indexOf(x.type_name) == -1) return;
			var r = x.type_name.charAt(0) + "PID:" + x.pid;
			var e = null;
			var l = null;
			if(x.type_id == 0x1B) e = "MPEG-4";
			$.forEach(x.descriptors, function(d) {
				switch(d.type_id) {
					case 0x09: data.cas.push(d.caid.toHex(4)); break;
					case 0x0A: l = d.lang; break;
					case 0x6A: e = "AC-3"; break;
				}
			});
			if(e) r = r + " " + e;
			if(l) r = r + " " + l;
			data.streams.push(r);
		});
		data.cas.sort();
		data.cas.uniq();
		changed = true;
	};

	scanCheckPsi.sdt = function(sdt) {
		$.forEach(sdt.services, function(x) {
			var data = getScanItem(x.sid);
			$.forEach(x.descriptors, function(d) {
				if(d.type_id == 72) {
					data.name = d.service_name || "Unknown";
					data.provider = d.service_provider;
				}
			});
		});
		changed = true;
	};

	var scanCheck = function() {
		appHost.request({
			cmd: "scan-check",
			id: scanId
		}, function(response) {
			var data = response.data;
			if(scanData) {
				$.forEach(data.scan, scanCheckPsi);
				if(changed) {
					fn(scanData);
					changed = false;
				}
			}
		});
	};

	appHost.request({
		cmd: "scan-init",
		scan: config
	}, function(response) {
		if(!scanData) return;
		var data = response.data;

		scanId = data.id;
		scanTimer = setInterval(scanCheck, 2000);
	}, function() {
		$.err({
			title: appHost.name,
			text: "Failed to scan stream"
		})
	});

	this.destroy = function() {
		if(scanTimer) clearInterval(scanTimer), scanTimer = null;
		if(scanData) scanData = null;
		if(scanId) {
			appHost.request({
				cmd: "scan-kill",
				id: scanId
			}, function() {
				scanId = null;
			});
		}
	};
}

/* COMPAT */

Element.prototype.dataRender = function(fn) {
	console.warn("Deprecated method: dataRender()");
	this.dataset.render = fn;
	return this
};

Element.prototype._bindScope = Element.prototype.bindScope;
Element.prototype.bindScope = function() {
	var args = arguments, self = this;
	if(args.length == 1) {
		console.warn("Deprecated method: bindScope()");
		var render, scope = args[0];

		if(self == $.body) {
			if(!window.renderContent) throw "render target not found";
			render = function() {
				var object = app.renderInit();
				window.renderContent.call(self, object);
			};
		} else {
			var dst = window,
				el = self.querySelector("*[data-render]"),
				key = el.dataset.render.split(".");
			while(key.length > 0 && !!dst) dst = dst[key.shift()];
			if(!dst) throw "render callback not found [" + el.dataset.render + "]";
			render = function() {
				dst.call(self, self);
			};
		}
		args = ([render, scope]).concat(Array.prototype.slice.call(args, 1));
	}
	Element.prototype._bindScope.apply(self, args);
	return self
};

/* APP */

app.setTheme = function(value) {
	var e = $.html;
	if(e.theme) e.removeClass(e.theme);
	if(value) e.addClass(value);
	e.theme = value;
	$.cookie.set("theme", value, 7);
};

app.getTheme = function() {
	return $.cookie.get("theme");
};

app.menu.push = function(item) {
	this.insertSorted(item, function(a, b) {
		var ao = (a.order != undefined) ? a.order : 1000;
		var bo = (b.order != undefined) ? b.order : 1000;
		return ao - bo;
	});
};

app.settings.push = function(item) {
	this.insertSorted(item, function(a, b) {
		var ao = (a.order != undefined) ? a.order : 1000;
		var bo = (b.order != undefined) ? b.order : 1000;
		return (ao > bo) ? 1 : -1;
	});
};

app.route = function() {
	var route = location.hash.match(/^(#\/[a-z-]*)\/*/);
	app.module = null;

	if(route) for(var i = 0; i < app.modules.length; ++i) {
		app.module = app.modules[i];
		if(app.module.link == route[1]) break;
		app.module = null;
	}

	if(!app.module) {
		$.route(app.modules[0].link);
	} else {
		if(app.search) app.search("");
		app.search = $.nop;
		app.module.init();
	}
};

app.eventBind = {};

app.on = function(event, fn) {
	var eb = app.eventBind[event];
	if(!eb) app.eventBind[event] = eb = [];
	eb.push(fn);
};

app.off = function(event, fn) {
	var eb = app.eventBind[event];
	if(eb) {
		eb.splice(eb.indexOf(fn), 1)
		if(!eb.length) delete(app.eventBind[event]);
	}
};

app.emit = function(event) {
	var eb = app.eventBind[event];
	if(eb) for(var i = 0; i < eb.length; i++) eb[i].apply(this, Array.prototype.slice.call(arguments, 1));
};

app.scope = {
	on: function(event, fn) {
		console.log("Deprecated Web-API for event:" + event);
		app.on(event, fn);
	},
	off: function(event, fn) {
		app.off(event, fn);
	},
}

$.route = function(l) { // deprecated
	location.href = l;
};

$(function() {
	window.addEventListener("hashchange", app.route);

	/* .card resize */
	var s = $.element("style").addAttr("type", "text/css").setHtml(".card { width: 210px; }");
	$.head.addChild(s);

	var cardCss;
	for(var i = 0; i < s.sheet.cssRules.length; ++i) {
		var r = s.sheet.cssRules[i];
		if(r.selectorText == ".card") { cardCss = r; break }
	}

	var resize = function() {
		var w = $.body.clientWidth - 20,
			b = (w > 390) ? 210 : 160;
		if(w > b) {
			var c = Math.round(w / b),
				m = ($.body.clientWidth > 768) ? 6 : 2,
				m = m * c - m,
				l = Math.floor((w - m) / c);
			cardCss.style.width = "" + l + "px";
		} else {
			cardCss.style.width = "100%";
		}
	};
	window.addEventListener("resize", resize);
	resize();

	app.setTheme(app.getTheme());

	var token = $.cookie.get("auth");
	if(token) app.login = token.split(":")[0];

	app.addHost({
		host: location.hostname,
		port: location.port,
		user: token,
	}, function() {
		$.forEach(app.modules, function(m) {
			if(m.run) m.run()
		});

		app.route();

		$.forEach(this.config.servers, function(s) {
			if(s.type == "streamer") app.addHost(s);
		});
	});
});
