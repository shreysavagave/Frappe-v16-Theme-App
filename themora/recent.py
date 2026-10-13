"""Recent documents: the Desk navbar's clock menu (themora.bundle.js).

Frappe's own Route History skips form routes, so Themora keeps one row per
(user, document) in Themora Recent Document, named by a hash of the pair so an
open is a cheap upsert.

Storage is bounded: each user keeps at most "Kept per User" rows (Themora
Settings, 10-100), trimmed whenever a new document is added and again by the
daily cleanup, which also drops rows of deleted / disabled users and rows not
opened for STALE_DAYS. Reads and trims use the (user, last_opened) index.
"""

import hashlib
from collections import defaultdict

import frappe
from frappe import _
from frappe.query_builder.functions import Count
from frappe.utils import add_days, cint, now_datetime

DOCTYPE = "Themora Recent Document"
STALE_DAYS = 90


def keep_per_user() -> int:
	from themora.theme import get_settings

	return max(10, min(cint(get_settings().recent_documents_keep) or 30, 100))


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

	# Looked up by reference, not by the hashed row name: when a document is
	# renamed Frappe updates reference_name, but the row keeps its old hash.
	existing = frappe.db.get_value(
		DOCTYPE, {"user": user, "reference_doctype": doctype, "reference_name": name}, "name"
	)
	if existing:
		table = frappe.qb.DocType(DOCTYPE)
		(
			frappe.qb.update(table)
			.set(table.last_opened, now_datetime())
			.set(table.open_count, table.open_count + 1)
			.where(table.name == existing)
		).run()
		return

	key = row_name(user, doctype, name)

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
		limit_start=keep_per_user(),
		limit_page_length=1000,
		pluck="name",
	)
	if stale:
		frappe.db.delete(DOCTYPE, {"name": ("in", stale)})


@frappe.whitelist()
def get() -> list[dict]:
	"""All of the session user's kept recent documents that still exist and are
	readable, newest first. The panel lists the first "Shown in the Panel" and
	searches all of them with its filter."""
	rows = frappe.get_all(
		DOCTYPE,
		filters={"user": frappe.session.user},
		fields=["name", "reference_doctype", "reference_name", "last_opened"],
		order_by="last_opened desc",
		limit_page_length=keep_per_user(),
	)

	# One query per document type for titles (and to see which still exist).
	by_doctype = defaultdict(list)
	for row in rows:
		by_doctype[row.reference_doctype].append(row.reference_name)

	titles = {}  # (doctype, name) -> title, only for documents that still exist
	for doctype, names in by_doctype.items():
		if not frappe.db.exists("DocType", doctype):
			continue
		meta = frappe.get_meta(doctype)
		title_field = meta.get_title_field()
		has_title = bool(title_field and title_field != "name" and meta.has_field(title_field))
		fields = ["name", title_field] if has_title else ["name"]
		for doc in frappe.get_all(doctype, filters={"name": ("in", names)}, fields=fields):
			titles[(doctype, doc.name)] = (doc.get(title_field) if has_title else None) or doc.name

	out, gone = [], []
	for row in rows:
		key = (row.reference_doctype, row.reference_name)
		if key not in titles:
			gone.append(row.name)  # deleted or renamed since it was opened
			continue
		if not frappe.has_permission(row.reference_doctype, "read", row.reference_name):
			continue
		out.append(
			{
				"doctype": row.reference_doctype,
				"doctype_label": _(row.reference_doctype),
				"name": row.reference_name,
				"title": str(titles[key]),
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


def daily_cleanup():
	"""Scheduler (daily): keep the table bounded however many users there are."""
	table = frappe.qb.DocType(DOCTYPE)
	user = frappe.qb.DocType("User")

	# Rows of deleted or disabled users.
	active = frappe.qb.from_(user).select(user.name).where(user.enabled == 1)
	frappe.qb.from_(table).delete().where(table.user.notin(active)).run()

	# Rows not opened for a long time.
	frappe.db.delete(DOCTYPE, {"last_opened": ("<", add_days(now_datetime(), -STALE_DAYS))})

	# Users over the limit, e.g. after "Kept per User" was lowered.
	keep = keep_per_user()
	over = (
		frappe.qb.from_(table)
		.select(table.user)
		.groupby(table.user)
		.having(Count(table.name) > keep)
		.run(pluck=True)
	)
	for name in over:
		prune(name)
