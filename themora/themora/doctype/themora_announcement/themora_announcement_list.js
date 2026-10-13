frappe.listview_settings["Themora Announcement"] = {
	add_fields: ["enabled", "start", "end"],
	get_indicator(doc) {
		const now = frappe.datetime.now_datetime();
		if (!doc.enabled) return [__("Disabled"), "gray", "enabled,=,0"];
		if (doc.end && doc.end <= now) return [__("Ended"), "gray", "enabled,=,1"];
		if (doc.start && doc.start > now) return [__("Scheduled"), "blue", "enabled,=,1"];
		return [__("Live"), "green", "enabled,=,1"];
	},
};
