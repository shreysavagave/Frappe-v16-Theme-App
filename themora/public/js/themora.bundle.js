// Themora — tiny runtime touches. No Frappe behaviour is changed.
//  - <meta name="theme-color"> so mobile browser chrome matches the brand
//  - `tm-theme` class on <body> as a styling hook
//  - Footer in Desk's own empty <footer> (Desk only)
//  - Bar tools in the Desk bars (Desk only): recent documents
//    (recent_documents.js) and a one-click light/dark theme button
// Footer and bar tools follow Themora Settings, passed in as frappe.boot.themora
// (themora/theme.py → get_boot_info). Colors come from the theme CSS.

import { init_recent_documents, make_recent_button } from "./recent_documents";

(function () {
	const t = (text) => (window.__ ? window.__(text) : text);
	const settings = () => window.frappe?.boot?.themora || {};
	const esc = (text) =>
		String(text ?? "").replace(
			/[&<>"']/g,
			(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
		);
	// Only http(s), mailto, tel and relative links are rendered.
	const safe_url = (url) => (/^(https?:|mailto:|tel:|\/)/i.test(url || "") ? url : "");
	// `.main-section > footer` only exists in Desk (www/desk.html); website /
	// portal pages that also load this bundle are skipped.
	const in_desk = () => !!document.querySelector(".main-section > footer");

	// --- Theme toggle -------------------------------------------------------
	// Same effect as Frappe's own Toggle Theme dialog (theme_switcher.js):
	// set data-theme-mode, re-resolve data-theme, save on the User.
	// Both icons are rendered; CSS shows the moon in light, the sun in dark,
	// so every button on screen stays in sync without re-rendering.
	const ICON_MOON = `<svg class="tm-icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
	const ICON_SUN = `<svg class="tm-icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;

	function is_dark() {
		return document.documentElement.getAttribute("data-theme") === "dark";
	}

	function sync_toggles() {
		const dark = is_dark();
		const label = dark ? t("Switch to light theme") : t("Switch to dark theme");
		document.querySelectorAll(".tm-theme-toggle").forEach((btn) => {
			btn.setAttribute("aria-pressed", String(dark));
			btn.setAttribute("aria-label", label);
			btn.title = label;
		});
	}

	function toggle_theme() {
		const theme = is_dark() ? "light" : "dark";
		const root = document.documentElement;
		root.setAttribute("data-theme-mode", theme);
		if (window.frappe?.ui?.set_theme) frappe.ui.set_theme();
		else root.setAttribute("data-theme", theme);
		if (window.frappe?.boot?.user) frappe.boot.user.desk_theme = theme === "dark" ? "Dark" : "Light";
		sync_toggles();

		window.frappe?.xcall?.("frappe.core.doctype.user.user.switch_theme", {
			theme: theme === "dark" ? "Dark" : "Light",
		});
	}

	function make_toggle(extra_class) {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = `btn-reset tm-bar-btn tm-theme-toggle ${extra_class}`;
		btn.innerHTML = ICON_MOON + ICON_SUN;
		btn.addEventListener("click", toggle_theme);
		return btn;
	}

	// --- Bar tools ------------------------------------------------------------
	// The enabled buttons, in display order, for one bar ("page" or "home").
	function make_bar_tools(where) {
		const s = settings();
		const tools = [];
		if (s.show_recent_documents !== false) tools.push(make_recent_button(`tm-bar-btn-${where}`));
		if (s.show_theme_toggle !== false) tools.push(make_toggle(`tm-bar-btn-${where}`));
		return tools;
	}

	// Pages (and their .page-head) are built lazily as you navigate, so new
	// bars are picked up by a debounced MutationObserver.
	function add_bar_tools() {
		document
			.querySelectorAll(".page-head .standard-actions:not([data-tm-tools])")
			.forEach((actions) => {
				actions.setAttribute("data-tm-tools", "");
				actions.prepend(...make_bar_tools("page"));
			});

		document
			.querySelectorAll("header.desktop-navbar:not([data-tm-tools])")
			.forEach((bar) => {
				const bell = bar.querySelector(".desktop-notifications");
				if (!bell) return;
				bar.setAttribute("data-tm-tools", "");
				bell.before(...make_bar_tools("home"));
			});

		sync_toggles();
	}

	function watch_for_bars() {
		add_bar_tools();
		let queued = false;
		new MutationObserver(() => {
			if (queued) return;
			queued = true;
			requestAnimationFrame(() => {
				queued = false;
				add_bar_tools();
			});
		}).observe(document.body, { childList: true, subtree: true });

		// data-theme can also change from Frappe's own dialog / system theme.
		new MutationObserver(sync_toggles).observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
	}

	function add_footer() {
		const host = document.querySelector(".main-section > footer");
		const s = settings();
		if (!host || host.querySelector(".tm-footer") || s.show_footer === false) return;

		// {year} / {brand} placeholders, filled after escaping plain-text fields.
		const fill = (text) =>
			String(text ?? "")
				.replaceAll("{year}", new Date().getFullYear())
				.replaceAll("{brand}", s.brand_name || "");
		const link = (label, url, cls = "") => {
			const href = safe_url(url);
			const text = esc(fill(label));
			return href
				? `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${text}</a>`
				: `<span class="${cls}">${text}</span>`;
		};

		host.classList.add("tm-footer-host");

		if (s.use_custom_footer) {
			// Written by a System Manager in Themora Settings; rendered as HTML.
			host.innerHTML = `<div class="tm-footer tm-footer-custom" role="contentinfo">${fill(
				s.custom_footer_html
			)}</div>`;
			return;
		}

		const left = [];
		if (s.footer_copyright) left.push(`<span class="tm-footer-copy">${esc(fill(s.footer_copyright))}</span>`);
		if (s.powered_by_name) {
			const label = s.powered_by_label ? `${esc(t(fill(s.powered_by_label)))} ` : "";
			left.push(`<span>${label}${link(s.powered_by_name, s.powered_by_url, "tm-footer-brand")}</span>`);
		}

		const right_url = safe_url(s.footer_link_url);
		const right_label = s.footer_link_label || right_url.replace(/^https?:\/\//, "").replace(/\/$/, "");
		const right = right_label ? link(right_label, right_url) : "";

		if (!left.length && !right) return;

		host.innerHTML = `
			<div class="tm-footer" role="contentinfo">
				<div class="tm-footer-section tm-footer-left">${left.join("")}</div>
				<div class="tm-footer-section tm-footer-right">${right}</div>
			</div>`;
	}

	function apply() {
		let meta = document.querySelector('meta[name="theme-color"]');
		if (!meta) {
			meta = document.createElement("meta");
			meta.name = "theme-color";
			document.head.appendChild(meta);
		}
		// Resolved brand color from the theme CSS (default or Themora Settings).
		const brand = getComputedStyle(document.documentElement).getPropertyValue("--tm-brand-400").trim();
		meta.content = brand || "#40C09C";

		if (document.body) document.body.classList.add("tm-theme");

		if (in_desk()) {
			add_footer();
			const s = settings();
			if (s.show_recent_documents !== false) init_recent_documents();
			if (s.show_recent_documents !== false || s.show_theme_toggle !== false) watch_for_bars();
		}
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", apply, { once: true });
	} else {
		apply();
	}
})();
