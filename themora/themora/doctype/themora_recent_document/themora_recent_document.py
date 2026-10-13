import frappe
from frappe.model.document import Document


class ThemoraRecentDocument(Document):
	"""One row per (user, document). Written only by themora.recent."""


def on_doctype_update():
	# Every read, trim and cleanup filters by user and orders by last_opened.
	frappe.db.add_index("Themora Recent Document", ["user", "last_opened"])
