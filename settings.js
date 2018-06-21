(function() {
"use strict";

window.SettingsModule = {
	label: "Settings",
	order: 8,
};

SettingsModule.click = function() {
	var modal = $.modal();
	modal.addClass("main-menu");

	var makeItem = function(item) {
		modal.addChild($.element("a")
			.setText(item.label)
			.addAttr("href", item.link || "#")
			.on("click", function(event) {
				modal.remove();

				if(item.click) {
					event.preventDefault();
					item.click(event);
				}
			}));
	};

	var makeItems = function(items) {
		if(items) {
			$.forEach(items, makeItem);
			modal.addChild($.element("hr"));
		}
	};

	makeItems(app.settings);

	modal.addChild($.element("a")
		.setText("Cancel")
		.addClass("text-center")
		.addAttr("href", "#/")
		.on("click", function(event) {
			event.preventDefault();
			modal.remove();
		}));
};

app.modules.push(SettingsModule);
app.menu.push(SettingsModule);
})();
