(function() {
"use strict";

var SettingsThemeModule = {
	label: "Theme",
	order: 80,
};

SettingsThemeModule.click = function() {
	var modal = $.modal();
	var theme = app.getTheme() || "";
	modal.addClass("main-menu");
	$.forEach(app.themes, function(item) {
		var x = $.element("a")
			.setText(item.label)
			.addAttr("href", "#");
		if(theme == item.value) x.addClass("active");
		x.on("click", function(event) {
			event.preventDefault();
			modal.remove();
			app.setTheme(item.value)
		});
		modal.addChild(x);
	})
	modal.addChild($.element("hr"));
	modal.addChild($.element("a")
		.setText("Cancel")
		.addClass("text-center")
		.addAttr("href", "#/")
		.on("click", function(event) {
			event.preventDefault();
			modal.remove();
		}));
};

app.modules.push(SettingsThemeModule);
app.settings.push(SettingsThemeModule);
})();
