/*
 * PonyJS
 * (c) 2016-2017 Andrey Dyldin <and@cesbo.com>
 * License: MIT
 */

(function() {
"use strict";

window.$ = function(x) {
	if(typeof(x) === "string") {
		return document.querySelectorAll(x);
	} else if(typeof(x) === "function") {
		document.addEventListener("DOMContentLoaded", function w() {
			document.removeEventListener("DOMContentLoaded", w, false);
			x();
		});
	}
};

String.prototype.toUpperCaseFirst = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

if(!String.prototype.format) String.prototype.format = function() {
	var args = arguments;
	return this.replace(/{(\d+)}/g, function(match, number) {
		return typeof args[number] != 'undefined' ? args[number] : match;
	});
};


if(!String.prototype.trim) String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/gm,'');
};


Array.prototype.find = function(fn) {
	for(var i = 0, l = this.length; i < l; ++i) {
		var x = this[i];
		if(fn(x)) return x;
	}
	return undefined
};

Array.prototype.move = function(src, dst) {
	var e = this.splice(src, 1)[0];
	this.splice(dst, 0, e);
};

Array.prototype.insertSorted = function(item, fn) {
	var l = 0, h = this.length, m;
	while(l < h) {
		m = (l + h) >>> 1;
		if(fn(this[m], item) < 0) l = m + 1;
		else h = m;
	}
	this.splice(l, 0, item);
};

Element.prototype.remove = function() {
	this.parentNode.removeChild(this)
};

Element.prototype.empty = function() {
	while(this.firstChild) this.removeChild(this.firstChild);
	return this
};

Element.prototype.addClass = function() {
	var clist = (!!this.className) ? this.className.split(/ +/) : [];
	for(var i = 0; i < arguments.length; i++) {
		var n = arguments[i];
		if(!n) continue;
		n = n.split(/ +/);
		while(n.length) {
			var c = n.shift();
			if(clist.indexOf(c) == -1) clist.push(c);
		}
	}
	this.className = clist.join(" ");
	return this;
};

Element.prototype.removeClass = function() {
	var clist = (!!this.className) ? this.className.split(/ +/) : [];
	for(var i = 0; i < arguments.length; i++) {
		var n = arguments[i];
		if(!n) continue;
		n = n.split(/ +/);
		while(n.length) {
			var c = n.shift();
			var j = clist.indexOf(c);
			if(j != -1) clist.splice(j, 1);
		}
	}
	this.className = clist.join(" ");
	return this;
};

Element.prototype.hasClass = function(c) {
	var clist = this.className.split(/ +/);
	return clist.indexOf(c) != -1;
};

Element.prototype.addAttr = function(key, value) {
	if(value == undefined) value = "";
	this.setAttribute(key, value);
	return this;
};

Element.prototype.removeAttr = function(key) {
	this.removeAttribute(key);
	return this;
};

Element.prototype.setValue = function(value) {
	if(value) this.addAttr("value", value)
	else this.removeAttr("value");
	return this
};

Element.prototype.setText = function(text) {
	this.textContent = text;
	return this
};

Element.prototype.setHtml = function(html) {
	this.innerHTML = html;
	return this
};

Element.prototype.setReadonly = function(value) {
	return this[(!!value) ? "addAttr" : "removeAttr"]("readonly")
};

Element.prototype.setDisabled = function(value) {
	return this[(!!value) ? "addAttr" : "removeAttr"]("disabled")
};

Element.prototype.setRequired = function(value) {
	return this[(!!value) ? "addAttr" : "removeAttr"]("required")
};

Element.prototype.setError = function(value) {
	return this[(!!value) ? "addClass" : "removeClass"]("error")
};

Element.prototype.setStyle = function(key, value) {
	var x = key.split("-");
	key = x.shift();
	while(x.length) key += x.shift().toUpperCaseFirst();
	this.style[key] = value;
	return this
};

Element.prototype.addValidator = function(fn) {
	if(this.$validate == undefined) this.$validate = [];
	this.$validate.push(fn);
	return this
};

Element.prototype.addChild = function() {
	for(var i = 0; i < arguments.length; ++i) {
		var child = arguments[i];
		if(child) {
			if(child.nodeName == undefined) child = document.createTextNode(child);
			this.appendChild(child);
		}
	}
	return this
};

Element.prototype.insertChild = function(child, before) {
	if(child) {
		if(child.nodeName == undefined) child = document.createTextNode(child);
		this.insertBefore(child, before || this.firstChild);
	}
	return this
};

Element.prototype.insertSorted = function(child, fn) {
	var l = 0, h = this.childNodes.length, m;
	while(l < h) {
		m = (l + h) >>> 1;
		if(fn(this.childNodes[m], child) < 0) l = m + 1;
		else h = m;
	}
	if(l == this.childNodes.length) this.addChild(child);
	else this.insertChild(child, this.childNodes[l]);
	return this
};

Element.prototype.dataBind = function(key) {
	if(key) this.addAttr("data-bind", key);
	return this
};

var eventOn = function(event, fn) {
	if(!this.eventBind) this.eventBind = {};
	var eb = this.eventBind[event];
	if(!eb) {
		this.eventBind[event] = eb = {
			list: [],
			fn: function() {
				for(var i = 0; i < eb.list.length; i++)
					eb.list[i].apply(this, arguments);
			},
		};
		this.addEventListener(event, eb.fn);
	}
	eb.list.push(fn);
	return this;
};

var eventOff = function(event, fn) {
	var eb = (!!this.eventBind) ? this.eventBind[event] : null;
	if(eb) {
		if(!!fn) {
			var x = eb.list.indexOf(fn);
			if(x != -1) eb.list.splice(x, 1);
			if(!eb.list.length) fn = undefined;
		}
		if(!fn) {
			this.removeEventListener(event, eb.fn);
			delete(this.eventBind[event])
		}
	}
	return this;
};

var eventEmit = function(event) {
	var eb = (!!this.eventBind) ? this.eventBind[event] : null;
	if(eb) {
		eb.fn.apply(this, Array.prototype.slice.call(arguments, 1));
	}
	return this;
};

Element.prototype.on = eventOn;
Element.prototype.off = eventOff;
Element.prototype.emit = eventEmit;
window.on = eventOn;
window.off = eventOff;
window.emit = eventEmit;
document.on = eventOn;
document.off = eventOff;
document.emit = eventEmit;

$.html = document.querySelector("html");
$.head = document.querySelector("head");
$.body = document.querySelector("body");

$.nop = function() {};

$.element = function(t) {
	return document.createElement(t || "div")
};

$.element.button = function(text) {
	return $.element("button")
		.addAttr("type", "button")
		.addClass("button")
		.setText(text || "");
};

$.element.a = function(href, text) {
	return $.element("a")
		.addAttr("href", href)
		.setText(text || "");
};

$.element.input = function(placeholder, type) {
	return $.element("input")
		.addAttr("type", type || "text")
		.addClass("input")
		.addAttr("placeholder", placeholder);
};

$.element.select = function(items) {
	var x = $.element("select").addClass("input");
	var makeItems = function(p, x) {
		for(var i = 0; i < x.length; i++) {
			var e, o = x[i];
			if(o.hide) continue;
			if(o.group) {
				if(!o.items.length) continue;
				e = $.element("optgroup")
					.addAttr("label", o.group);
				makeItems(e, o.items);
			} else {
				e = $.element("option")
					.addAttr("value", o.value)
					.setText(o.label || o.value);
			}
			if(o.disabled) e.setDisabled(true);
			p.addChild(e);
		}
	};
	makeItems(x, items);
	return x;
};

$.element.checkbox = function(label) {
	var x = $.element("input")
		.addAttr("type", "checkbox");
	var z = $.element("label")
		.addClass("checkbox")
		.addChild(x)
		.addChild($.element("span")
			.addClass("inner"))
		.addChild($.element("span")
			.addClass("text")
			.setHtml(label || ""));
	z.checkbox = x;
	z.dataBind = function(key) {
		x.dataBind(key);
	};
	return z;
};

$.element.script = function(src) {
	return $.element("script")
		.addAttr("type", "text/javascript")
		.addAttr("src", src);
};

$.isArray = function(v) {
	return (!!v) && (v.length != undefined) && (v.constructor == Array || v.constructor == NodeList);
};

$.isObject = function(v) {
	return v === Object(v) && $.isArray(v) == false;
};

$.isObjectEmpty = function(v) {
	for(var k in v) { if(v.hasOwnProperty(k)) return false; }
	return true;
};

$.clone = function(v) {
	if($.isArray(v)) return v.slice();
	if($.isObject(v)) return JSON.parse(JSON.stringify(v));
	return v;
};

$.forEach = function(v, fn) {
	if(!v) {
		//
	} else if($.isArray(v)) {
		for(var k = 0, l = v.length; k < l; k++) {
			var x = fn(v[k], k);
			if(x != undefined) return x;
		}
	} else if($.isObject(v)) {
		for(var k in v) {
			var x = fn(v[k], k);
			if(x != undefined) return x;
		}
	}
};

$.http = function(config, onLoad, onError) {
	var u = config.url,
		m = config.method || "GET";

	if(u.match(/^\/\//)) u = location.protocol + u;

	var x = new XMLHttpRequest();
	if(!u.match(/^[a-z]+:\/\//)) {
		x.open(m, u);
	} else if("withCredentials" in x) {
		x.open(m, u, true);
	} else if("XDomainRequest" in window) {
		x = new XDomainRequest();
		x.open(m, u);
	} else {
		throw new Error("CORS not supported");
	}

	$.forEach(config.headers, function(v, k) {
		x.setRequestHeader(k, v)
	});

	var response = function() {
		var fn = (x.status == 200) ? onLoad : onError;
		if(fn) fn({
			text: x.responseText,
			status: x.status,
			statusText: x.statusText
		})
	};

	x.addEventListener("load", response);
	x.addEventListener("error", response);

	x.send(config.data);
};

function Cookie() {
	var data = {};

	$.forEach(document.cookie.split(/; +/), function(kv) {
		if(kv != "") {
			kv = kv.split("=");
			data[kv[0]] = decodeURIComponent(kv[1]);
		}
	});

	this.get = function(key) {
		return data[key] || undefined;
	};

	this.set = function(key, value, expires) {
		var x = key + "=";
		if(value != undefined) {
			data[key] = value;
			x += encodeURIComponent(value);
		} else {
			delete(data[key]);
			expires = -1;
		}
		if(expires != undefined) x += "; expires=" + (new Date((expires == -1) ? (946684801000) : (Date.now() + Math.round(expires * 86400000)))).toUTCString();
		document.cookie = x;
	};

	this.getObject = function(key) {
		var x = this.get(key);
		if(x) x = JSON.parse(x);
		return x;
	};

	this.setObject = function(key, value) {
		if(value) value = JSON.stringify(value);
		this.set(key, value);
	};
}

$.cookie = new Cookie();

var msgFloat = null;

$.msg = function(config) {
	if(!msgFloat) {
		msgFloat = $.element("div").addClass("alert-float");
		$.body.addChild(msgFloat);
	}
	var c, t,
		x = $.element("div").addClass("alert alert-" + (config.type || "info")),
		d = config.delay || 3;
	if(config.title) x.addChild($.element("strong").addClass("alert-title").setText(config.title));
	if(config.text) x.addChild(c = $.element("p").addClass("alert-text").setText(config.text.format(d)));
	x.remove = function() {
		if(t) clearInterval(t);
		Element.prototype.remove.call(this);
		x.emit("remove");
	};
	if(d > 0) {
		t = setInterval(function() {
			d--;
			if(!d) x.remove();
			else if(c) c.setText(config.text.format(d));
		}, 1000);
	}

	msgFloat.addChild(x);
	return x;
};

$.err = function(config) {
	config.type = "error";
	return $.msg(config);
};

var modalStack = [];

$.modal = function() {
	if(!modalStack.length) {
		var backdrop = $.element("div").addClass("modal-backdrop");
		$.body.addChild(backdrop);
		$.body.addClass("modal-open");
		modalStack.push(backdrop);
	}

	var m = $.element("div")
		.addClass("modal")
		.on("click", function(event) {
			event.stopPropagation()
		});

	var w = $.element("div")
		.addClass("modal-wrap")
		.addChild(m);

	if(modalStack.length > 1) modalStack[modalStack.length - 1].addClass("hide");
	modalStack.push(w);

	$.body.addChild(w);

	var remove = function(e) {
		modalStack.splice(modalStack.length - 1, 1);
		var n = modalStack[modalStack.length - 1];
		if(modalStack.length > 1) {
			n.removeClass("hide");
		} else {
			$.body.removeClass("modal-open");
			n.remove();
			modalStack.splice(0, 1);
		}
		m.parentNode.remove();
		m.emit(e);
	};

	m.set = function(k, v) {
		if(v == undefined) delete(m[k]);
		else m[k] = v;
		return m;
	};

	m.remove = function() {
		remove("remove");
	};

	m.submit = function() {
		remove("submit");
	};

	return m
};

Element.prototype.bindScope = function(render, data) {
	var self = this,
		args = Array.prototype.slice.call(arguments, 2);

	if(!$.isObject(data)) {
		console.warn("bindScope() argument #2 object expected");
		data = {};
	}

	if(self.scope) self.scope.destroy();

	var dataErrors = {};

	var dataValidate = function() {
		var e = this,
			r = false;
		$.forEach(e.$validate, function(fn) {
			if(!fn.call(e, e.value)) r = true;
		});
		if(e.$error != r) {
			e.setError(r);
			e.$error = r;
			if(r) dataErrors[e.dataset.bind] = true;
			else delete(dataErrors[e.dataset.bind]);
		}
	};

	var setDataBind = function(e, t) {
		var key = e.dataset.bind;
		if(!self.scope.map[key]) self.scope.map[key] = [];
		self.scope.map[key].push(e);

		e.addAttr("name", e.dataset.bind);

		switch(t) {
			case "text":
			case "password":
			case "textarea":
			case "number":
				e.bindEvent = "input";
				e.bindSetValue = function(val) { this.value = (val !== undefined) ? val : "" };
				e.bindGetValue = function() { return (this.value !== "") ? this.value : undefined };
				break;
			case "hidden":
				e.bindSetValue = function(val) { this.value = (val !== undefined) ? val : "" };
				break;
			case "select":
				e.bindEvent = "change";
				e.bindSetValue = function(val) { this.value = (val !== undefined) ? val : "" };
				e.bindGetValue = function() { return (this.value !== "") ? this.value : undefined };
				break;
			case "checkbox":
				var x = function(v) {
					var s = v.toString();
					if(!e.dataset.hasOwnProperty(s)) return v;
					v = e.dataset[s];
					switch(v)
					{
						case "true": return true;
						case "false": return false;
						case "undefined": return undefined;
						default: return v;
					}
				};
				e.value_map = {};
				e.value_map[true] = x(true);
				e.value_map[false] = x(false);

				e.bindEvent = "change";
				e.bindSetValue = function(val) { this.checked = this.value_map[true] === val };
				e.bindGetValue = function() { return this.value_map[this.checked] };
				break;
			case "radio":
				e.bindEvent = "change";
				e.bindSetValue = function(val) { this.checked = (this.value === val) };
				e.bindGetValue = function() { return this.value };
				break;
		}
		e.bindSetValue(self.scope.get(key));
		if(e.bindEvent) {
			e.on(e.bindEvent, function() {
				var x = this.bindSetValue;
				this.bindSetValue = $.nop;
				self.scope.set(this.dataset.bind, this.bindGetValue());
				this.bindSetValue = x;
				if(this.$validate) dataValidate.call(this);
			});
			var x = e.eventBind[e.bindEvent].list;
			if(x.length > 1) x.move(x.length - 1, 0);
		}
		if(e.$validate) dataValidate.call(e);
	};

	var setDataValue = function(e) {
		var key = e.dataset.bind;
		if(!self.scope.map[key]) self.scope.map[key] = [];
		self.scope.map[key].push(e);
		e.scope = self;

		e.bindSetValue = function(val) { this.textContent = (val !== undefined) ? val : "" };
		e.bindSetValue(self.scope.get(key));
	};

	var bind = function() {
		render.apply(self, args);

		var el = self.querySelectorAll("*[data-bind]");
		for(var i = 0; i < el.length; ++i) {
			var e = el[i];
			switch(e.tagName) {
				case "INPUT":
					setDataBind(e, e.type);
					break;
				case "TEXTAREA":
					setDataBind(e, "textarea");
					break;
				case "SELECT":
					setDataBind(e, "select");
					break;
				default:
					setDataValue(e);
					break;
			}
		}
	};

	self.scope = {};

	var scopeClear = function() {
		self.scope.map = {};
		self.scope.events = {};
		self.empty();
		dataErrors = {};
	};

	self.scope.reset = function(scopeData) {
		if(scopeData) data = scopeData;
		scopeClear();
		bind();
		self.emit("ready").off("ready");
	};

	self.scope.destroy = function() {
		self.emit("destroy").off("destroy");
		scopeClear();
		delete(self.scope);
	};

	self.scope.set = function(key, value) {
		var dst = data;
		var k = key.match(/(\\\.|[^\.])+/g);
		while(k.length > 1) {
			var sk = k.shift().replace(/\\\./g, ".");
			if(dst[sk] == undefined) dst[sk] = {};
			dst = dst[sk];
		}
		k = k[0].replace(/\\\./g, ".");
		if(value != undefined) {
			dst[k] = value;
		} else {
			value = "";
			delete(dst[k]);
		}

		/* syncScope */
		$.forEach(self.scope.map[key], function(e) {
			e.bindSetValue(value);
			if(e.dataset.validate) validateAction.call(e);
		});
	};

	self.scope.get = function(key) {
		var src = data;
		var k = key.match(/(\\\.|[^\.])+/g);
		while(k.length > 1) {
			var sk = k.shift().replace(/\\\./g, ".");
			src = src[sk];
			if(src == undefined) return undefined;
		}
		k = k[0].replace(/\\\./g, ".");
		return src[k];
	};

	self.scope.validate = function() {
		return $.isObjectEmpty(dataErrors);
	};

	self.scope.serialize = function() {
		var x = $.clone(data);
		$.forEach(x, function(v, k) {
			if(k.charAt(0) == "$") delete(x[k]);
		});
		return x;
	};

	setTimeout(function() { self.scope.reset() });
	return self
};

/* TABLE */

Element.prototype.dataOrder = function(fn, def) {
	this.addAttr("data-order", (def) ? 1 : 0);
	this.$order = fn;
	return this
};

$.tableInit = function(table) {
	var i,
		thead = table.querySelector("thead").firstChild,
		tbody = table.querySelector("tbody");

	table.$orderId = -1;

	var reorder = function() {
		var x = thead.cells[table.$orderId];
		var a = new Array();
		for(i = 0; i < tbody.rows.length; ++i) a[i] = tbody.rows[i];
		a.sort(function(a, b) {
			return x.$order(a.cells[table.$orderId], b.cells[table.$orderId]) * x.dataset.order;
		});
		while(a.length) tbody.appendChild(a.shift());
	};

	for(i = 0; i < thead.cells.length; ++i) {
		var e = thead.cells[i];
		if(e.dataset.order != undefined) {
			if(table.$orderId == -1 || e.dataset.order != 0) table.$orderId = i;
			e.$orderId = i;
			e.on("click", function() {
				if(table.$orderId == this.$orderId) {
					thead.cells[table.$orderId].dataset.order *= -1;
				} else {
					thead.cells[table.$orderId].dataset.order = 0;
					table.$orderId = this.$orderId;
					thead.cells[table.$orderId].dataset.order = 1;
				}
				reorder();
			});
		}
	}

	reorder();
};

$.tableSortInsert = function(table, row) {
	var thead = table.querySelector("thead").firstChild;
	var tbody = table.querySelector("tbody");

	var x = thead.cells[table.$orderId];
	var r = row.cells[table.$orderId];

	var l = 0, m = tbody.rows.length;
	while(l < m) {
		var mid = (l + m) >>> 1;
		if(x.$order(tbody.rows[mid].cells[table.$orderId], r) * x.dataset.order < 0) l = mid + 1;
		else m = mid;
	}

	if(l == tbody.rows.length) tbody.appendChild(row);
	else tbody.insertBefore(row, tbody.rows[l]);
};

$.tableFilter = function(table, filter) {
	for(var i = 0; i < table.rows.length; ++i) {
		var row = table.rows[i];
		row.removeClass("hide");
		if(filter) {
			var hide = true;
			for(var j = 0; j < row.cells.length; ++j) {
				var cell = row.cells[j].innerHTML;
				if(cell.toLowerCase().indexOf(filter) != -1) {
					hide = false;
					break;
				}
			}
			if(hide) row.addClass("hide");
		}
	}
};

/* BASE64 */

var utf8 = {
	encode: function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
		for(var i = 0; i < string.length; i++) {
			var c = string.charCodeAt(i);
			if(c < 128) {
				utftext += String.fromCharCode(c);
			} else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			} else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
		}
		return utftext;
	},
	decode: function (utftext) {
		var string = "";
		for(var i = 0; i < utftext.length; ) {
			var c = utftext.charCodeAt(i);
			if(c < 128) {
				string += String.fromCharCode(c);
				i++;
			} else if((c > 191) && (c < 224)) {
				string += String.fromCharCode(((c & 31) << 6) |
					(utftext.charCodeAt(i+1) & 63));
				i += 2;
			} else {
				string += String.fromCharCode(((c & 15) << 12) |
					((utftext.charCodeAt(i+1) & 63) << 6) |
					(utftext.charCodeAt(i+2) & 63));
				i += 3;
			}
		}
		return string;
	},
}

$.base64Decode = function(text) {
	return utf8.decode(atob(text))
};

$.base64Encode = function(text) {
	return btoa(utf8.encode(text))
};

})();
