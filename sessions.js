(function() {
"use strict";

window.SessionsModule = {
	label: "Sessions",
	link: "#/sessions",
	order: 5,
};

SessionsModule.run = function() {
	SessionsModule.sessions = {};
	SessionsModule.hide = (app.hosts[location.host].config.settings || {}).http_disable_sessions;

	// TODO: rename to event-session
	app.on("session_event", function(event) {
		var hostId = event.host,
			data = event.data,
			cdate = Date.now();

		$.forEach(data.sessions, function(e) {
			var sessionsId = hostId + "/" + e.client_id;

			if(e.hasOwnProperty("channel_id")) {
				e.host = hostId;
				e.sdate = new Date(cdate - e.uptime * 1000);
				if(SessionsModule.addSession) SessionsModule.addSession(e);
				SessionsModule.sessions[sessionsId] = e;
			} else {
				if(SessionsModule.removeSession) SessionsModule.removeSession(sessionsId);
				delete(SessionsModule.sessions[sessionsId]);
			}
		});
	});
};

SessionsModule.addHost = function(hostId) {
	var appHost = app.hosts[hostId];
	appHost.request({
		cmd: "sessions"
	}, function(response) {
		var cdate = Date.now();
		$.forEach(response.data.sessions, function(e) {
			var sessionsId = hostId + "/" + e.client_id;

			e.host = hostId;
			e.sdate = new Date(cdate - e.uptime * 1000);

			SessionsModule.sessions[sessionsId] = e;
			if(SessionsModule.addSession) SessionsModule.addSession(e);
		});
	});
};

SessionsModule.removeHost = function(hostId) {
	$.forEach(SessionsModule.sessions, function(s, i) {
		if(s.host == hostId) {
			if(SessionsModule.removeSession) SessionsModule.removeSession(i);
			delete(SessionsModule.sessions[i]);
		}
	})
};

SessionsModule.render = function() {
	var object = app.renderInit();

	var orderString = function(a, b) {
		var ca = a.textContent;
		var cb = b.textContent;
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
					.setText("Server")
					.setStyle("width", "200px")
					.dataOrder(orderString),
				$.element("th")
					.setText("Stream")
					.dataOrder(orderString, true),
				$.element("th")
					.setText("IP")
					.setStyle("width", "150px")
					.dataOrder(orderNumber),
				$.element("th")
					.setText("Login")
					.setStyle("width", "150px")
					.dataOrder(orderString),
				$.element("th")
					.setText("Uptime (min)")
					.setStyle("width", "150px")
					.dataOrder(orderNumber),
				$.element("th")
					.setStyle("width", "32px")));

	var sessionsTotalValue = 0;
	var sessionsTotal = $.element("span");
	var footer = $.element("tfoot")
		.addChild($.element("tr")
			.addChild(
				$.element("th")
					.addChild("Sessions: ", sessionsTotal)));

	var content = $.element("tbody");
	content.nodes = {};

	var table = $.element("table")
		.addClass("table hover")
		.addChild(header, content, footer);
	object.addChild(table);

	$.tableInit(table);

	SessionsModule.addSession = function(s) {
		sessionsTotal.setText(++ sessionsTotalValue);
		var uptime = $.element("td")
			.addAttr("data-value", s.uptime);

		var hostName = app.hosts[s.host].name;

		var row = $.element("tr")
			.addChild(
				$.element("td")
					.addAttr("data-value", hostName)
					.setText(hostName),
				$.element("td")
					.setText(s.channel_name),
				$.element("td")
					.addAttr("data-value", ip2num(s.addr))
					.setText(s.addr),
				$.element("td")
					.addChild((s.login != undefined) ? $.element("a")
						.setText(s.login)
						.on("click", function(event) {
							event.preventDefault();
							SettingsUsersModule.openConfig(s.login);
						}) : ""),
				uptime,
				$.element("td")
					.addClass("action")
					.addChild($.element.button()
						.addClass("icon icon-close")
						.on("click", function() {
							app.hosts[s.host].request({ cmd: "close-session", id: s.client_id });
						})));

		row.refreshUptime = function() {
			var c = Date.now(),
				u = c - s.sdate,
				d = Math.round(u / 60000),
				m = d % 60,
				h = Math.floor(d / 60);
			if(m < 10) m = "0" + m;
			uptime
				.addAttr("data-value", u)
				.setText(h + ":" + m);
		};

		row.refreshUptime();

		content.nodes[s.host + "/" + s.client_id] = row;
		$.tableSortInsert(table, row);
	};

	SessionsModule.removeSession = function(id) {
		sessionsTotal.setText(-- sessionsTotalValue);
		if(content.nodes[id]) {
			content.nodes[id].remove();
			delete(content.nodes[id]);
		}
	};

	$.forEach(SessionsModule.sessions, function(e) {
		SessionsModule.addSession(e)
	});

	var refresh = setInterval(function() {
		$.forEach(content.nodes, function(r) {
			r.refreshUptime();
		});
	}, 10000);

	self.on("destroy", function() {
		clearInterval(refresh);

		content.empty();
		content.nodes = {};

		delete(SessionsModule.addSession);
		delete(SessionsModule.removeSession);
	});
};

SessionsModule.init = function() {
	$.body.bindScope(SessionsModule.render, {});
};

app.modules.push(SessionsModule);
app.menu.push(SessionsModule);
})();
