app_name = "themora"
app_title = "Themora"
app_publisher = "Brainmine Web Solutions Pvt Ltd"
app_description = "White-label brand theme for Frappe/ERPNext Desk and login"
app_email = "ashwani@brainminetech.com"
app_license = "mit"

# Bundles are built by esbuild from public/scss/*.bundle.scss and public/js/*.bundle.js
# and resolved to hashed files through sites/assets/assets.json. They carry the
# default look; themora.api.theme_css (no ".bundle." → used as-is) loads after
# them and applies Themora Settings at runtime.

# Desk (/app)
app_include_css = ["themora_desk.bundle.css", "/api/method/themora.api.theme_css"]
app_include_js = "themora.bundle.js"

# Website pages, including /login
web_include_css = ["themora_web.bundle.css", "/api/method/themora.api.theme_css"]
web_include_js = "themora.bundle.js"

after_install = "themora.install.after_install"

# frappe.boot.themora → footer and theme-toggle settings for themora.bundle.js
extend_bootinfo = "themora.theme.extend_bootinfo"

# `bench clear-cache` / frappe.clear_cache() also drops the generated theme CSS.
clear_cache = ["themora.theme.clear_cache", "themora.announcements.clear_cache"]

# Keeps Themora Recent Document bounded (see themora/recent.py).
scheduler_events = {"daily": ["themora.recent.daily_cleanup", "themora.sticky_notes.daily_cleanup"]}

# Recent-document rows must never block deleting a document (or a User): an
# admin may delete anything other users happen to have opened. Frappe's own
# View Log is listed in this hook for the same reason. Rows pointing at deleted
# documents are dropped the next time the user opens the panel.
ignore_links_on_delete = ["Themora Recent Document", "Themora Sticky Note"]

# Sticky notes are private: each user only ever sees their own.
permission_query_conditions = {
	"Themora Sticky Note": "themora.sticky_notes.get_permission_query_conditions",
}
has_permission = {
	"Themora Sticky Note": "themora.sticky_notes.has_permission",
}
