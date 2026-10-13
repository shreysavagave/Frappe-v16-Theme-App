"""Recent documents: the Desk navbar's clock menu (themora.bundle.js).

Frappe's own Route History skips form routes, so Themora keeps one row per
(user, document) in Themora Recent Document, named by a hash of the pair so an
open is a cheap upsert. Each user keeps at most KEEP_PER_USER rows.
"""

import hashlib

import frappe
from frappe import _
from frappe.utils import cint, now_datetime

DOCTYPE = "Themora Recent Document"
KEEP_PER_USER = 50
MAX_LIMIT = 30


def row_name(user: str, doctype: str, name: str) -> str:
	return hashlib.md5(f"{user}\0{doctype}\0{name}".encode()).hexdigest()


@frappe.whitelist(methods=["POST"])
def track(doctype: str, name: str):
	"""Record that the session user opened a document."""
	user = frappe.session.user
	if user == "Guest" or not doctype or not name:
		return
	meta = frappe.get_meta(doctype)
	# Child tables and settings pages (Singles) are not "documents" here.
	if meta.istable or meta.issingle or not frappe.has_permission(doctype, "read", name):
		return

	key = row_name(user, doctype, name)
	if frappe.db.exists(DOCTYPE, key):
		table = frappe.qb.DocType(DOCTYPE)
		(
			frappe.qb.update(table)
			.set(table.last_opened, now_datetime())
			.set(table.open_count, table.open_count + 1)
			.where(table.name == key)
		).run()
		return

	try:
		frappe.get_doc(
			{
				"doctype": DOCTYPE,
				"name": key,
				"user": user,
				"reference_doctype": doctype,
				"reference_name": name,
				"last_opened": now_datetime(),
				"open_count": 1,
			}
		).db_insert()
	except frappe.DuplicateEntryError:
		return  # opened twice at the same moment; the first insert counts

	prune(user)


def prune(user: str):
	stale = frappe.get_all(
		DOCTYPE,
		filters={"user": user},
		order_by="last_opened desc",
		limit_start=KEEP_PER_USER,
		limit_page_length=100,
		pluck="name",
	)
	if stale:
		frappe.db.delete(DOCTYPE, {"name": ("in", stale)})


@frappe.whitelist()
def get(limit: int = 15) -> list[dict]:
	"""The session user's recent documents that still exist and are readable."""
	limit = max(1, min(cint(limit) or 15, MAX_LIMIT))
	rows = frappe.get_all(
		DOCTYPE,
		filters={"user": frappe.session.user},
		fields=["name", "reference_doctype", "reference_name", "last_opened"],
		order_by="last_opened desc",
		limit_page_length=KEEP_PER_USER,
	)

	out, gone = [], []
	for row in rows:
		if len(out) >= limit:
			break
		doctype, name = row.reference_doctype, row.reference_name
		if not frappe.db.exists("DocType", doctype) or not frappe.db.exists(doctype, name):
			gone.append(row.name)  # deleted or renamed since it was opened
			continue
		if not frappe.has_permission(doctype, "read", name):
			continue

		meta = frappe.get_meta(doctype)
		title_field = meta.get_title_field()
		title = name
		if title_field and title_field != "name" and meta.has_field(title_field):
			title = frappe.db.get_value(doctype, name, title_field) or name

		out.append(
			{
				"doctype": doctype,
				"doctype_label": _(doctype),
				"name": name,
				"title": str(title),
				"last_opened": row.last_opened,
			}
		)

	if gone:
		frappe.db.delete(DOCTYPE, {"name": ("in", gone)})
	return out


@frappe.whitelist(methods=["POST"])
def clear():
	"""Forget the session user's recent documents."""
	frappe.db.delete(DOCTYPE, {"user": frappe.session.user})
