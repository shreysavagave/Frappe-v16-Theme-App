import frappe

from themora.install import seed_defaults


def execute():
	# v0.2: "Kept per User" added; "Shown in the Panel" default lowered from 15 to 10.
	if frappe.db.get_single_value("Themora Settings", "recent_documents_limit") == 15:
		frappe.db.set_single_value("Themora Settings", "recent_documents_limit", 10, update_modified=False)
	seed_defaults()
