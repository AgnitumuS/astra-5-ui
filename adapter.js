(function() {
"use strict";

window.AdaptersModule = {
	link: "#/adapter",
};

AdaptersModule.renderScan = function(host) {
	var modal = this,
		appHost = app.hosts[host];

	var dvbStatus = function() {
		var i = function(t) { return $.element("span").addAttr("title", t) };
		var x = $.element("div")
			.addClass("info-status")
			.addChild(i("SIGNAL"), i("CARRIER"), i("FEC"), i("SYNC"), i("LOCK"), i("BER"), i("UNC"), i("BITRATE"));
		var xl = x.childNodes;
		x.setStatus = function(s) {
			xl[0].className = (s.status & 0x01) ? "ok" : "er"; /* signal */
			xl[1].className = (s.status & 0x02) ? "ok" : "er"; /* carrier */
			xl[2].className = (s.status & 0x04) ? "ok" : "er"; /* viterbi */
			xl[3].className = (s.status & 0x08) ? "ok" : "er"; /* sync */
			xl[4].className = (s.status & 0x10) ? "ok" : "er"; /* lock */
			xl[5].setText("BER:" + s.ber_value);
			xl[6].setText("UNC:" + s.unc_value);
			xl[7].setText(s.bitrate + " Kbit/s");
		};
		return x
	};

	var sI = dvbStatus();
	var sS = MainModule.dvbLevel("S", modal.scope.get("raw_signal"));
	var sQ = MainModule.dvbLevel("Q", modal.scope.get("raw_signal"));

	var form = new Form(modal.scope, modal);
	form.submit().addChild(sI, sS, sQ);

	modal.setStatus = function(s) {
		sS.setLevel(s.svalue);
		sQ.setLevel(s.qvalue);
		sI.setStatus(s);
		modal.status = s;
	};
	modal.setStatus(modal.status || { lock: false, svalue: 0, qvalue: 0, ber_value: 0, unc_value: 0, bitrate: 0 });

	form.hr();

	var renderNit = function(v) {
		form.input("Provider").addAttr("readonly").setValue(v.name);
		var s = v.system || {};
		switch(s.type_id) {
			case 67: { /* DVB-S */
				form.input("Position").addAttr("readonly").setValue(s.orbital_position);
				form.input("Frequency").addAttr("readonly").setValue(s.frequency);
				form.input("Polarization").addAttr("readonly").setValue(s.polarization);
				form.input("Symbolrate").addAttr("readonly").setValue(s.symbolrate);
				form.input("Modulation").addAttr("readonly").setValue(s.modulation);
				form.input("FEC").addAttr("readonly").setValue(s.fec);
				break;
			}
			case 68: { /* DVB-C */
				form.input("Frequency").addAttr("readonly").setValue(s.frequency);
				form.input("Symbolrate").addAttr("readonly").setValue(s.symbolrate);
				form.input("Modulation").addAttr("readonly").setValue(s.modulation);
				form.input("FEC").addAttr("readonly").setValue(s.fec);
				break;
			}
			case 90: { /* DVB-T */
				form.input("Frequency").addAttr("readonly").setValue(s.frequency);
				form.input("Bandwidth").addAttr("readonly").setValue(s.bandwidth);
				form.input("Guard Interval").addAttr("readonly").setValue(s.guard_interval);
				form.input("Transmit Mode").addAttr("readonly").setValue(s.transmitmode);
				form.input("Hierarchy").addAttr("readonly").setValue(s.hierarchy);
				form.input("Modulation").addAttr("readonly").setValue(s.modulation);
				break;
			}
		}
		form.hr();
	};

	var renderItem = function(v, i) {
		if(v.pnr == 0) {
			renderNit(v);
		} else {
			var text = "PNR:" + v.pnr + "&nbsp;<strong>" + v.name + "</strong>";
			if(v.cas && v.cas.length) text += "<br/>CAS:" + v.cas.join(",&nbsp;");
			var s = (!!v.streams && v.streams.length);
			if(s) text += "<br/>" + v.streams.join("<br/>");
			form.checkbox(text, "streams." + i + ".select").setDisabled(!s);
		}
	};

	var streams = modal.scope.get("streams");
	if(!streams || !streams.length) {
		form.loading();
	} else {
		$.forEach(streams, renderItem);

		form.hr();

		form.checkbox("Set DVB-CI CAM for selected channels", "cam");

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
		form.choice("Set SoftCAM for selected channels", "cam", softcamList);
	}

	form.hr();

	var btnApply = $.element.button("Apply")
		.addClass("submit")
		.on("click", function() { modal.submit() });

	var btnCancel = $.element.button("Cancel")
		.on("click", function() { modal.remove() });

	modal.addChild($.element("div")
		.addClass("text-center")
		.addChild(btnApply, btnCancel));
};

AdaptersModule.startScan = function(host, fn) {
	var self = this,
		scan, modal,
		config = self.scope.serialize();

	config.format = "dvb";
	if(config.id == undefined) config.id = "-";

	var onScan = function(scanData) {
		modal.scope.set("streams", $.clone(scanData));
		modal.scope.reset();
	};

	var onEvent = function(event) {
		var data = event.data;
		if(event.host != host || data.dvb_id != config.id) return;

		var status = {
			bitrate: data.bitrate,
			ber_value: (data.ber > 99) ? "99+" : data.ber,
			unc_value: (data.unc > 99) ? "99+" : data.unc,
			signal: (data.status & 0x01) !== 0,
			carrier: (data.status & 0x02) !== 0,
			viterbi: (data.status & 0x04) !== 0,
			sync: (data.status & 0x08) !== 0,
			lock: (data.status & 0x10) !== 0,
		};

		if(config.raw_signal) {
			status.svalue = data.signal;
			status.qvalue = Number(data.snr / 10).format(1);
		} else {
			status.svalue = Math.floor((data.signal * 99) / 65535);
			status.qvalue = Math.floor((data.snr * 99) / 65535);
		}

		modal.setStatus(status);
	};

	var onModalRemove = function() {
		app.off("adapter_event", onEvent);
		scan.destroy();
		modal.scope.destroy();
	};

	modal = $.modal()
		.addClass("dvb-scan")
		.bindScope(AdaptersModule.renderScan, {
			raw_signal: config.raw_signal
		}, host)
		.on("remove", function() {
			onModalRemove();
		})
		.on("submit", function() {
			var streams = [],
				cam = modal.scope.get("cam");
			$.forEach(modal.scope.get("streams"), function(s) {
				if(s.select) streams.push({ name: s.name, pnr: s.pnr });
			});

			onModalRemove();
			if(streams.length) fn(streams, cam);
		});

	app.on("adapter_event", onEvent);
	scan = new Scan(host, config, onScan);
};

AdaptersModule.renderPlsCals = function() {
	var modal = this,
		form = new Form(modal.scope, modal);

	form.choice("PLS Mode", "mode", [
		{ label: "Root", value: 0 },
		{ label: "Gold", value: 1 },
		{ label: "Combo", value: 2 },
	])
		.setRequired();

	form.number("PLS Code (0 - 262143)", "code")
		.setRequired()
		.addValidator(function(value) {
			value = Number(value);
			return (!isNaN(value) && value >= 0 && value <= 262143);
		});

	form.number("Stream (0 - 255)", "id")
		.setRequired()
		.addValidator(function(value) {
			value = Number(value);
			return (!isNaN(value) && value >= 0 && value <= 255);
		});

	form.hr();

	var btnOk = $.element.button("Ok")
		.addClass("submit")
		.on("click", function() {
			if(modal.scope.validate()) modal.submit();
		});

	var btnCancel = $.element.button("Cancel")
		.on("click", function() {
			modal.remove();
		});

	form.submit().addChild(btnOk, btnCancel);
};

AdaptersModule.render = function(host) {
	var x, self = this,
		object = app.renderInit(),
		adapterId = self.scope.get("$adapterId"),
		appHost = app.hosts[host],
		tabId = self.scope.get("$tab") || "",
		dvbList = MainModule.dvbDevList[host],
		form = new Form(self.scope, object),
		adapterType = self.scope.get("type"),
		adapterTypeMap = {
			"S": "S", "S2": "S",
			"T": "T", "T2": "T",
			"C": "C", "C/A": "C", "C/B": "C", "C/C": "C",
			"ATSC": "ATSC",
			"ISDBT": "ISDBT",
		},
		adapterTypeBase = adapterTypeMap[adapterType];

	switch(adapterTypeBase) {
		case "S":
			form.tab("$tab", [
				{ label: "General", id: "" },
				{ label: "LNB", id: "lnb" },
				{ label: "DiSEqC", id: "diseqc" },
				{ label: "Unicable", id: "unicable" },
				{ label: "Advanced", id: "advanced" },
			]);
			break;
		case "T":
		case "C":
		case "ATSC":
		case "ISDBT":
			form.tab("$tab", [
				{ label: "General", id: "" },
				{ label: "Advanced", id: "advanced" },
			]);
			break;
		default:
			form.tab("$tab", [
				{ label: "General", id: "" },
			]);
			break;
	}

	if(tabId == "") {
		form.checkbox("Enable", "enable")
			.addAttr("data-false", "false");
		form.input("Name", "name", "Adapter Name").setRequired();

		x = form.input("ID", "id")
			.addValidator(validateId);
		if(adapterId != "-") x.setRequired();

		if(self.scope.get("$adapter") == undefined) {
			var a = Number(self.scope.get("adapter"));
			var d = Number(self.scope.get("device") || 0);
			var m = self.scope.get("mac");
			if(!isNaN(a) && !isNaN(d)) {
				self.scope.set("$adapter", $.forEach(appHost.sysinfo.dvb_list, function(v, k) {
					if(v.adapter == a && v.device == d) return k;
				}));
			} else if(m) {
				self.scope.set("$adapter", $.forEach(appHost.sysinfo.dvb_list, function(v, k) {
					if(v.mac == m) return k;
				}));
			}
		}

		form.choice("Adapter", "$adapter", dvbList)
			.setRequired()
			.on("change", function() {
				var adapter = appHost.sysinfo.dvb_list[this.value];
				self.scope.set("adapter", adapter.adapter);
				self.scope.set("device", adapter.device);
			});

		form.choice("Type", "type", [
			{ value: "" },
			{ group: "Satellite", items: [
				{ label: "DVB-S", value: "S" },
				{ label: "DVB-S2", value: "S2" },
			]},
			{ group: "Terrestrial", items: [
				{ label: "DVB-T", value: "T" },
				{ label: "DVB-T2", value: "T2" },
				{ label: "ATSC", value: "ATSC" },
				{ label: "ISDB-T", value: "ISDBT" },
			]},
			{ group: "Cable", items: [
				{ label: "DVB-C", value: "C" },
				{ label: "DVB-C (Annex A)", value: "C/A" },
				{ label: "DVB-C (Annex B)", value: "C/B" },
				{ label: "DVB-C (Annex C)", value: "C/C" },
			]},
		])
			.setRequired()
			.on("change", function() {
				if(adapterTypeMap[this.value] != adapterTypeBase) {
					self.scope.reset({
						$tab: tabId,
						$adapterId: adapterId,
						adapter: self.scope.get("adapter"),
						device: self.scope.get("device"),
						enable: self.scope.get("enable"),
						id: self.scope.get("id"),
						type: this.value,
						name: self.scope.get("name"),
					});
				} else {
					self.scope.reset();
				}
			});
	}

	if(adapterType && tabId == "advanced") {
		form.choice("Modulation", "modulation", [
			{ value: "", label: "Default: Auto" },
			{ value: "QPSK" },
			{ value: "QAM16", label: "16-QAM" },
			{ value: "QAM32", label: "32-QAM" },
			{ value: "QAM64", label: "64-QAM" },
			{ value: "QAM128", label: "128-QAM" },
			{ value: "QAM256", label: "256-QAM" },
			{ value: "VSB8" },
			{ value: "VSB16" },
			{ value: "PSK8", label: "8PSK" },
			{ value: "APSK16" },
			{ value: "APSK32" },
			{ value: "DQPSK" },
		]);
	}

	if(adapterTypeBase == "S") {
		if(tabId == "") {
			form.header("Transponder");
			form.number("Frequency", "frequency", "950..13250 MHz")
				.setRequired()
				.addValidator(function(value) {
					value = Number(value);
					return (!isNaN(value) && value >= 950 && value < 13250)
				});
			form.choice("Polarization", "polarization", dvbPolarization)
				.setRequired();
			form.number("Symbolrate", "symbolrate", "1000..50000 Kbaud")
				.setRequired()
				.addValidator(function(value) {
					value = Number(value);
					return (!isNaN(value) && value > 1000 && value < 50000)
				});
		}

		if(tabId == "advanced") {
			form.choice("FEC", "fec", dvbFec);
			if(adapterType == "S2") {
				form.choice("Roll-off", "rolloff", [
					{ value: "", label: "Default: 35" },
					{ value: "25" }, { value: "20" }, { value: "AUTO" }
				]);
			}

			form.number("Stream ID", "stream_id", "Multistream filtering")
				.addButton($.element.button()
					.addClass("icon icon-settings")
					.on("click", function() {
						var x = self.scope.get("stream_id") || 0;
						$.modal()
							.bindScope(AdaptersModule.renderPlsCals, { mode: (x >> 26), code: (x >> 8) & 0x3FFFF, id: x & 0xFF })
							.on("submit", function() {
								var data = this.scope.serialize();
								var streamId = (Number(data.mode) << 26) + (Number(data.code) << 8) + Number(data.id);
								self.scope.set("stream_id", (streamId > 0) ? streamId : undefined);
							});
					}));
		}

		if(tabId == "lnb") {
			form.number("LOF1", "lof1", "Low sub-band");
			form.number("LOF2", "lof2", "High sub-band");
			form.number("SLOF", "slof", "Sub-band range");
			form.checkbox("LNB Sharing. Disable LNB voltage supply and tone signal", "lnb_sharing");
			form.checkbox("Force Tone", "tone");
		}

		if(tabId == "unicable") {
			var uniChId = [{ value: "", label: "Default: unicable disabled" }];
			var uniPos, uniFreq;
			for(var i = 1; i < 10; ++i) { uniChId.push({ value: i }) }
			form.choice("Unicable Slot", "uni_scr", uniChId)
				.on("change", function() {
					if(!this.value) {
						self.scope.set("uni_pos", "");
						self.scope.set("uni_frequency", "");
						uniPos.setDisabled(true);
						uniFreq.setDisabled(true);
					} else {
						uniPos.setDisabled(false);
						uniFreq.setDisabled(false);
					}
				});
			var isUnicableSlot = self.scope.get("uni_scr") != undefined;
			uniPos = form.choice("Slot Position", "uni_pos", [{ value: "" }, { value: "A" }, { value: "B" }])
				.setDisabled(!isUnicableSlot);
			uniFreq = form.number("Slot Frequency", "uni_frequency", "950..2150 MHz")
				.setDisabled(!isUnicableSlot)
				.addValidator(function(value) {
					if(value == undefined || value == "") return true;
					value = Number(value);
					return (!isNaN(value) && value >= 950 && value < 2150)
				});
		}

		if(tabId == "diseqc") {
			form.choice("DiSEqC Mode", "diseqc_mode", [
				{ value: "", label: "Default: DiSEqC 1.0" },
				{ value: "1.1", label: "DiSEqC: 1.1" },
				{ value: "toneburst", label: "Tone Burst" },
				{ value: "cmd", label: "DiSEqC Command" }
			]).on("change", function() {
				self.scope.reset();
			});

			switch(self.scope.get("diseqc_mode")) {
				case "1.1":
					var x = [{ value: "" }];
					for(var i = 1; i <= 16; i++) x.push({ value: i });
					form.choice("DiSEqC 1.1", "diseqc", x);
					break;
				case "toneburst":
					form.choice("Tone Burst", "diseqc", [
						{ value: "" }, { value: "A" }, { value: "B" }
					]);
					break;
				case "cmd":
					form.input("DiSEqC Command", "diseqc");
					break;
				case "1.0":
				default:
					var x = [{ value: "" }];
					for(var i = 1; i <= 4; i++) x.push({ value: i });
					form.choice("DiSEqC 1.0", "diseqc", x);
					break;
			}
		}
	} else if(adapterTypeBase == "T") {
		if(tabId == "") {
			form.number("Frequency", "frequency", "1..1000 MHz")
				.setRequired()
				.addValidator(function(value) {
					value = Number(value);
					return (!isNaN(value) &&
						((value > 0 && value < 1000) || (value > 1000000 && value < 1000000000)))
				});
		}

		if(tabId == "advanced") {
			form.number("PLP ID", "stream_id", "Multistream filtering");

			form.choice("Bandwidth", "bandwidth", [
				{ value: "", label: "Default: Auto" },
				{ value: "6MHz" }, { value: "7MHz" }, { value: "8MHz" }
			]);

			form.choice("Guard", "guardinterval", [
				{ value: "", label: "Default: Auto" },
				{ value: "1/32" }, { value: "1/16" },
				{ value: "1/8" }, { value: "1/4" },
				{ value: "1/128" }, { value: "19/128" }, { value: "19/256" },
			]);

			form.choice("Transmit", "transmitmode", [
				{ value: "", label: "Default: Auto" },
				{ value: "1K" }, { value: "2K" }, { value: "4K" },
				{ value: "8K" }, { value: "16K" }, { value: "32K" }
			]);

			form.choice("Hierarchy", "hierarchy", [
				{ value: "", label: "Default: Auto" },
				{ value: "NONE" }, { value: "1" },
				{ value: "2" }, { value: "4" },
			]);
		}

	} else if(adapterTypeBase == "C") {
		if(tabId == "") {
			form.number("Frequency", "frequency", "80..1000 MHz")
				.setRequired()
				.addValidator(function(value) {
					value = Number(value);
					return (!isNaN(value) &&
						((value >= 80 && value < 1000) || (value >= 80000000 && value < 1000000000)))
				});
			form.number("Symbolrate", "symbolrate", "1000..10000 Kbaud")
				.setRequired()
				.addValidator(function(value) {
					value = Number(value);
					return (!isNaN(value) && value > 1000 && value < 10000)
				});
		}

		if(tabId == "advanced") {
			form.choice("FEC", "fec", dvbFec)
		}
	} else if(adapterTypeBase == "ATSC") {
		if(tabId == "") {
			form.number("Frequency", "frequency", "0..1000 MHz")
				.setRequired()
				.addValidator(function(value) {
					value = Number(value);
					return (!isNaN(value) &&
						((value > 0 && value < 1000) || (value > 1000000 && value < 1000000000)))
				});
		}

	} else if(adapterTypeBase == "ISDBT") {
		if(tabId == "") {
			form.number("Frequency", "frequency", "0..1000 MHz")
				.setRequired()
				.addValidator(function(value) {
					value = Number(value);
					return (!isNaN(value) &&
						((value > 0 && value < 1000) || (value > 1000000 && value < 1000000000)))
				});
		}

		if(tabId == "advanced") {
			form.choice("Bandwidth", "bandwidth", [
				{ value: "", label: "Default: Auto" },
				{ value: "6MHz" }, { value: "7MHz" }, { value: "8MHz" }
			])
		}
	}

	if(adapterType && tabId == "advanced") {
		form.input("Timeout", "timeout", "Delay in seconds before check DVR errors. Default: 2 sec");
		form.input("DDCI", "ddci", "Bind adapter to the DigitalDevices CI");
		form.checkbox("Budget Mode. Disable hardware PID filtering", "budget");
		form.checkbox("Signal in dBm", "raw_signal");
		form.checkbox("Scale DD MaxS8 SNR", "mxl5xx_snr");
		form.input("CA Delay", "ca_pmt_delay", "Delay before initialize CA module. Default: 5 sec");
	}

	var serialize = function() {
		if(self.scope.get("$remove")) return { remove: true };

		var data = self.scope.serialize();
		if(!data.id) data.id = appHost.makeUid("dvb_tune");
		if(!data.diseqc) delete(data["diseqc_mode"]);

		return data;
	};

	var apply = function(streams, cam) {
		var data = serialize();
		$.forEach(streams, function(s) {
			s.enable = true;
			s.type = "spts";
			s.id = appHost.makeUid("make_stream");
			var x = "dvb://" + data.id + "#pnr=" + s.pnr;
			if(cam) x += (cam == true) ? ("&cam") : ("&cam=" + cam);
			s.input = [x];
			delete(s.pnr);
		});
		appHost.request({
			cmd: "set-adapter",
			gid: appHost.config.gid,
			id: adapterId,
			adapter: data,
			scan: streams
		}, function() {
			$.route(MainModule.link);
		}, function() {
			$.err({ title: "Failed to save adapter" });
		});
	};

	form.hr();

	var btnApply = $.element.button("Apply")
		.addClass(self.scope.get("$remove") ? "danger" : "submit")
		.on("click", function() {
			if(!self.scope.get("$remove") && !self.scope.validate())
				$.err({ title: "Form has errors" });
			else
				apply();
		});

	var btnScan = $.element.button("Scan")
		.on("click", function() {
			if(!self.scope.validate())
				$.err({ title: "Form has errors" });
			else
				AdaptersModule.startScan.call(self, host, apply);
		});

	if(adapterId != "-" && tabId == "") {
		form.checkbox("Remove", "$remove")
			.setDanger()
			.on("change", function() {
				if(this.checked)
					btnApply.removeClass("submit").addClass("danger");
				else
					btnApply.removeClass("danger").addClass("submit");
			});
	}

	form.submit().addChild(btnApply, btnScan);
};

AdaptersModule.init = function() {
	var scope;

	var x = location.hash.slice(AdaptersModule.link.length + 1).split("/"),
		adapterId = decodeURIComponent(x.pop()),
		host = x.pop();

	if(!host || !app.hosts[host]) { $.route(MainModule.link); return }

	if(adapterId == "-") {
		scope = { "enable": true };
	} else {
		var a = MainModule.adapters[host + "/" + adapterId];
		if(!a) { $.route(MainModule.link); return }
		scope = $.clone(a.$config);
	}
	scope.$adapterId = adapterId;

	$.body.bindScope(AdaptersModule.render, scope, host);
};

app.modules.push(AdaptersModule);
})();
