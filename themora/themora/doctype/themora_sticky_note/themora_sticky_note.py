import frappe
from frappe.model.document import Document


class ThemoraStickyNote(Document):
	"""One sticky note. Written only by themora.sticky_notes."""


def on_doctype_update():
	# Notes are always read for one user, and usually for one document.
	frappe.db.add_index("Themora Sticky Note", ["user", "reference_doctype", "reference_name"])
