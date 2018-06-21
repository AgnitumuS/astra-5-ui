(function() {
"use strict";

window.StreamsModule = {
	link: "#/stream",
};

StreamsModule.makeUrl = function(x) {
	var a = x.format + "://";
	if(x.login) {
		a += x.login;
		if(x.password) a += ":" + x.password;
		a += "@";
	}
	if(x.host) a += x.host;
	if(x.port) a += ":" + x.port;
	if(x.path) a += x.path;
	return a
};

var renderSoftcam = function(form, appHost) {
	var softcamList = [
		{ value: "", label: "None" },
		{ value: "", label: "---", disabled: true }
	];
	var softcamSortedList = [];
	$.forEach(appHost.config.softcam, function(i) {
		softcamSortedList.push({ value: i.id, label: i.name });
	});
	softcamSortedList.sort(function(a,b) { return a.label.localeCompare(b.label) });
	softcamList = softcamList.concat(softcamSortedList);
	form.choice("SoftCAM", "cam", softcamList);

	form.input("BISS Key", "biss").addValidator(validateBiss);
};

StreamsModule.renderModal_input = function(hostId) {
	var modal = this,
		appHost = app.hosts[hostId],
		form = new Form(modal.scope, modal),
		format = modal.scope.get("format");

	form.checkbox("Enable", "$enable")
		.addAttr("data-false", "false");

	form.choice("Input Type", "format", [
		{ value: "", label: "" },
		{ value: "dvb", label: "DVB" },
		{ value: "http", label: "HTTP/HLS" },
		{ value: "udp", label: "UDP" },
		{ value: "rtp", label: "RTP" },
		{ value: "rtsp", label: "RTSP" },
		{ value: "file", label: "MPEG-TS Files" },
	])
		.setRequired()
		.on("change", function() {
			modal.scope.reset({
				$enable: modal.scope.get("$enable"),
				format: this.value
			});
		});

	if(!!format) form.hr();

	if(format == "dvb") {

		var aList = [{ value: "", label: "" }];
		$.forEach(MainModule.adapters, function(a) {
			if(a.$host == hostId) aList.push({ value: a.$config.id, label: a.$config.name })
		});
		form.choice("Adapter", "addr", aList)
			.setRequired();
		form.checkbox("DVB-CI CAM", "cam");
		form.number("T2-MI", "t2mi");
		form.number("PNR", "pnr", "Program Number").addValidator(validatePnr);
		form.number("DD-CI CAM", "ddci");
		renderSoftcam(form, appHost);

	} else if(format == "http") {

		var a = modal.scope.serialize();
		modal.scope.set("$addr", makeUrl(a).split("#")[0]);

		form.input("HTTP Address", "$addr", "http://...")
			.setRequired()
			.addValidator(validateUrl)
			.on("input", function() {
				$.forEach(parseUrl(this.value), function(v, k) {
					if(a[k] != v) {
						a[k] = v;
						modal.scope.set(k, v);
					}
				});
			});

		form.input("User-Agent", "ua", "Custom HTTP User-Agent. Default: Astra");

		if(modal.scope.get("$advanced")) {
			form.hr();
			form.number("Buffer Time", "buffer_time", "Receiving buffer in seconds. Default: 2");
			form.number("Timeout", "timeout", "Connection timeout in seconds. Default: 10");
			form.checkbox("Use SCTP instead of TCP", "sctp");
		}

		form.hr();
		form.number("PNR", "pnr", "Program Number").addValidator(validatePnr);
		form.number("DD-CI CAM", "ddci");
		renderSoftcam(form, appHost);

		form.checkbox("Advanced Options", "$advanced")
			.on("change", function() {
				modal.scope.reset();
			});

	} else if(format == "udp" || format == "rtp") {

		var ifList = [{ value: "", label: "Default: Use system routes"}];
		$.forEach(appHost.sysinfo.if_list, function(v) { ifList.push(v) });

		form.choice("Local Interface", "localaddr", ifList);
		form.input("Address", "addr", "Source Address").setRequired();
		form.number("Port", "port", "Source Port. Default: 1234").addValidator(validatePort);

		if(modal.scope.get("$advanced")) {
			form.hr();
			form.number("Renew", "renew", "Refresh multicast group membership");
			form.number("Socket Size", "socket_size", "Redefine system socket size");
		}

		form.hr();
		form.number("PNR", "pnr", "Program Number").addValidator(validatePnr);
		form.number("DD-CI CAM", "ddci");
		renderSoftcam(form, appHost);

		form.checkbox("Advanced Options", "$advanced")
			.on("change", function() {
				modal.scope.reset();
			});

	} else if(format == "rtsp") {

		var a = modal.scope.serialize();
		modal.scope.set("$addr", makeUrl(a).split("#")[0]);

		form.input("RTSP Address", "$addr", "rtsp://...")
			.setRequired()
			.addValidator(validateUrl)
			.on("input", function() {
				$.forEach(parseUrl(this.value), function(v, k) {
					if(a[k] != v) {
						a[k] = v;
						modal.scope.set(k, v);
					}
				});
			});
		form.checkbox("Interleaved mode. Send data over TCP", "tcp");

	} else if(format == "file") {

		form.input("File", "filename", "Full path to the MPEG-TS file").setRequired();
		form.checkbox("Repeat File", "loop");

		form.number("PNR", "pnr", "Program Number").addValidator(validatePnr);

	}

	form.hr();

	var btnOk = $.element.button("Ok")
		.addClass("submit")
		.on("click", function() { modal.submit() });

	var btnCancel = $.element.button("Cancel")
		.on("click", function() { modal.remove() });

	form.checkbox("Remove", "$remove")
		.setDanger()
		.on("change", function() {
			if(this.checked)
				btnOk.removeClass("submit").addClass("danger");
			else
				btnOk.removeClass("danger").addClass("submit");
		});

	form.submit().addChild(btnOk, btnCancel);
};

StreamsModule.renderModal_output = function(hostId) {
	var modal = this,
		appHost = app.hosts[hostId],
		form = new Form(modal.scope, modal),
		format = modal.scope.get("format");

	form.checkbox("Enable", "$enable")
		.addAttr("data-false", "false");

	form.choice("Output Type", "format", [
		{ value: "", label: "" },
		{ value: "http", label: "HTTP/HLS" },
		{ value: "udp", label: "UDP" },
		{ value: "rtp", label: "RTP" },
		{ value: "resi", label: "RESI Modulator" },
		{ value: "np", label: "NetworkPush" },
		{ value: "file", label: "MPEG-TS Files" },
	])
		.setRequired()
		.on("change", function() {
			modal.scope.reset({
				$enable: modal.scope.get("$enable"),
				format: this.value
			});
		});

	if(!!format) form.hr();

	if(format == "http") {

		if(!modal.scope.get("host")) modal.scope.set("host", "0");

		var ifList = [{ value: "0", label: "Default: Any Interface"}];
		$.forEach(appHost.sysinfo.if_list, function(v) {
			if(v.ip) ifList.push({ value: v.ip, label: v.label });
		});

		form.choice("Local Interface", "host", ifList);
		form.number("Port", "port", "HTTP Server port").setRequired().addValidator(validatePort);
		form.input("Path", "path", "Unique path for stream")
			.setRequired()
			.addValidator(function(value) {
				return (value[0] == "/");
			});

	} else if(format == "udp" || format == "rtp") {

		var ifList = [{ value: "", label: "Default: Use system routes"}];
		$.forEach(appHost.sysinfo.if_list, function(v) { ifList.push(v) });

		form.choice("Local Interface", "localaddr", ifList);
		form.input("Address", "addr", "Destination Address").setRequired();
		form.number("Port", "port", "Destination Port. Default: 1234").addValidator(validatePort);

	} else if(format == "resi") {

		form.number("Adapter", "adapter").setRequired();
		form.number("Device", "device")
			.setRequired();
		form.number("Frequency", "frequency", "114..858 MHz")
			.setRequired()
			.addValidator(function(value) {
				value = Number(value);
				return (!isNaN(value) && value > 113 && value < 858 && ((value - 114) % 8) == 0)
			});
		form.choice("Modulation", "modulation", [
			{ value: "", label: "Default: 64-QAM" },
			{ value: "QAM16", label: "16-QAM" },
			{ value: "QAM32", label: "32-QAM" },
			{ value: "QAM128", label: "128-QAM" },
			{ value: "QAM256", label: "256-QAM" },
		]);
		form.number("Symbol Rate", "symbolrate", "1000...7100")
			.addValidator(function(value) {
				if(value == undefined || value == "") return true;
				value = Number(value);
				return (!isNaN(value) && value >= 1000 && value <= 7100)
			});
		form.number("Attenuator", "attenuator", "0...31")
			.addValidator(function(value) {
				if(value == undefined || value == "") return true;
				value = Number(value);
				return (!isNaN(value) && value >= 0 && value <= 31)
			});

	} else if(format == "np") {

		var a = modal.scope.serialize();
		modal.scope.set("$addr", makeUrl(a).split("#")[0]);

		form.input("Address", "$addr", "np://...")
			.setRequired()
			.addValidator(validateUrl)
			.on("input", function() {
				$.forEach(parseUrl(this.value), function(v, k) {
					if(a[k] != v) {
						a[k] = v;
						modal.scope.set(k, v);
					}
				});
			});

	} else if(format == "file") {

		form.input("File", "filename", "Full path to the MPEG-TS file").setRequired();

	}

	form.hr();

	var btnOk = $.element.button("Ok")
		.addClass("submit")
		.on("click", function() { if(modal.scope.validate()) modal.submit() });

	var btnCancel = $.element.button("Cancel")
		.on("click", function() { modal.remove() });

	form.checkbox("Remove", "$remove")
		.setDanger()
		.on("change", function() {
			if(this.checked)
				btnOk.removeClass("submit").addClass("danger");
			else
				btnOk.removeClass("danger").addClass("submit");
		});

	form.submit().addChild(btnOk, btnCancel);
};

var ioList = function(self, form, ioType, hostId) {
	form.hr();
	var lE = self.scope.get(ioType),
		lD = self.scope.get("_" + ioType);
	if(!lE) { lE = [""]; self.scope.set(ioType, lE); }
	if(!lD) { lD = []; self.scope.set("_" + ioType, lD); }

	var renderIoList = function(ioEnable) {
		var l = (ioEnable) ? lE : lD;

		$.forEach(l, function(v, i) {
			var x = (ioEnable) ?
				form.input("#" + (i + 1), ioType + "." + i) :
				form.input("", "_" + ioType + "." + i);

			x.addValidator(validateUrl);
			x.on("blur", function() {
				self.scope.set(x.dataset.bind, this.value.trim());
			});
			x.on("keydown", function() {
				if(event.keyCode == 13) {
					event.preventDefault();
					x.blur();
					var n;
					if(event.shiftKey) {
						if(i == 0) {
							n = 0;
							l.splice(0, 0, "");
							self.scope.reset();
						} else {
							n = i - 1;
						}
					} else {
						n = i + 1;
						if(n == l.length) {
							l.push("");
							self.scope.reset();
						}
					}
					document.querySelector("[name=\"" + ((ioEnable) ? "" : "_") + ioType + "." + n + "\"]").focus();
				}
			});

			var s = $.element("select")
				.addClass("button icon icon-move")
				.on("change", function() {
					if(this.value == "-2") {
						l.splice(i, 1);
						if(!lE.length) lE.push("");
					} else if(this.value == "-1") {
						lD.push(lE.splice(i, 1)[0]);
						if(!lE.length) lE.push("");
					} else {
						var _i = i;
						if(!ioEnable) { _i = lE.length; lE.push(lD.splice(i, 1)[0]); }
						lE.move(_i, Number(this.value));
					}
					self.scope.reset();
				});
			for(var j = 0; j < lE.length; ++j) {
				s.addChild($.element("option")
					.setValue(j.toString())
					.setText(j + 1));
			}
			if(!ioEnable) {
				s.addChild($.element("option")
					.setValue(lE.length.toString())
					.setText(lE.length + 1));
			}
			s.addChild(
				$.element("option")
					.setDisabled(true)
					.setText("---"),
				$.element("option")
					.setValue("-1")
					.setText("Disable"),
				$.element("option")
					.setValue("-2")
					.setText("Remove"));
			s.value = (ioEnable) ? i.toString() : "-1";

			x.addButton(s);
			x.addButton($.element.button()
				.addClass("icon icon-settings")
				.on("click", function() {
					var modalData = parseUrl(x.value) || {};
					modalData.$enable = ioEnable;
					$.modal()
						.bindScope(StreamsModule["renderModal_" + ioType], modalData, hostId)
						.on("submit", function() {
							l.splice(i, 1);
							if(!this.scope.get("$remove")) {
								var lM = (this.scope.get("$enable")) ? lE : lD;
								lM.push(makeUrl(this.scope.serialize()));
								if(lM == l) l.move(l.length - 1, i);
							}
							if(!lE.length) lE.push("");
							var x = window.scrollTop;
							self.scope.reset();
							window.scrollTop = x;
						});
				}));
		});
	}

	form.header(ioType + " list", "new " + ioType, function() {
		lE.push("");
		self.scope.reset();
		document.querySelector("[name=\"" + ioType + "." + (lE.length - 1) + "\"]").focus();
	});
	renderIoList(true);

	if(!lD.length) return;
	form.header("Disabled " + ioType + "'s");
	renderIoList(false);
};

var tabGeneral = function(self, form, streamId, hostId) {
	form.checkbox("Enable", "enable")
		.addAttr("data-false", "false");
	form.input("Name", "name").setRequired();

	var x = form.input("ID", "id")
		.addValidator(validateId);
	if(streamId != "-") x.setRequired();

	form.checkbox("Multi Program Stream", "type")
		.addAttr("data-false", "spts")
		.addAttr("data-true", "mpts")
		.on("change", function() {
			self.scope.reset({
				$tab: self.scope.get("$tab"),
				$streamId: streamId,
				enable: self.scope.get("enable"),
				id: self.scope.get("id"),
				type: (this.checked) ? "mpts" : "spts",
				name: self.scope.get("name"),
				groups: self.scope.get("groups"),
				input: self.scope.get("input"),
				output: self.scope.get("output"),
			});
		});
};

var tabGroups = function(self, form) {
	var masterHost = app.hosts[location.host];

	if(!masterHost.config.categories) {
		form.group()
			.addClass("text-center")
			.setHtml("Create new group in <a href=\"#/settings-groups\">Settings &gt; Groups</a>");
	} else $.forEach(masterHost.config.categories, function(c) {
		var gl = [{ value: "", test: "" }];
		$.forEach(c.groups, function(g) {
			gl.push({ value: g.name, label: g.name });
		});
		form.choice(c.name, "groups." + c.name.replace(/\./g, "\\."), gl);
	});
};

var tabSpts = function(self, form, streamId, hostId) {
	tabGeneral(self, form, streamId, hostId);

	form.checkbox("Start stream on demand", "http_keep_active")
		.addAttr("data-true", "undefined")
		.addAttr("data-false", "-1")
		.on("change", function() {
			self.scope.reset();
		});

	if(self.scope.get("http_keep_active") != -1)
		form.number("Keep Active", "http_keep_active", "Delay before stop stream if no active connections. Default: 0 (turn off immediately)");

	form.number("Channel Number", "lcn", "Logical number to arrange playlist");

	ioList(self, form, "input", hostId);
	ioList(self, form, "output", hostId);
};

var tabSptsSdt = function(self, form, streamId, hostId) {
	form.choice("Service Type", "service_type", [
		{ value: "", label: "Default: original service type" },
		{ value: "1", label: "Video" },
		{ value: "2", label: "Radio" },
		{ value: "3", label: "Teletext" },
	]);
	form.input("Service Provider", "service_provider");
	form.input("Service Name", "service_name");
	form.choice("Codepage", "textcode", codepages);
	form.hr();

	form.input("HbbTV URL", "hbbtv_url");
	form.hr();

	var casChannelList = self.scope.get("cas_list");
	form.header("Conditional Access", "New CAS", function() {
		if(!casChannelList) {
			casChannelList = [];
			self.scope.set("cas_list", casChannelList);
		}
		casChannelList.push({});
		self.scope.reset();
	});

	var casGlobalList = [
		{ value: "", label: "None" },
		{ value: "", label: "---", disabled: true }
	];
	var casSortedList = [];
	$.forEach(app.hosts[hostId].config.cas, function(i) {
		casSortedList.push({ value: i.id, label: i.name + " [" + i.super_cas_id + "]" });
	});
	casSortedList.sort(function(a,b) { return a.label.localeCompare(b.label) });
	casGlobalList = casGlobalList.concat(casSortedList);

	$.forEach(casChannelList, function(cas, x) {
		if(x != 0) form.hr();

		form.choice("CAS #" + (x + 1), "cas_list." + x + ".cas_id", casGlobalList)
			.setRequired()
			.on("change", function() {
				self.scope.reset();
			});

		form.number("ECM PID", "cas_list." + x + ".ecm_pid")
			.setRequired()
			.addValidator(validatePid);
		form.input("ECM Private Data (hex)", "cas_list." + x + ".ecm_data")
			.addValidator(validateHex)
			.addAttr("maxlength", "512");
		form.input("Access Criteria (hex)", "cas_list." + x + ".ac")
			.addValidator(validateHex)
			.addAttr("maxlength", "512");

		form.group()
			.addClass("text-right")
			.addChild($.element.button("Remove CAS")
				.addClass("link danger")
				.on("click", function() {
					casChannelList.splice(x, 1);
					if(!casChannelList.length) self.scope.set("cas_list");
					self.scope.reset();
				}));
	});
};

var tabSptsRemap = function(self, form) {
	form.input("Map PID's", "map", "Example: pmt=100, video=101, audio=102, 1003=103");
	form.input("Filter PID's", "filter~", "Keep only defined pids. Example: 101, 102, 103");
	form.number("Change PNR", "set_pnr").addValidator(validatePnr);
	form.number("Change TSID", "set_tsid");
};

var tabSptsBackup = function(self, form) {
	form.choice("Backup Type", "backup_type", [
		{ value: "", label: "Default: Active Backup" },
		{ value: "stop", label: "Active Backup and Stop streaming if all inputs are inactive" },
		{ value: "passive", label: "Passive Backup" },
		{ value: "disable", label: "Disable" },
	])
		.on("change", function() {
			self.scope.reset();
		});

	var backup_type = self.scope.get("backup_type");
	if(backup_type != "disable")
	{
		form.number("Start Delay", "backup_start_delay", "Delay before start next input. Default: 0");
		if(backup_type != "passive")
		{
			form.number("Return Delay", "backup_return_delay", "Delay before return to previous input. Default: 0");
			form.checkbox("Force return if all inputs are inactive", "backup_force_return");
		}
	}
};

var tabSptsEpg = function(self, form) {
	form.header("EPG Export");
	form.choice("Format", "epg_export_format", [
		{ value: "", label: "Default: XMLTV" },
		{ value: "json", label: "JSON" },
	]);
	form.input("Destination", "epg_export", "Destination address: file:// or http://");
	var x = form.choice("Codepage", "epg_export_codepage", codepages);
	x.firstChild.setText("Default: Auto");
};

var tabMpts = function(self, form, streamId, hostId) {
	tabGeneral(self, form, streamId, hostId);

	form.input("Country", "country", "Country Code ISO 3166-1 alpha-3")
		.setRequired()
		.addValidator(function(value) { return (!!value && value.length == 3) });
	form.input("UTC Offset", "offset", "Offset time from UTC in the range between -720 minutes and +780 minutes");
	form.number("Network ID", "network_id", "Default: 1");
	form.input("Network Name", "network_name");
	form.input("Provider Name", "provider");
	form.choice("Codepage", "textcode", codepages);
	form.number("TSID", "tsid", "Transport Stream ID. Default: 1")
		.addAttr("maxlength", "5");
	form.number("ONID", "onid", "Original Network ID. Default: 1");

	ioList(self, form, "input", hostId);
	ioList(self, form, "output", hostId);
};

var tabMptsSdt = function(self, form) {
	var sl = self.scope.get("sdt");
	$.forEach(sl, function(v, k) {
		var s = $.element("select")
			.addClass("button icon icon-move")
			.setStyle("float", "right")
			.on("change", function() {
				if(this.value == "-1") {
					sl.splice(k, 1);
				} else {
					sl.move(k, Number(this.value));
				}
				self.scope.reset();
			});
		for(var i = 0; i < sl.length; i++) {
			s.addChild($.element("option")
				.setValue(i.toString())
				.setText(i + 1));
		}
		s.addChild(
			$.element("option")
				.setDisabled(true)
				.setText("---"),
			$.element("option")
				.setValue("-1")
				.setText("Remove"));
		s.value = k;

		form.header("Service #" + (k + 1))
			.addChild(s);

		form.choice("Service Type", "sdt." + k + ".type", [
			{ value: "1", label: "Video" },
			{ value: "2", label: "Radio" },
			{ value: "3", label: "Teletext" },
		]);

		form.input("Service Name", "sdt." + k + ".name")
			.setRequired();

		form.number("PNR", "sdt." + k + ".pnr", "Program Number")
			.setRequired()
			.addValidator(validatePnr);

		form.checkbox("Scrambled channel", "sdt." + k + ".ca")
			.on("change", function() {
				self.scope.reset();
			});

		form.number("LCN", "sdt." + k + ".lcn", "Logical Channel Number")
			.addValidator(function(value) {
				if(value == undefined || value == "") return true;
				value = Number(value);
				return (!isNaN(value) && value >= 0 && value < 1000)
			});

		form.hr();
	});

	form.header("New Service")
		.addChild($.element.button()
			.addClass("icon  icon-add")
			.setStyle("float", "right")
			.on("click", function(event) {
				event.preventDefault();
				if(sl == undefined) { sl = []; self.scope.set("sdt", sl) }
				sl.push({ type: "1" });
				self.scope.reset();
				window.scrollTo(0, $.body.scrollHeight);
				document.querySelector("[name=\"sdt." + (sl.length - 1) + ".name\"]").focus();
			}));
};

var tabMptsNit = function(self, form, streamId, hostId) {
	form.choice("LCN Version", "nit_actual.lcn_version", [
		{ value: "", label: "Default: EACEM" },
		{ value: "nordig-v1", label: "Nordig v1" },
	]);
	form.hr();

	form.choice("Delivery Type", "nit_actual.type", [
		{ value: "", label: "Default: not defined" },
		{ value: "S", label: "DVB-S" },
		{ value: "C", label: "DVB-C" },
	])
		.on("change", function() {
			self.scope.set("nit_actual", { type: this.value });
			self.scope.set("nit_other", undefined);
			self.scope.reset()
		});

	var sType = self.scope.get("nit_actual.type");
	if(!sType) {
		//
	} else if(sType == "S") {

		form.number("Frequency", "nit_actual.frequency", "950..13250 MHz")
			.setRequired()
			.addValidator(function(value) {
				value = Number(value);
				return (!isNaN(value) && value >= 950 && value < 13250)
			});
		form.choice("Polarization", "nit_actual.polarization", dvbPolarization)
			.setRequired();
		form.number("Symbolrate", "nit_actual.symbolrate", "1000..50000 Kbaud")
			.setRequired()
			.addValidator(function(value) {
				value = Number(value);
				return (!isNaN(value) && value > 1000 && value < 50000)
			});
		form.input("Orbital Position", "nit_actual.position", "Orbital Position (Example: 0.8W, 36.0E)")
			.setRequired()
			.addValidator(function(value) {
				// TODO: orbital posisition
				return true;
			});
		form.choice("FEC", "nit_actual.fec", dvbFec);
		form.choice("Modulation", "nit_actual.modulation", dvbsModulation);

	} else if(sType == "C") {

		form.number("Frequency", "nit_actual.frequency", "80..1000 MHz")
			.setRequired()
			.addValidator(function(value) {
				value = Number(value);
				return (!isNaN(value) && value >= 80 && value < 1000)
			});
		form.number("Symbolrate", "nit_actual.symbolrate", "1000..10000 Kbaud")
			.setRequired()
			.addValidator(function(value) {
				value = Number(value);
				return (!isNaN(value) && value > 1000 && value < 10000)
			});
		form.choice("FEC", "nit_actual.fec", dvbFec);
		form.choice("Modulation", "nit_actual.modulation", dvbcModulation);

	}

	form.header("Network Search");
	var nitOther = self.scope.get("nit_other");
	if(!nitOther) nitOther = [], self.scope.set("nit_other", nitOther);
	var mptsList = [];
	$.forEach(app.hosts[hostId].config.make_stream, function(c) {
		if(c.id && c.id != streamId && c.type == "mpts") mptsList.push({ id: c.id, name: c.name, tsid: c.tsid });
	});
	$.forEach(mptsList, function(c) {
		var x = form.checkbox(c.name, "")
			.on("change", function() {
				if(this.checked) {
					nitOther.push(c.id);
				} else {
					var i = nitOther.indexOf(c.id);
					if(i != -1) nitOther.splice(i, 1);
				}
			});
		x.checked = (nitOther.indexOf(c.id) != -1);
	});
};

var tabMptsAdvanced = function(self, form) {
	form.number("SI Packets Interval", "si_interval", "Interval in milliseconds to send stream information. Default: 500");
};

StreamsModule.tabs = {
	spts: [
		{ label: "General", id: "", render: tabSpts },
		{ label: "Groups", id: "groups", render: tabGroups },
		{ label: "Service", id: "sdt", render: tabSptsSdt },
		{ label: "Remap", id: "remap", render: tabSptsRemap },
		{ label: "Backup", id: "backup", render: tabSptsBackup },
		{ label: "EPG", id: "epg", render: tabSptsEpg },
	],
	mpts: [
		{ label: "General", id: "", render: tabMpts },
		{ label: "Groups", id: "groups", render: tabGroups },
		{ label: "SDT", id: "sdt", render: tabMptsSdt },
		{ label: "NIT", id: "nit", render: tabMptsNit },
		{ label: "Advanced", id: "advanced", render: tabMptsAdvanced },
	],
};

StreamsModule.render = function(hostId) {
	var x, self = this,
		object = app.renderInit(),
		streamId = self.scope.get("$streamId"),
		appHost = app.hosts[hostId],
		tabId = self.scope.get("$tab") || "",
		form = new Form(self.scope, object),
		type = self.scope.get("type"),
		tabRender;

	x = [];
	$.forEach(StreamsModule.tabs[type], function(v) {
		x.push(v);
		if(tabId == v.id) tabRender = v.render;
	});
	form.tab("$tab", x);
	tabRender(self, form, streamId, hostId);

	var serialize = function() {
		if(self.scope.get("$remove")) return { remove: true };

		var data = self.scope.serialize();
		if(data.id == undefined) data.id = appHost.makeUid("make_stream");

		var ioClean = function(obj) {
			var a = data[obj];
			if(a == undefined) return;
			for(var i = 0; i < a.length; ) {
				if(!a[i]) a.splice(i, 1);
				else ++i;
			}
			if(!a.length) delete(data[obj]);
		}

		ioClean("input");
		ioClean("_input");
		ioClean("output");
		ioClean("_output");

		if(!data.input) data.enable = false;

		if(data.nit_actual) {
			if(!data.nit_actual.type) {
				delete(data.nit_actual);
				delete(data.nit_other);
			} else {
				$.forEach(data.nit_actual, function(v, k) {
					if(!v) delete(data.nit_actual[k]);
				});

				if(data.nit_other) {
					for(var i = 0; i < data.nit_other.length; ) {
						if(data.nit_other[i]) ++i;
						else data.nit_other.splice(i, 1);
					}
					if(!data.nit_other.length) delete(data.nit_other);
				}
			}
		}

		$.forEach(data.groups, function(v, k) {
			if(!v) delete(data.groups[k]);
		});
		if($.isObjectEmpty(data.groups)) delete(data.groups);

		return data;
	}

	form.hr();

	var btnApply = $.element.button("Apply")
		.addClass(self.scope.get("$remove") ? "danger" : "submit")
		.on("click", function() {
			if(!self.scope.get("$remove") && !self.scope.validate()) {
				$.err({ title: "Form has errors" });
				return;
			}
			appHost.request({
				cmd: "set-stream",
				gid: appHost.config.gid,
				id: streamId,
				stream: serialize(),
			}, function() {
				$.route(MainModule.link);
			}, function() {
				$.err({ title: "Failed to save stream" });
			});
		});

	var btnClone = $.element.button("Clone")
		.on("click", function() {
			var data = serialize();
			data.name = (data.name || "") + " (clone)";
			if(data.id != undefined) delete(data.id);
			StreamsModule.streamClone = data;
			app.selectHost(StreamsModule.link, "-");
		});

	var btnHelp = $.element.button("Help")
		.on("click", function() {
			var m = $.modal()
				.addClass("help")
				.addChild($.element("iframe")
					.addAttr("src", "https://cesbo.com/wiki/embed/ru/stream?embed"))
				.addChild($.element("div")
					.addClass("text-center")
					.addChild($.element.button("ok")
						.on("click", function() { m.remove() })));
		});

	if(streamId != "-") {
		if(tabId == "") {
			form.checkbox("Remove", "$remove")
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
	}

	form.submit().addChild(btnApply, btnClone);
};

StreamsModule.init = function() {
	var scope;

	var x = location.hash.slice(StreamsModule.link.length + 1).split("/"),
		sid = decodeURIComponent(x.pop()),
		host = x.pop();

	if(!host || !app.hosts[host]) { $.route(MainModule.link); return }

	if(sid == "-") {
		if(StreamsModule.streamClone) {
			scope = StreamsModule.streamClone;
			delete(StreamsModule.streamClone);
		} else {
			scope = { "enable": true, "type": "spts" };
		}
	} else {
		var s = MainModule.streams[host + "/" + sid];
		if(!s) { $.route(MainModule.link); return }
		scope = $.clone(s.$config);
	}
	scope.$streamId = sid;

	$.body.bindScope(StreamsModule.render, scope, host);
};

app.modules.push(StreamsModule);
})();
