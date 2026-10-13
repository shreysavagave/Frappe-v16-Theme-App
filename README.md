## Themora

White-label brand theme for Frappe / ERPNext **v16**. It restyles the Desk
(`/app`) and the login page, and lets any company apply its own branding from
**Themora Settings**. No rebuild is needed.

- Overrides Frappe's own CSS variables for light **and** dark, so the built-in
  theme switcher (Light / Dark / Automatic) keeps working.
- Changing a setting takes effect on the next page load. Nothing is compiled.

### Themora Settings (`/app/themora-settings`)

| Tab | What you can change |
| --- | --- |
| **Brand** | Brand name and logo on the navbar (each can be hidden), whether they also appear on page bars. App title, app logo, favicon and splash image, which are saved to Website Settings / Navbar Settings |
| **Colors** | Primary color (a 50–950 shade scale is generated from it), button text color (auto by default), gradient or solid navbar with start/end colors, navbar text color, brand-tinted or neutral-gray backgrounds, login page background. Live preview |
| **Typography & Shape** | Font (10 Google Fonts or the system font), corner style (Sharp / Default / Rounded) |
| **Footer** | Show/hide, copyright text, "Powered by" label/name/link, right-side link, or a fully custom HTML footer. `{year}` and `{brand}` placeholders |
| **Advanced** | Show/hide the light/dark toggle, custom CSS |

Contrast is checked automatically:

- The button label is white or dark, whichever reads better on the primary color.
- Link and accent shades are the lightest that reach 4.5:1 or 3:1. This is
  calculated separately for light and dark mode.
- Saving warns you if the navbar text contrast is below 3:1.

### How it works

```
themora/
├── hooks.py              # bundles + runtime CSS + boot info + after_install
├── theme.py              # settings → CSS variables (color scale, contrast, fonts)
├── api.py                # GET /api/method/themora.api.theme_css (ETag, no-cache)
├── install.py            # seeds the settings defaults
├── themora/doctype/themora_settings/
└── public/
    ├── scss/_tokens.scss # default --tm-* variables (the out-of-the-box look)
    ├── scss/_desk.scss   # Desk overrides, read only --tm-* variables
    ├── scss/_login.scss  # /login and /update-password
    └── js/themora.bundle.js  # footer, theme toggle, <meta theme-color>
```

The compiled bundles hold the default look as `--tm-*` custom properties.
`themora.api.theme_css` comes after them in `app_include_css` /
`web_include_css`. It outputs overrides from the settings using selectors one
step more specific than the bundle's. The result is cached in Redis, and saving
the settings clears that cache.

### Install

```bash
cd ~/frappe-bench
bench get-app <repo-url>            # or copy into apps/themora, then:
# ./env/bin/pip install -e apps/themora && echo themora >> sites/apps.txt

bench build --app themora
bench --site <site> install-app themora
bench --site <site> clear-cache
sudo supervisorctl restart frappe-bench-web: frappe-bench-workers:   # production
```

> **Production: restart right after `install-app`.** Gunicorn runs with
> `--preload`, so workers that started before `pip install -e` cannot import
> `themora`, and every request returns HTTP 500 until they restart.

### Development

```bash
bench build --app themora     # or `bench watch`
bench --site <site> clear-cache
```

To change the defaults that apply before anyone edits the settings, update
`public/scss/_tokens.scss`, `DEFAULTS` in `theme.py` and the field defaults in
`themora_settings.json`. Keep all three in sync.

### Notes

- Website pages have no `data-theme` attribute, so the login card follows the
  OS `prefers-color-scheme` setting. The Desk follows the user's Frappe theme.
- `prefers-reduced-motion` turns off transitions and Frappe's own animations.
- `!important` is used only where a Frappe rule already uses it, or for the
  reduced-motion reset. Each use has a comment.

### Uninstall

```bash
bench --site <site> uninstall-app themora
bench --site <site> clear-cache
bench remove-app themora      # optional
```

### License

MIT
