app_name = "brainmine_theme"
app_title = "Brainmine Theme"
app_publisher = "Brainmine Web Solutions Pvt Ltd"
app_description = "Brainmine AI brand theme for Frappe/ERPNext Desk and login"
app_email = "ashwani@brainminetech.com"
app_license = "mit"

# Pure UI theme: no DocTypes, no business logic.
# Bundles are built by esbuild from public/scss/*.bundle.scss and public/js/*.bundle.js
# and resolved to hashed files through sites/assets/assets.json.

# Desk (/app)
app_include_css = "brainmine_desk.bundle.css"
app_include_js = "brainmine_theme.bundle.js"

# Website pages, including /login
web_include_css = "brainmine_web.bundle.css"
web_include_js = "brainmine_theme.bundle.js"
