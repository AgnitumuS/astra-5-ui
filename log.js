(function() {
"use strict";

window.LogModule = {
	label: "Log",
	link: "#/log",
	order: 9,
	search: true,
};

LogModule.run = function() {
	LogModule.inner = $.element("div").addClass("log monospace");

	LogModule.log = [];
	LogModule.logSkip = 0;
	LogModule.isReady = false;

	var appHost = app.hosts[location.host]; // TODO: all streamers

	appHost.request({
		cmd: "log"
	}, function(response) {
		var data = response.data;

		if(data.log) {
			var logData = [];
			Array.prototype.push.apply(logData, data.log);
			Array.prototype.push.apply(logData, LogModule.log);
			if(logData.length > 2000) logData.splice(0, logData.length - 2000);
			LogModule.log = logData;
			LogModule.logSkip = 0;
		}
		LogModule.isReady = true;
	});

	app.on("log_event", function(event) {
		if(event.data.log) {
			Array.prototype.push.apply(LogModule.log, event.data.log);
			if(LogModule.log.length > 2000) {
				var drop = LogModule.log.length - 2000;
				LogModule.log.splice(0, drop);
				LogModule.logSkip = Math.max(0, LogModule.logSkip - drop);
			}
		}
		if(event.data.set) {
			appHost.sysinfo.log = event.data.set;
			// TODO: setLogLevel
		}
	});
};

LogModule.render = function() {
	var self = this,
		object = app.renderInit(),
		appHost = app.hosts[location.host];

	var levelCheckbox = function(title, bind) {
		return $.element("label")
			.addClass("checkbox")
			.addChild($.element("input")
				.addAttr("type", "checkbox")
				.dataBind(bind)
				.on("change", function(event) {
					var v = event.target.checked,
						s = {};
					s[bind] = v;
					appHost.request({
						cmd: "set-log",
						set: s
					}, function(response) {
						appHost.sysinfo.log[bind] = response.data[bind];
					}, function() {
						self.set(bind, !v);
					});
				}))
			.addChild($.element("span").addClass("inner"))
			.addChild(title);
	};

	var logClear = function() {
		LogModule.inner.empty();
		LogModule.log = [];
		LogModule.logSkip = 0;
	}

	object
		.addChild(LogModule.inner)
		.addChild($.element("div")
			.addClass("log-footer row")
			.addChild(levelCheckbox("Debug", "debug"))
			.addChild(levelCheckbox("Info", "info"))
			.addChild($.element("div").addClass("col-expand"))
			.addChild($.element.button("Clear").on("click", logClear)));

	var search = "";
	var autoScroll = true;

	var logGrep = function(tail) {
		var il = LogModule.inner.childNodes,
			l = il.length,
			i = (!tail) ? 0 : l - tail;
		for(; i < l; ++i) {
			var e = il[i].removeClass("hide");
			if(search && e.lastChild.textContent.toLowerCase().indexOf(search) == -1) e.addClass("hide");
		}
		if(autoScroll) window.scrollTo(0, $.body.scrollHeight);
	};

	var logLimit = 2000;
	var stepLimit = 100;

	var dateFormat = function(d) {
		d = new Date(d);
		var dd = ("0" + d.getDate()).slice(-2);
		var dm = monthMap[d.getMonth()];
		var th = ("0" + d.getHours()).slice(-2);
		var tm = ("0" + d.getMinutes()).slice(-2);
		var ts = ("0" + d.getSeconds()).slice(-2);
		return dm + " " + dd + " " + th + ":" + tm + ":" + ts;
	};

	var makeItem = function(e) {
		var li = $.element("div").addClass("log-item log-" + e.type);
		var ld = $.element("div").addClass("log-time").setText(dateFormat(e.time * 1000));
		var lt = $.element("div").addClass("log-text").setText(e.text);
		li.addChild(ld).addChild(lt);
		LogModule.inner.addChild(li);
		if(LogModule.inner.childNodes.length > logLimit) LogModule.inner.firstChild.remove();
	};

	var cacheTimeout = null;

	var cacheUpdate = function() {
		if(!LogModule.isReady) {
			cacheTimeout = setTimeout(cacheUpdate, 200);
			return;
		}

		if(LogModule.logSkip == LogModule.log.length) {
			cacheTimeout = setTimeout(cacheUpdate, 1000);
			return;
		}

		var ds = Math.min(LogModule.log.length - LogModule.logSkip, stepLimit);
		var dc = LogModule.logSkip + ds;
		for(var i = LogModule.logSkip; i < dc; ++i) makeItem(LogModule.log[i]);
		LogModule.logSkip += ds;
		logGrep(ds);

		cacheTimeout = setTimeout(cacheUpdate, 50);
	};
	cacheUpdate();
	logGrep();

	app.search = function(value) {
		search = value || "";
		search = search.toLowerCase();
		if(!search) autoScroll = true;
		logGrep();
	};

	var autoScrollCheck = function() {
		autoScroll = (window.innerHeight + window.scrollY >= $.body.offsetHeight);
	};

	window.addEventListener("scroll", autoScrollCheck);
	self.on("destroy", function() {
		window.removeEventListener("scroll", autoScrollCheck);
		clearTimeout(cacheTimeout);
	});

	self.on("ready", function() {
		document.querySelector(".search").focus()
	});
};

LogModule.init = function() {
	var h = app.hosts[location.host];
	var s = { debug: h.sysinfo.log.debug, info: h.sysinfo.log.info };
	$.body
		.bindScope(LogModule.render, s);
};

app.modules.push(LogModule);
app.menu.push(LogModule);
})();
