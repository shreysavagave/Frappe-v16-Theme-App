"""Turn Themora Settings into the runtime CSS that re-brands Desk and the login page.

The compiled bundles (public/scss) ship the default look as --tm-* custom
properties. This module emits overrides for those properties from the
settings, plus a few toggle rules, and caches the result in Redis.

Selectors here are one step more specific than the bundle's, so the order in
which the stylesheets load does not matter:
  bundle  `:root` (0,1,0)                     → here `html:root` (0,1,1)
  bundle  `html:not([data-theme="dark"])` (0,1,1) → here `html:root:not(…)` (0,2,1)
"""

import colorsys

import frappe

CACHE_KEY = "themora:theme_css"
DOCTYPE = "Themora Settings"

# Must match public/scss/_tokens.scss and the field defaults in themora_settings.json.
DEFAULTS = {
	"brand_name": "",
	"show_brand_name": 1,
	"brand_logo": "",
	"show_brand_logo": 1,
	"show_cobrand_on_page_bar": 1,
	"primary_color": "#40C09C",
	"navbar_style": "Gradient",
	"gradient_start": "#62D16B",
	"gradient_end": "#40C09C",
	"navbar_text_color": "#FFFFFF",
	"button_text_color": "",
	"neutral_tint": "Brand Tinted",
	"login_background": "",
	"font_family": "Manrope",
	"corner_style": "Default",
	"show_footer": 1,
	"footer_copyright": "© {year}",
	"powered_by_label": "Powered by",
	"powered_by_name": "",
	"powered_by_url": "",
	"footer_link_label": "",
	"footer_link_url": "",
	"use_custom_footer": 0,
	"custom_footer_html": "",
	"show_theme_toggle": 1,
	"show_recent_documents": 1,
	"recent_documents_limit": 15,
	"custom_css": "",
}

# The bundle's hand-tuned brand scale is used as-is for the default color.
DEFAULT_PRIMARY = "#40c09c"

# Neutrals from _tokens.scss. They are re-tinted to the brand hue (or made
# pure gray) by keeping each color's lightness and saturation.
NEUTRALS = {
	"light-page": "#f5f8f7",
	"light-subtle": "#eef3f1",
	"light-border": "#e3eae7",
	"light-border-strong": "#cbd7d3",
	"light-text": "#12201d",
	"light-muted": "#5b6b67",
	"gray-400": "#aebdb8",
	"gray-500": "#8fa39c",
	"gray-600": "#6b7c77",
	"gray-700": "#44534f",
	"gray-800": "#2a3835",
	"dark-page": "#0c1513",
	"dark-surface": "#121d1a",
	"dark-card": "#16231f",
	"dark-subtle": "#1a2925",
	"dark-raised": "#1f302b",
	"dark-border": "#24352f",
	"dark-border-strong": "#334a43",
	"dark-text": "#e6efec",
	"dark-muted": "#8fa39c",
}

# Share of white (lighter shades) or black (darker shades) mixed into the brand.
SHADE_MIX = {
	50: ("#ffffff", 0.92),
	100: ("#ffffff", 0.82),
	200: ("#ffffff", 0.64),
	300: ("#ffffff", 0.40),
	400: None,
	500: ("#000000", 0.15),
	600: ("#000000", 0.32),
	700: ("#000000", 0.46),
	800: ("#000000", 0.58),
	900: ("#000000", 0.68),
	950: ("#000000", 0.82),
}

FONTS = {
	"Manrope": "Manrope:wght@400;500;600;700",
	"Inter": "Inter:wght@400;500;600;700",
	"Poppins": "Poppins:wght@400;500;600;700",
	"Roboto": "Roboto:wght@400;500;700",
	"Open Sans": "Open+Sans:wght@400;500;600;700",
	"Lato": "Lato:wght@400;700",
	"Nunito": "Nunito:wght@400;500;600;700",
	"DM Sans": "DM+Sans:wght@400;500;600;700",
	"Plus Jakarta Sans": "Plus+Jakarta+Sans:wght@400;500;600;700",
	"Outfit": "Outfit:wght@400;500;600;700",
}
SYSTEM_STACK = (
	'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
)

# xs / control / card / modal
CORNERS = {
	"Sharp": (2, 4, 6, 8),
	"Default": (4, 8, 12, 16),
	"Rounded": (6, 12, 18, 24),
}


# Fields that fall back to their default when left empty.
COLOR_OR_SELECT = {
	"primary_color",
	"gradient_start",
	"gradient_end",
	"navbar_text_color",
	"navbar_style",
	"neutral_tint",
	"font_family",
	"corner_style",
}


# -----------------------------------------------------------------------------
# Settings
# -----------------------------------------------------------------------------
def get_settings() -> frappe._dict:
	"""Settings merged over DEFAULTS. Works before the DocType is migrated."""
	values = {}
	try:
		values = frappe.get_cached_doc(DOCTYPE).as_dict()
	except (frappe.DoesNotExistError, ImportError):
		# DocType not installed / migrated yet: fall back to the defaults.
		frappe.clear_last_message()

	settings = frappe._dict(DEFAULTS)
	for key in DEFAULTS:
		value = values.get(key)
		if value is None:
			continue
		# Colors and selects can't be meaningfully empty.
		if value == "" and key in COLOR_OR_SELECT:
			continue
		settings[key] = value
	return settings


def get_boot_info() -> dict:
	"""What the Desk script needs (footer, theme toggle). Added to frappe.boot."""
	s = get_settings()
	return {
		"brand_name": s.brand_name,
		"show_footer": bool(s.show_footer),
		"footer_copyright": s.footer_copyright,
		"powered_by_label": s.powered_by_label,
		"powered_by_name": s.powered_by_name or s.brand_name,
		"powered_by_url": s.powered_by_url,
		"footer_link_label": s.footer_link_label,
		"footer_link_url": s.footer_link_url,
		"use_custom_footer": bool(s.use_custom_footer),
		"custom_footer_html": s.custom_footer_html if s.use_custom_footer else "",
		"show_theme_toggle": bool(s.show_theme_toggle),
		"show_recent_documents": bool(s.show_recent_documents),
		"recent_documents_limit": max(5, min(int(s.recent_documents_limit or 15), 30)),
	}


def extend_bootinfo(bootinfo):
	bootinfo.themora = get_boot_info()


def get_theme_css() -> str:
	return frappe.cache.get_value(CACHE_KEY, generator=lambda: build_css(get_settings()))


def clear_cache():
	frappe.cache.delete_value(CACHE_KEY)


# -----------------------------------------------------------------------------
# Color math
# -----------------------------------------------------------------------------
def normalize_hex(value: str) -> str:
	value = (value or "").strip().lstrip("#").lower()
	if len(value) == 3:
		value = "".join(c * 2 for c in value)
	if len(value) != 6 or any(c not in "0123456789abcdef" for c in value):
		raise ValueError(f"Not a hex color: {value!r}")
	return f"#{value}"


def hex_to_rgb(value: str) -> tuple[int, int, int]:
	value = normalize_hex(value)
	return tuple(int(value[i : i + 2], 16) for i in (1, 3, 5))


def rgb_to_hex(rgb) -> str:
	return "#" + "".join(f"{max(0, min(255, round(c))):02x}" for c in rgb)


def mix(color: str, other: str, weight: float) -> str:
	"""`weight` share of `other` mixed into `color`."""
	a, b = hex_to_rgb(color), hex_to_rgb(other)
	return rgb_to_hex(a[i] * (1 - weight) + b[i] * weight for i in range(3))


def luminance(color: str) -> float:
	def channel(c):
		c /= 255
		return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

	r, g, b = (channel(c) for c in hex_to_rgb(color))
	return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
	la, lb = sorted((luminance(a), luminance(b)), reverse=True)
	return (la + 0.05) / (lb + 0.05)


def rgb_triplet(color: str) -> str:
	return ", ".join(str(c) for c in hex_to_rgb(color))


def brand_scale(primary: str) -> dict[int, str]:
	primary = normalize_hex(primary)
	scale = {}
	for shade, recipe in SHADE_MIX.items():
		scale[shade] = primary if recipe is None else mix(primary, *recipe)
	return scale


def tint_neutrals(primary: str, mode: str) -> dict[str, str]:
	r, g, b = (c / 255 for c in hex_to_rgb(primary))
	hue, _, brand_sat = colorsys.rgb_to_hls(r, g, b)
	gray = mode == "Neutral Gray" or brand_sat < 0.15  # no meaningful hue to borrow

	out = {}
	for name, value in NEUTRALS.items():
		nr, ng, nb = (c / 255 for c in hex_to_rgb(value))
		_, light, sat = colorsys.rgb_to_hls(nr, ng, nb)
		rgb = colorsys.hls_to_rgb(hue, light, 0 if gray else sat)
		out[name] = rgb_to_hex(c * 255 for c in rgb)
	return out


def first_with_contrast(scale, shades, background, ratio):
	for shade in shades:
		if contrast(scale[shade], background) >= ratio:
			return shade
	return shades[-1]


# -----------------------------------------------------------------------------
# CSS
# -----------------------------------------------------------------------------
def css_string(value: str) -> str:
	"""A safe, double-quoted CSS string literal (also used inside url())."""
	escaped = "".join(
		f"\\{ord(c):x} " if c in '\\"<>' or ord(c) < 0x20 or ord(c) == 0x7F else c for c in str(value or "")
	)
	return f'"{escaped}"'


def declarations(props: dict) -> str:
	return "".join(f"\t{name}: {value};\n" for name, value in props.items())


def block(selector: str, props: dict) -> str:
	return f"{selector} {{\n{declarations(props)}}}\n" if props else ""


def safe_color(value, fallback):
	try:
		return normalize_hex(value)
	except ValueError:
		return normalize_hex(fallback)


def build_css(s: frappe._dict) -> str:
	primary = safe_color(s.primary_color, DEFAULTS["primary_color"])
	start = safe_color(s.gradient_start, DEFAULTS["gradient_start"])
	end = safe_color(s.gradient_end, DEFAULTS["gradient_end"])
	if s.navbar_style == "Solid":
		end = start
	on_gradient = safe_color(s.navbar_text_color, DEFAULTS["navbar_text_color"])

	is_default_primary = primary == DEFAULT_PRIMARY
	scale = brand_scale(primary)
	neutrals = tint_neutrals(primary, s.neutral_tint)

	parts = ["/* Themora runtime theme — generated from Themora Settings */\n"]

	# Font import must be the first rule of the stylesheet.
	font = s.font_family
	if font in FONTS:
		parts.insert(
			0, f'@import url("https://fonts.googleapis.com/css2?family={FONTS[font]}&display=swap");\n'
		)
		font_stack = f'"{font}", {SYSTEM_STACK}'
	else:
		font_stack = SYSTEM_STACK

	# --- Raw palette + assets -------------------------------------------------
	root = {}
	if not is_default_primary:
		root.update({f"--tm-brand-{shade}": color for shade, color in scale.items()})
		root["--tm-brand-rgb"] = rgb_triplet(primary)
	if not (is_default_primary and s.neutral_tint == DEFAULTS["neutral_tint"]):
		root.update({f"--tm-{name}": color for name, color in neutrals.items()})

	root.update(
		{
			"--tm-gradient-start": start,
			"--tm-gradient-end": end,
			"--tm-on-gradient": on_gradient,
			"--tm-on-gradient-rgb": rgb_triplet(on_gradient),
			"--tm-font": font_stack,
		}
	)

	xs, control, card, modal = CORNERS.get(s.corner_style, CORNERS["Default"])
	root.update(
		{
			"--tm-radius-xs": f"{xs}px",
			"--tm-radius-control": f"{control}px",
			"--tm-radius-card": f"{card}px",
			"--tm-radius-modal": f"{modal}px",
		}
	)

	name = s.brand_name if s.show_brand_name else ""
	logo = s.brand_logo if s.show_brand_logo else ""
	root["--tm-wordmark"] = css_string(name)
	root["--tm-logo"] = f"url({css_string(logo)})" if logo else "none"
	root["--tm-logo-space"] = "30px" if logo else "0px"
	root["--tm-cobrand-display"] = "inline-flex" if (name or logo) else "none"

	if s.login_background:
		root["--tm-login-bg"] = safe_color(s.login_background, scale[950])

	parts.append(block("html:root", root))

	# --- Contrast-safe semantic colors ---------------------------------------
	if is_default_primary and not s.button_text_color:
		light, dark = {}, {}
	else:
		shades = sorted(scale)
		if s.button_text_color:
			on_primary = safe_color(s.button_text_color, "#ffffff")
		else:
			on_primary = max(("#ffffff", scale[950]), key=lambda c: contrast(c, scale[400]))

		# Light: darkest needed shade, starting at the brand itself.
		down = [x for x in shades if x >= 400]
		link = first_with_contrast(scale, down, "#ffffff", 4.5)
		accent = first_with_contrast(scale, down, "#ffffff", 3.0)
		link_hover = down[min(down.index(link) + 1, len(down) - 1)]
		light = {
			"--tm-on-primary": on_primary,
			"--tm-link": scale[link],
			"--tm-link-hover": scale[link_hover],
			"--tm-accent": scale[accent],
			"--tm-selected-text": scale[link],
		}

		# Dark: lightest needed shade, starting at the brand itself.
		up = [x for x in reversed(shades) if x <= 400]
		dark_bg = neutrals["dark-surface"]
		dlink = first_with_contrast(scale, up, dark_bg, 4.5)
		daccent = first_with_contrast(scale, up, dark_bg, 3.0)
		dlink_hover = up[min(up.index(dlink) + 1, len(up) - 1)]
		dark = {
			"--tm-on-primary": on_primary,
			"--tm-link": scale[dlink],
			"--tm-link-hover": scale[dlink_hover],
			"--tm-accent": scale[daccent],
			"--tm-selected-text": scale[dlink_hover],
		}

	parts.append(block('html:root:not([data-theme="dark"])', light))
	parts.append(block('html:root[data-theme="dark"]', dark))

	# --- Toggles ---------------------------------------------------------------
	if not s.show_cobrand_on_page_bar:
		parts.append("html body .page-head .standard-actions::before { content: none; }\n")
	if not s.show_footer:
		parts.append("html body .main-section > #body { min-height: 0; }\n")

	if s.custom_css:
		parts.append("\n/* Custom CSS (Themora Settings → Advanced) */\n")
		parts.append(s.custom_css.strip() + "\n")

	return "".join(parts)
