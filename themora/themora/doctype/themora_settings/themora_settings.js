// Themora Settings: live preview of the navbar / sidebar / button colors, a
// one-click reset for the color fields, and a reload after saving so the new
// theme stylesheet is applied.

const THEMORA_COLOR_DEFAULTS = {
	primary_color: "#40C09C",
	button_text_color: "",
	neutral_tint: "Brand Tinted",
	login_background: "",
	navbar_style: "Gradient",
	gradient_start: "#62D16B",
	gradient_end: "#40C09C",
	navbar_text_color: "#FFFFFF",
};

const PREVIEW_FIELDS = [
	...Object.keys(THEMORA_COLOR_DEFAULTS),
	"brand_name",
	"show_brand_name",
	"brand_logo",
	"show_brand_logo",
	"corner_style",
];

frappe.ui.form.on("Themora Settings", {
	refresh(frm) {
		frm.add_custom_button(__("Reset Colors"), () => {
			frappe.confirm(__("Reset all color settings to the Themora defaults?"), () => {
				frm.set_value(THEMORA_COLOR_DEFAULTS);
			});
		});
		frm.add_custom_button(__("Announcements"), () => frappe.set_route("List", "Themora Announcement"));
		themora_render_preview(frm);
	},

	after_save() {
		frappe.show_alert({ message: __("Theme saved. Reloading…"), indicator: "green" });
		setTimeout(() => window.location.reload(), 600);
	},

	...Object.fromEntries(PREVIEW_FIELDS.map((f) => [f, (frm) => themora_render_preview(frm)])),
});

function themora_on_color(hex) {
	// Same rule as themora/theme.py: white or near-black, whichever contrasts more.
	const lum = (c) => {
		const v = parseInt(c, 16) / 255;
		return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	};
	const h = (hex || "#40C09C").replace("#", "");
	const L = 0.2126 * lum(h.slice(0, 2)) + 0.7152 * lum(h.slice(2, 4)) + 0.0722 * lum(h.slice(4, 6));
	const on_white = 1.05 / (L + 0.05);
	const on_dark = (L + 0.05) / 0.059; // #0F1A17 has a luminance of ~0.009
	return on_white >= on_dark ? "#FFFFFF" : "#0F1A17";
}

function themora_render_preview(frm) {
	const field = frm.get_field("color_preview");
	if (!field) return;

	const d = frm.doc;
	const esc = frappe.utils.escape_html;
	const start = d.gradient_start || THEMORA_COLOR_DEFAULTS.gradient_start;
	const end = d.navbar_style === "Solid" ? start : d.gradient_end || THEMORA_COLOR_DEFAULTS.gradient_end;
	const text = d.navbar_text_color || THEMORA_COLOR_DEFAULTS.navbar_text_color;
	const primary = d.primary_color || THEMORA_COLOR_DEFAULTS.primary_color;
	const on_primary = d.button_text_color || themora_on_color(primary);
	const radius = { Sharp: 4, Default: 8, Rounded: 12 }[d.corner_style] ?? 8;

	const name = d.show_brand_name ? esc(d.brand_name || "") : "";
	const logo = d.show_brand_logo && d.brand_logo
		? `<img src="${esc(d.brand_logo)}" alt="" style="width:22px;height:22px;object-fit:contain">`
		: "";
	const cobrand = name || logo
		? `<span style="display:inline-flex;align-items:center;gap:8px;padding-left:12px;border-left:1px solid ${text}73;font-weight:700">${logo}${name}</span>`
		: `<span style="opacity:.7">${__("Set a Brand Name or Logo")}</span>`;

	field.$wrapper.html(`
		<div style="border:1px solid var(--border-color);border-radius:12px;overflow:hidden;max-width:640px">
			<div style="display:flex;align-items:center;gap:12px;height:48px;padding:0 16px;
				background:linear-gradient(90deg, ${end}, ${start});color:${text}">
				<span style="font-weight:700">${__("App")}</span>${cobrand}
				<span style="margin-left:auto;padding:4px 12px;border-radius:${radius}px;
					background:${text}29;box-shadow:inset 0 0 0 1px ${text}61">${__("Search")}</span>
			</div>
			<div style="display:flex;gap:16px;padding:16px;background:var(--bg-color)">
				<div style="width:160px">
					<div style="padding:6px 10px;border-radius:${radius}px;font-weight:600;
						background:linear-gradient(135deg, ${start}, ${end});color:${text}">${__("Active item")}</div>
					<div style="padding:6px 10px;color:var(--text-muted)">${__("Sidebar item")}</div>
				</div>
				<div style="display:flex;align-items:flex-start;gap:8px">
					<button type="button" class="btn btn-sm" style="background:${primary};color:${on_primary};
						font-weight:600;border-radius:${radius}px">${__("Primary")}</button>
					<button type="button" class="btn btn-sm btn-default" style="border-radius:${radius}px">${__("Default")}</button>
				</div>
			</div>
		</div>
	`);
}
