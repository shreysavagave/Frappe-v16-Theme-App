import frappe
from frappe import _
from frappe.model.document import Document

from themora import theme

COLOR_FIELDS = (
	"primary_color",
	"button_text_color",
	"login_background",
	"gradient_start",
	"gradient_end",
	"navbar_text_color",
)

# Themora field → [(Frappe Single, field), …]. Pushed only when the Themora
# field changes, so edits made directly in those settings are not overwritten.
SYNCED_FIELDS = {
	"app_title": [("Website Settings", "app_name")],
	"app_logo": [("Website Settings", "app_logo"), ("Navbar Settings", "app_logo")],
	"favicon": [("Website Settings", "favicon")],
	"splash_image": [("Website Settings", "splash_image")],
}


class ThemoraSettings(Document):
	def validate(self):
		for fieldname in COLOR_FIELDS:
			value = self.get(fieldname)
			if not value:
				continue
			try:
				self.set(fieldname, theme.normalize_hex(value).upper())
			except ValueError:
				frappe.throw(
					_("{0} must be a hex color like #40C09C").format(_(self.meta.get_label(fieldname)))
				)

		self.warn_low_contrast()

		if self.recent_documents_limit is not None:
			self.recent_documents_limit = max(5, min(self.recent_documents_limit, 30))

	def warn_low_contrast(self):
		text = self.navbar_text_color or theme.DEFAULTS["navbar_text_color"]
		backgrounds = [self.gradient_start or theme.DEFAULTS["gradient_start"]]
		if self.navbar_style != "Solid":
			backgrounds.append(self.gradient_end or theme.DEFAULTS["gradient_end"])

		worst = min(theme.contrast(text, bg) for bg in backgrounds)
		if worst < 3:
			frappe.msgprint(
				_(
					"Navbar text has a contrast of only {0}:1 against the navbar color. "
					"At least 3:1 is recommended for icons and bold text, 4.5:1 for small text."
				).format(round(worst, 1)),
				title=_("Low Contrast"),
				indicator="orange",
			)

	def on_update(self):
		self.sync_frappe_settings()
		# Drops the theme CSS (via the clear_cache hook), boot info and website pages.
		frappe.clear_cache()

	def sync_frappe_settings(self):
		for fieldname, targets in SYNCED_FIELDS.items():
			if not self.has_value_changed(fieldname):
				continue
			for doctype, target in targets:
				frappe.db.set_single_value(doctype, target, self.get(fieldname) or None)
