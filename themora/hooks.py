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
clear_cache = "themora.theme.clear_cache"
