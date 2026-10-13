import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_datetime

from themora import announcements


class ThemoraAnnouncement(Document):
	def validate(self):
		if self.start and self.end and get_datetime(self.end) <= get_datetime(self.start):
			frappe.throw(_("Show Until must be after Show From"))
		if self.link_url and not announcements.is_safe_url(self.link_url):
			frappe.throw(_("Link URL must start with https://, http:// or /"))
		self.message = " ".join((self.message or "").split())  # one line

	def on_update(self):
		announcements.changed()

	def on_trash(self):
		announcements.changed()
