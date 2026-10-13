"""Announcement bar: messages at the top of the Desk (announcements.js).

All enabled, not-yet-ended announcements are cached together; each request
filters them by the user's roles. Start / end times are sent as seconds from
now, so the browser can show or hide them on time without caring about time
zones, and a saved change is pushed to open sessions over realtime.
"""

import frappe
from frappe.utils import get_datetime, now_datetime

DOCTYPE = "Themora Announcement"
CACHE_KEY = "themora:announcements"
REALTIME_EVENT = "themora_announcements_changed"


def is_safe_url(url: str) -> bool:
	url = (url or "").strip().lower()
	return url.startswith(("https://", "http://", "/")) and not url.startswith("//")


def changed():
	frappe.cache.delete_value(CACHE_KEY)
	frappe.publish_realtime(REALTIME_EVENT, after_commit=True)


def clear_cache():
	frappe.cache.delete_value(CACHE_KEY)


def _load_all() -> list[dict]:
	table = frappe.qb.DocType(DOCTYPE)
	now = now_datetime()
	rows = (
		frappe.qb.from_(table)
		.select(
			table.name,
			table.message,
			table.style,
			table.link_label,
			table.link_url,
			table.start,
			table.end,
			table.dismissible,
			table.modified,
		)
		.where((table.enabled == 1) & (table.end.isnull() | (table.end > now)))
		.orderby(table.start, order=frappe.qb.desc)
		.orderby(table.modified, order=frappe.qb.desc)
		.run(as_dict=True)
	)
	roles = frappe.get_all(
		"Themora Announcement Role",
		filters={"parenttype": DOCTYPE, "parent": ("in", [r.name for r in rows] or [""])},
		fields=["parent", "role"],
	)
	for row in rows:
		row.roles = [r.role for r in roles if r.parent == row.name]
	return rows


@frappe.whitelist()
def get_active() -> list[dict]:
	"""Announcements for the session user that are live now or start later."""
	if frappe.session.user == "Guest":
		return []

	user_roles = set(frappe.get_roles())
	now = now_datetime()
	out = []
	for row in frappe.cache.get_value(CACHE_KEY, generator=_load_all) or []:
		if row["roles"] and not user_roles.intersection(row["roles"]):
			continue
		ends_in = (get_datetime(row["end"]) - now).total_seconds() if row["end"] else None
		if ends_in is not None and ends_in <= 0:
			continue
		starts_in = (get_datetime(row["start"]) - now).total_seconds() if row["start"] else 0
		out.append(
			{
				"id": f"{row['name']}:{get_datetime(row['modified']).timestamp():.3f}",
				"message": row["message"],
				"style": (row["style"] or "Info").lower(),
				"link_label": row["link_label"],
				"link_url": row["link_url"] if is_safe_url(row["link_url"]) else "",
				"dismissible": bool(row["dismissible"]),
				"starts_in": max(0, starts_in),
				"ends_in": ends_in,
			}
		)
	return out
