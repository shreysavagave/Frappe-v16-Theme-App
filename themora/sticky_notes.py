"""Sticky notes: the Notes panel of the Desk tools (sticky_notes.js).

Each note belongs to one user and is private to them. A note is either on a
document (reference_doctype / reference_name) or personal (no reference).
Pinned document notes open the panel by themselves when the document opens.

Everything goes through the whitelisted functions below, always for the
session user; the permission hooks keep the list view and REST API to the
user's own notes too, System Managers included.

Storage is bounded: at most "Max Notes per User" (Themora Settings, 20-500).
The daily cleanup drops notes of deleted / disabled users and notes whose
document was deleted (ignore_links_on_delete lets that delete go through).
"""

from collections import defaultdict

import frappe
from frappe import _
from frappe.utils import cint

DOCTYPE = "Themora Sticky Note"
COLORS = ("Yellow", "Pink", "Green", "Blue", "Purple")
MAX_LENGTH = 2000
FIELDS = ["name", "content", "color", "pinned", "reference_doctype", "reference_name", "modified"]


def max_per_user() -> int:
	from themora.theme import get_settings

	return max(20, min(cint(get_settings().sticky_notes_max) or 100, 500))


def check_reference(doctype: str | None, name: str | None):
	"""A note can only be put on a saved, readable, regular document."""
	if not doctype and not name:
		return
	if not doctype or not name or not frappe.db.exists("DocType", doctype):
		frappe.throw(_("Invalid document"))
	meta = frappe.get_meta(doctype)
	if meta.istable or meta.issingle or not frappe.db.exists(doctype, name):
		frappe.throw(_("Invalid document"))
	if not frappe.has_permission(doctype, "read", name):
		frappe.throw(_("Not permitted"), frappe.PermissionError)


def own_note(name: str):
	note = frappe.db.get_value(DOCTYPE, name, ["name", "user"], as_dict=True)
	if not note or note.user != frappe.session.user:
		frappe.throw(_("Note not found"), frappe.DoesNotExistError)
	return note


@frappe.whitelist()
def get(doctype: str | None = None, name: str | None = None) -> dict:
	"""The session user's notes on one document (if given) and personal notes."""
	user = frappe.session.user
	doc_notes = []
	if doctype and name and frappe.has_permission(doctype, "read", name):
		doc_notes = frappe.get_all(
			DOCTYPE,
			filters={"user": user, "reference_doctype": doctype, "reference_name": name},
			fields=FIELDS,
			order_by="pinned desc, creation asc",
		)
	personal = frappe.get_all(
		DOCTYPE,
		filters={"user": user, "reference_doctype": ("is", "not set")},
		fields=FIELDS,
		order_by="pinned desc, modified desc",
		limit_page_length=max_per_user(),
	)
	return {"doc": doc_notes, "personal": personal}


@frappe.whitelist(methods=["POST"])
def save(
	name: str | None = None,
	content: str | None = None,
	color: str | None = None,
	pinned: int | None = None,
	reference_doctype: str | None = None,
	reference_name: str | None = None,
) -> dict:
	"""Create a note (no name) or update one of the session user's notes.
	Only the fields passed are changed; the document of a note never changes."""
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	values = {}
	if content is not None:
		values["content"] = str(content)[:MAX_LENGTH]
	if color in COLORS:
		values["color"] = color
	if pinned is not None:
		values["pinned"] = 1 if cint(pinned) else 0

	if name:
		own_note(name)
		if values:
			frappe.db.set_value(DOCTYPE, name, values)
	else:
		check_reference(reference_doctype, reference_name)
		if frappe.db.count(DOCTYPE, {"user": user}) >= max_per_user():
			frappe.throw(_("You have reached the maximum number of notes. Delete some to add more."))
		doc = frappe.get_doc(
			{
				"doctype": DOCTYPE,
				"user": user,
				"reference_doctype": reference_doctype or None,
				"reference_name": reference_name or None,
				"color": "Yellow",
				"pinned": 0,
				**values,
			}
		)
		doc.db_insert()
		name = doc.name

	return frappe.db.get_value(DOCTYPE, name, FIELDS, as_dict=True)


@frappe.whitelist(methods=["POST"])
def delete(name: str):
	"""Delete one of the session user's notes."""
	own_note(name)
	frappe.db.delete(DOCTYPE, {"name": name})


# --- Permission hooks ---------------------------------------------------------
def get_permission_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	return f"`tab{DOCTYPE}`.`user` = {frappe.db.escape(user)}"


def has_permission(doc, ptype=None, user=None) -> bool:
	return doc.user == (user or frappe.session.user)


# --- Scheduler ----------------------------------------------------------------
def daily_cleanup():
	"""Scheduler (daily): notes of gone users and of deleted documents."""
	table = frappe.qb.DocType(DOCTYPE)
	user = frappe.qb.DocType("User")

	active = frappe.qb.from_(user).select(user.name).where(user.enabled == 1)
	frappe.qb.from_(table).delete().where(table.user.notin(active)).run()

	rows = frappe.get_all(
		DOCTYPE,
		filters={"reference_doctype": ("is", "set")},
		fields=["name", "reference_doctype", "reference_name"],
	)
	by_doctype = defaultdict(list)
	for row in rows:
		by_doctype[row.reference_doctype].append(row)

	gone = []
	for doctype, notes in by_doctype.items():
		if not frappe.db.exists("DocType", doctype):
			gone += [n.name for n in notes]
			continue
		names = list({n.reference_name for n in notes})
		existing = set(frappe.get_all(doctype, filters={"name": ("in", names)}, pluck="name"))
		gone += [n.name for n in notes if n.reference_name not in existing]

	if gone:
		frappe.db.delete(DOCTYPE, {"name": ("in", gone)})
