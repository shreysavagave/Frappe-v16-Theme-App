import frappe

from themora.theme import DOCTYPE


def after_install():
	"""Store the field defaults so the settings form opens pre-filled."""
	settings = frappe.get_single(DOCTYPE)
	for df in settings.meta.fields:
		if df.default is not None and settings.get(df.fieldname) in (None, ""):
			settings.set(df.fieldname, df.default)
	settings.flags.ignore_mandatory = True
	settings.save(ignore_permissions=True)
