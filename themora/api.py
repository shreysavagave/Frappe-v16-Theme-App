import hashlib

import frappe
from werkzeug.wrappers import Response

from themora.theme import get_theme_css


@frappe.whitelist(allow_guest=True, methods=["GET"])
def theme_css():
	"""Runtime theme stylesheet, included after the bundles via app/web_include_css.

	Served with an ETag and `no-cache`, so browsers revalidate on every page
	load (a cheap 304) and pick up a settings change immediately.
	"""
	css = get_theme_css()
	response = Response(css, mimetype="text/css")
	response.headers["Cache-Control"] = "no-cache"
	response.set_etag(hashlib.md5(css.encode()).hexdigest())
	return response.make_conditional(frappe.request)
