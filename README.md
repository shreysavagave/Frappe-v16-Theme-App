## Brainmine Theme

Brand theme for Frappe / ERPNext **v16**. It restyles the Desk (`/app`) and the
login page with the Brainmine AI brand (mint `#40C09C`). It is UI only: no
DocTypes, no Python or JS business logic, and Frappe's behaviour is unchanged.

- Overrides Frappe's own CSS variables for light **and** dark, so the built-in
  theme switcher (Light / Dark / Automatic) keeps working.
- Font: Manrope (Google Fonts), with Inter and the system stack as fallbacks.
- Primary buttons use a mint fill with dark text. White text on `#40C09C` is only
  2.3:1, which fails contrast.

### Layout

```
brainmine_theme/
├── hooks.py                              # app/web include css + js
└── public/
    ├── scss/
    │   ├── _tokens.scss                  # ← all colors, type, radii, shadows
    │   ├── _desk.scss                    # Desk overrides
    │   ├── _login.scss                   # /login and /update-password
    │   ├── brainmine_desk.bundle.scss    # tokens + desk  → app_include_css
    │   └── brainmine_web.bundle.scss     # tokens + login + website touches → web_include_css
    └── js/
        └── brainmine_theme.bundle.js     # sets <meta theme-color>, adds body.bm-theme
```

`hooks.py` references bundles by name, for example `brainmine_desk.bundle.css`.
Frappe's esbuild build compiles `public/scss/brainmine_desk.bundle.scss`, writes a
hashed file to `sites/assets/brainmine_theme/dist/css/`, and maps the name to
that file in `sites/assets/assets.json`.

### Install

```bash
cd ~/frappe-bench
# if the app folder was copied in rather than fetched with `bench get-app`:
./env/bin/pip install -e apps/brainmine_theme
grep -qx brainmine_theme sites/apps.txt || echo brainmine_theme >> sites/apps.txt

bench build --app brainmine_theme
bench --site <site> install-app brainmine_theme
bench --site <site> clear-cache
sudo supervisorctl restart frappe-bench-web: frappe-bench-workers:   # production: REQUIRED
```

> **Production: restart immediately after `install-app`.** Gunicorn runs with
> `--preload`, so workers that started before the `pip install -e` cannot import
> `brainmine_theme`. Once the app is in the site's installed apps, every request
> fails with `ModuleNotFoundError` (HTTP 500) until the workers restart. For the
> shortest window, restart right after `install-app`, or run `pip install` and
> restart before `install-app`.

Then hard-refresh the browser (Ctrl/Cmd+Shift+R).

### Build after editing styles

```bash
bench build --app brainmine_theme
bench --site <site> clear-cache
```

During development, `bench watch` rebuilds automatically.

### Change the brand color (one place)

Everything reads from `public/scss/_tokens.scss`:

1. Replace the `$bm-mint-50 … $bm-mint-950` scale with a scale built around the
   new color. Keep the brand at `400`.
2. Check that `--bm-on-primary` (the button label color) still has at least
   4.5:1 contrast on the `400` and `500` shades. Use a dark label for light
   brands and white for dark ones.
3. Check that `--bm-link` has at least 4.5:1 contrast on white. It currently
   uses `700`, because `600` (`#23866B`) is 4.47:1 on white, just under WCAG AA.
4. Rebuild (see above).

To tint the neutrals differently, edit the `$bm-light-*` and `$bm-dark-*`
values in the same file.

### Set the logo

Nothing in the theme hard-codes an image.

- **Login page:** *Website Settings → App Logo*. If that is empty, Frappe falls
  back to *Navbar Settings → App Logo*, then to the `app_logo_url` hook.
- **Desk sidebar header / navbar:** *Navbar Settings → App Logo*.
- **Favicon / browser tab:** *Website Settings → Favicon*.

Upload a logo that reads on white. On the login page it sits inside the light
card, and the card turns dark only when the OS is in dark mode.

### Notes

- Website pages have no `data-theme` attribute, so the login card follows the
  OS `prefers-color-scheme` setting. The Desk follows the user's Frappe theme
  setting.
- `prefers-reduced-motion` turns off this theme's transitions and Frappe's own
  animations (toast slide-in, login wiggle).
- `!important` is used only where a Frappe rule already uses it, or for the
  reduced-motion reset. Each use has a comment.

### Uninstall

```bash
bench --site <site> uninstall-app brainmine_theme
bench --site <site> clear-cache
# optional — remove from the bench entirely
bench remove-app brainmine_theme
```

### License

MIT
