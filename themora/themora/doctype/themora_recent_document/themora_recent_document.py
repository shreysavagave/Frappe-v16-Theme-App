from frappe.model.document import Document


class ThemoraRecentDocument(Document):
	"""One row per (user, document). Written only by themora.recent."""
