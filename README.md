<div align="center">

# Themora

**White-label theme and productivity tools for the Frappe / ERPNext v16 Desk.**

Apply your own colors, logo, fonts and footer to the Desk and login page from one
settings form, without code or a rebuild. Themora also adds an announcement bar,
recent documents, sticky notes and a one-click light/dark switch.

![Frappe](https://img.shields.io/badge/Frappe-v16-0089FF)
![Python](https://img.shields.io/badge/Python-3.14+-3776AB)
![License](https://img.shields.io/badge/License-MIT-green)

![Themora in dark mode](themora/public/Themora%20app%20Screenshots/Complete%20Themora%20UI%20in%20DarkMode.png)

</div>

---

## Table of contents

- [Features at a glance](#features-at-a-glance)
- [Screenshots](#screenshots)
- [Installation](#installation)
- [Getting started](#getting-started)
- [Themora Settings reference](#themora-settings-reference)
- [Feature guide](#feature-guide)
  - [Color theme](#1-color-theme)
  - [Branding](#2-branding)
  - [Footer](#3-footer)
  - [Announcement bar](#4-announcement-bar)
  - [Recent documents](#5-recent-documents)
  - [Sticky notes](#6-sticky-notes)
  - [Light / dark mode switcher](#7-light--dark-mode-switcher)
  - [Tools dock](#8-tools-dock)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Permissions and privacy](#permissions-and-privacy)
- [How it works](#how-it-works)
- [Development](#development)
- [Uninstall](#uninstall)
- [License](#license)

---

## Features at a glance

| Feature | What it does |
| --- | --- |
| 🎨 **Color theme** | Pick one primary color and Themora generates a full shade scale. It also covers gradient or solid navbar colors, background tint, login page background and button text, and checks contrast automatically. Works in light and dark mode. |
| 🏷️ **Branding** | Shows your brand name and logo on the navbar and page bars, and sets the app title, app logo, favicon and splash screen. |
| 🔤 **Typography & shape** | Choose from 10 Google Fonts or the system font, and set corner roundness to Sharp, Default or Rounded. |
| 📄 **Footer** | Adds a copyright line, a "Powered by" credit and a link, or your own custom HTML, to every Desk page. |
| 📢 **Announcement bar** | Shows scheduled, role-targeted messages at the top of the Desk. Users can dismiss them, and changes reach open sessions in real time. |
| 🕘 **Recent documents** | Gives each user a searchable list of the documents they opened last (`Alt+R`). |
| 📝 **Sticky notes** | Private, color-coded notes on any document or as personal notes (`Alt+N`). Pinned notes open with their document. |
| 🌗 **Light/dark switcher** | Switches between light and dark mode in one click. |
| 🧰 **Tools dock** | A slim rail on the right edge that holds the tools. You can collapse it, and on phones it becomes a floating button. |
| 🧩 **Custom CSS** | Add your own CSS, with access to all theme variables. |

Every feature is controlled from **Themora Settings** and can be turned off on its own.

---

## Screenshots

### Complete UI (dark mode)
![Complete Themora UI in dark mode](themora/public/Themora%20app%20Screenshots/Complete%20Themora%20UI%20in%20DarkMode.png)

### Sign-in page
![Sign In Page](themora/public/Themora%20app%20Screenshots/Sign%20In%20Page.png)

### Themora Settings: color theme with live preview
![Themora Settings - Color Theme Settings](themora/public/Themora%20app%20Screenshots/Themora%20Settings%20-%20Color%20Theme%20Settings.png)

### Announcement bar
![Announcement Bar](themora/public/Themora%20app%20Screenshots/Announcement%20Bar%20Zoomed.png)

### Recent documents
![Recent Documents full screen](themora/public/Themora%20app%20Screenshots/Recent%20Documents%20Full%20Screen.png)

<details>
<summary>Zoomed in</summary>

![Recent Documents zoomed in](themora/public/Themora%20app%20Screenshots/Recent%20Document%20Zoomed%20In.png)

</details>

### Sticky notes
![Sticky Notes](themora/public/Themora%20app%20Screenshots/Sticky%20Notes%20Zoomed.png)

### Mobile view

| Dock closed | Dock opened |
| :---: | :---: |
| <img src="themora/public/Themora%20app%20Screenshots/Mobile%20View%20dock%20closed.png" width="300" alt="Mobile view, dock closed"> | <img src="themora/public/Themora%20app%20Screenshots/mobile%20view%20dock%20opened.png" width="300" alt="Mobile view, dock opened"> |

---

## Installation

**Requirements:** Frappe Framework **v16** (ERPNext optional) and Python **3.14+**.

```bash
cd ~/frappe-bench
bench get-app <repo-url>
bench build --app themora
bench --site <your-site> install-app themora
bench --site <your-site> clear-cache
```

In **production**, restart the web and worker processes right after `install-app`:

```bash
sudo supervisorctl restart frappe-bench-web: frappe-bench-workers:
```

> [!IMPORTANT]
> Gunicorn runs with `--preload`. Workers started before the app was installed
> cannot import `themora`, and every request returns **HTTP 500** until they are
> restarted.

### Upgrading

```bash
cd ~/frappe-bench/apps/themora && git pull
cd ~/frappe-bench
bench --site <your-site> migrate
bench build --app themora
bench --site <your-site> clear-cache
```

The migrate patches fill in defaults for any settings added since your last
save. Existing settings are not changed.

---

## Getting started

1. Log in as a **System Manager**.
2. Open **Themora Settings**. Search for it in the awesome bar, or go to `/app/themora-settings`.
3. On the **Brand** tab, enter your *Brand Name* and upload a *Brand Logo*.
4. On the **Colors** tab, pick a *Primary Color* and navbar colors. The **Preview**
   box updates as you edit.
5. Click **Save**. The page reloads with your theme applied for every user. No build
   or restart is needed.

> [!TIP]
> To go back to the original palette, click **Reset Colors** at the top of the
> settings form, then save. Only the color fields are reset.

---

## Themora Settings reference

Themora Settings is a single settings form with five tabs.

### Brand

| Field | Description |
| --- | --- |
| Brand Name | Your company or brand name, shown on the navbar. It is also the footer's default "Powered by" name. |
| Brand Logo | A square mark shown at 22px on the navbar. Use a light or white version if the navbar is dark. |
| Show Brand Name / Show Brand Logo | Show or hide each one. |
| Show on Page Bars | Also shows the brand in the bar at the top of each page. It is hidden on small screens. |
| App Title | Browser tab title and app name. Saved to Website Settings. |
| App Logo | Logo on the login page and the sidebar or desktop. |
| Favicon | Browser tab icon (`.ico`, `.png` or `.svg`). |
| Splash Image | Shown while the Desk is loading. |

### Colors

| Field | Default | Description |
| --- | --- | --- |
| Primary Color | `#40C09C` | Used for buttons, links, checkboxes, focus rings and selections. A 50–950 shade scale is generated from it. |
| Button Text Color | *auto* | Label color on primary buttons. Leave it empty and Themora picks white or dark, whichever has better contrast. |
| Background Tint | Brand Tinted | *Brand Tinted* gives grays, borders and dark mode a hint of the primary color. *Neutral Gray* keeps them plain. |
| Login Page Background | *auto* | Leave it empty to use the darkest shade of the primary color. |
| Navbar Style | Gradient | *Gradient* or *Solid*. |
| Gradient Start / End | `#62D16B` / `#40C09C` | Navbar colors. With *Solid*, only the start color is used. |
| Navbar Text Color | `#FFFFFF` | Text and icons on the navbar, page bars and the active sidebar item. |

**Automatic contrast checks**

- The primary button label is set to white or dark, whichever reads better.
- Link and accent shades are the lightest that still reach WCAG 4.5:1 for text
  or 3:1 for UI elements. They are calculated separately for light and dark mode.
- When you save, Themora warns you if the navbar text contrast is below 3:1.

### Typography & Shape

| Field | Options |
| --- | --- |
| Font | Manrope (default), Inter, Poppins, Roboto, Open Sans, Lato, Nunito, DM Sans, Plus Jakarta Sans and Outfit, all loaded from Google Fonts. *System Default* uses the device font and loads nothing. |
| Corner Style | Sharp, Default or Rounded. Applies to buttons, inputs, cards and dialogs. |

### Footer

| Field | Description |
| --- | --- |
| Show Footer | Turns the footer bar at the bottom of every Desk page on or off. |
| Copyright Text | Text on the left side, `© {year}` by default. Hidden on phones. |
| Powered By Label / Name / Link | For example *Powered by **Your Company***. The name defaults to the Brand Name, and the link is optional. |
| Right Link Text / URL | An optional link on the right side, such as your website. |
| Use Custom HTML / Custom Footer HTML | Replaces the whole footer with your own HTML. |

The placeholders `{year}` and `{brand}` work in all footer text and in custom HTML.

### Advanced

| Field | Default | Description |
| --- | --- | --- |
| Tools Position | Right Dock | *Right Dock* puts the tools on a slim rail on the right edge. *In Bar* puts them in the Desk bars. |
| Show Light / Dark Toggle | ✔ | Shows the moon/sun button. |
| Show Recent Documents | ✔ | Shows the clock button. |
| Shown in the Panel | 10 | How many recent documents the panel lists (5–30). |
| Kept per User | 30 | How many documents are remembered per user and searchable (10–100). |
| Show Announcement Bar | ✔ | Shows live announcements at the top of the Desk. |
| Show Sticky Notes | ✔ | Shows the notes button. |
| Max Notes per User | 100 | Note limit per user (20–500). |
| Custom CSS | — | Loaded after the theme on Desk and website pages. Theme variables such as `var(--tm-brand-400)` are available. |

---

## Feature guide

### 1. Color theme

Choose one **Primary Color** and Themora builds a full palette from it for both
light and dark mode. Themora overrides Frappe's own CSS variables, so the built-in
Light / Dark / Automatic theme setting keeps working. The **Preview** box at the
top of the Colors tab shows the navbar, sidebar item and buttons before you save.

### 2. Branding

Your **Brand Name** and **Brand Logo** appear on the navbar next to the app logo,
and optionally on every page bar. The **App Identity** fields (title, logo,
favicon, splash) are saved to Frappe's *Website Settings* and *Navbar Settings*,
so you can manage all branding from one place.

The **sign-in page** is themed as well. It uses your App Logo, primary color and
login background.

### 3. Footer

The footer is a thin bar at the bottom of every Desk page. A typical setup:

```
© {year} {brand}                    Powered by Your Company         www.example.com
```

For full control, enable **Use Custom HTML** and write your own markup.

### 4. Announcement bar

Use it to show a message to everyone, or only to certain roles, at the top of the Desk.

**To create an announcement:**

1. Open **Themora Settings → Announcements** (button at the top), or go to `/app/themora-announcement`.
2. Click **New** and fill in:

| Field | Description |
| --- | --- |
| Enabled | Turn the announcement on or off. |
| Title | For your reference in the list. It is not shown to users. |
| Message | One line of plain text shown in the bar. |
| Style | Info, Success, Warning, Danger, or Brand (uses the navbar gradient). |
| Users Can Dismiss | Shows a close button. If you edit a dismissed announcement, it appears again. |
| Link Text / Link URL | An optional link, such as *Read more*. Accepts `https://…` or a Desk path like `/app/todo`. |
| Show From / Show Until | An optional schedule. Leave both empty to show it right away until you disable it. |
| Show to Roles | Limit the announcement to some roles. Leave it empty to show it to every Desk user. |

**Behavior**

- When several announcements are live, they are shown one at a time with **‹ 1/3 ›** controls.
- Saving an announcement updates open browser tabs in real time. Tabs also refresh
  every 5 minutes, and scheduled announcements appear and disappear on time.
- Dismissals are remembered per browser.

### 5. Recent documents

Click the **clock** button, or press **`Alt+R`** (`⌥R` on Mac), to see the
documents you opened most recently, newest first.

- Type in the filter box to search all of your remembered documents.
- Use **↑ / ↓** to move, **Enter** to open and **Esc** to close.
- **Clear history** removes your list.
- Each entry shows the document title, its type, its ID and when you last opened it.
- You only see documents you still have permission to read. Deleted documents are
  removed from the list automatically.

**Storage stays bounded:** each user keeps at most *Kept per User* entries. A daily
job removes entries that have not been opened for 90 days, and entries of disabled
or deleted users.

### 6. Sticky notes

Click the **note** button, or press **`Alt+N`** (`⌥N` on Mac), to open the Notes panel.

- **Document notes:** when a document is open, the panel shows your notes for that
  document. Use them for reminders such as "call the customer before approving".
- **Personal notes:** always available, on any page.
- Click **+** to add a note. Notes save automatically as you type.
- Five colors: Yellow, Pink, Green, Blue and Purple.
- **Pin** a document note so the panel opens by itself whenever that document is opened.
- The button shows a count of the notes on the current document.
- Each note holds up to 2,000 characters. Each user can keep up to *Max Notes per User* notes.

> [!NOTE]
> Sticky notes are **strictly private**. Each user sees only their own notes,
> System Managers included. This applies in the panel, the list view and the REST API.

### 7. Light / dark mode switcher

The **moon/sun** button switches the Desk between light and dark mode in one click
and saves the choice to the user's profile. You can still use Frappe's own theme
dialog, including the *Automatic* option.

### 8. Tools dock

The Recent, Notes and Theme buttons are placed in a **tools dock**, a slim rail in
your brand gradient fixed to the right edge of the Desk. This keeps the navbar
uncluttered.

- **Desktop:** the arrow under the tools collapses the dock to a small tab. Each
  browser remembers whether the dock was collapsed.
- **Phone (< 768px):** the dock becomes a round button in the bottom-right corner.
  Tap it to open the tools upward. It closes when you tap outside it or navigate.
- If you prefer the tools in the Desk bars, set **Advanced → Tools Position** to *In Bar*.

---

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Alt+R` / `⌥R` | Open recent documents |
| `Alt+N` / `⌥N` | Open sticky notes |
| `↑` `↓` `Enter` | Move through and open recent documents |
| `Esc` | Close the open panel |

---

## Permissions and privacy

| DocType | Who can access it |
| --- | --- |
| Themora Settings | System Manager |
| Themora Announcement | System Manager can create and edit. Users see only the announcements targeted at their roles. |
| Themora Recent Document | Each user reads only their own history through the panel. It never shows documents the user cannot read. |
| Themora Sticky Note | Owner only, enforced with permission hooks. |

Recent documents and sticky notes never block deleting a document or a user.

---

## How it works

```
themora/
├── hooks.py              # bundles, runtime CSS, boot info, scheduler, permission hooks
├── theme.py              # settings → CSS variables (shade scale, contrast, fonts)
├── api.py                # GET /api/method/themora.api.theme_css (ETag, no-cache)
├── announcements.py      # active announcements per user, cache, realtime push
├── recent.py             # track / list / clear recent documents, daily cleanup
├── sticky_notes.py       # get / save / delete notes, privacy hooks, daily cleanup
├── install.py            # seeds the settings defaults
├── patches/              # fill defaults for settings added in later versions
├── themora/doctype/      # Themora Settings, Announcement, Recent Document, Sticky Note
└── public/
    ├── scss/_tokens.scss       # default --tm-* variables (out-of-the-box look)
    ├── scss/_desk.scss         # Desk overrides, using only --tm-* variables
    ├── scss/_login.scss        # /login and /update-password
    ├── js/themora.bundle.js    # footer, theme toggle, <meta theme-color>, bootstraps the tools
    ├── js/announcements.js     # announcement bar
    ├── js/recent_documents.js  # recent documents panel
    ├── js/sticky_notes.js      # notes panel
    └── js/tools_dock.js        # right-edge dock / mobile button
```

- The compiled bundles contain the default look as `--tm-*` CSS custom properties.
- `themora.api.theme_css` loads after the bundles through `app_include_css` and
  `web_include_css`. It outputs the overrides from Themora Settings, using selectors
  one step more specific than the bundle's.
- The generated CSS is cached in Redis and served with an ETag, so browsers get a
  cheap `304` on each load. Saving the settings or running `bench clear-cache`
  clears the cache, and the change shows on the next page load.
- Website pages have no `data-theme` attribute, so the login page follows the
  operating system's `prefers-color-scheme`. The Desk follows the user's Frappe theme.
- `prefers-reduced-motion` turns off transitions and animations.

---

## Development

```bash
bench build --app themora     # or: bench watch
bench --site <your-site> clear-cache
```

To change the defaults used before anyone edits the settings, update all three of
these and keep them in sync:

1. `public/scss/_tokens.scss`
2. `DEFAULTS` in `theme.py`
3. Field defaults in `themora_settings.json`

`!important` is used only where a Frappe rule already uses it, or for the
reduced-motion reset. Each use has a comment.

---

## Uninstall

```bash
bench --site <your-site> uninstall-app themora
bench --site <your-site> clear-cache
bench remove-app themora      # optional: removes the app from the bench
```

---

## License

MIT © 2026 Brainmine Web Solutions Pvt Ltd. See [license.txt](license.txt).
