import frappe

from themora.theme import DOCTYPE


def after_install():
	seed_defaults()


def seed_defaults():
	"""Store field defaults for Themora Settings fields that have never been saved.

	Fresh installs get every default; on upgrades, only fields added since the
	last save are filled in (an unsaved Check reads as 0, not as its default).
	"""
	singles = frappe.qb.DocType("Singles")
	stored = set(
		frappe.qb.from_(singles).select(singles.field).where(singles.doctype == DOCTYPE).run(pluck=True)
	)
	meta = frappe.get_meta(DOCTYPE)
	for df in meta.fields:
		if df.default is not None and df.fieldname not in stored:
			frappe.db.set_single_value(DOCTYPE, df.fieldname, df.default, update_modified=False)
	frappe.clear_document_cache(DOCTYPE, DOCTYPE)
