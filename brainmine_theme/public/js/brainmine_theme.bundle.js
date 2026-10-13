// Brainmine Theme — tiny runtime touches. No Frappe behaviour is changed.
//  - <meta name="theme-color"> so mobile browser chrome matches the brand
//  - `bm-theme` class on <body> as a styling hook
//  - Brainmine.AI footer in Desk's own empty <footer> (Desk only)
//  - One-click light/dark theme button in the Desk bars (Desk only)

(function () {
	const BRAND = "#40C09C";
	const COMPANY = "Brainmine.AI";
	const WEBSITE = "https://www.brainmine.ai";

	const t = (text) => (window.__ ? window.__(text) : text);
	// `.main-section > footer` only exists in Desk (www/desk.html); website /
	// portal pages that also load this bundle are skipped.
	const in_desk = () => !!document.querySelector(".main-section > footer");

	// --- Theme toggle -------------------------------------------------------
	// Same effect as Frappe's own Toggle Theme dialog (theme_switcher.js):
	// set data-theme-mode, re-resolve data-theme, save on the User.
	// Both icons are rendered; CSS shows the moon in light, the sun in dark,
	// so every button on screen stays in sync without re-rendering.
	const ICON_MOON = `<svg class="bm-icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
	const ICON_SUN = `<svg class="bm-icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;

	function is_dark() {
		return document.documentElement.getAttribute("data-theme") === "dark";
	}

	function sync_toggles() {
		const dark = is_dark();
		const label = dark ? t("Switch to light theme") : t("Switch to dark theme");
		document.querySelectorAll(".bm-theme-toggle").forEach((btn) => {
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
		btn.className = `btn-reset bm-theme-toggle ${extra_class}`;
		btn.innerHTML = ICON_MOON + ICON_SUN;
		btn.addEventListener("click", toggle_theme);
		return btn;
	}

	// Pages (and their .page-head) are built lazily as you navigate, so new
	// bars are picked up by a debounced MutationObserver.
	function add_toggles() {
		document
			.querySelectorAll(".page-head .standard-actions:not([data-bm-toggle])")
			.forEach((actions) => {
				actions.setAttribute("data-bm-toggle", "");
				actions.prepend(make_toggle("bm-theme-toggle-page"));
			});

		document
			.querySelectorAll("header.desktop-navbar:not([data-bm-toggle])")
			.forEach((bar) => {
				const bell = bar.querySelector(".desktop-notifications");
				if (!bell) return;
				bar.setAttribute("data-bm-toggle", "");
				bell.before(make_toggle("bm-theme-toggle-home"));
			});

		sync_toggles();
	}

	function watch_for_bars() {
		add_toggles();
		let queued = false;
		new MutationObserver(() => {
			if (queued) return;
			queued = true;
			requestAnimationFrame(() => {
				queued = false;
				add_toggles();
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
		if (!host || host.querySelector(".bm-footer")) return;

		const year = new Date().getFullYear();
		const site = WEBSITE.replace(/^https?:\/\//, "");

		host.classList.add("bm-footer-host");
		host.innerHTML = `
			<div class="bm-footer" role="contentinfo">
				<div class="bm-footer-section bm-footer-left">
					<span class="bm-footer-copy">© ${year}</span>
					<span>${t("Powered by")} <span class="bm-footer-brand">${COMPANY}</span></span>
				</div>
				<div class="bm-footer-section bm-footer-right">
					<a href="${WEBSITE}" target="_blank" rel="noopener">${site}</a>
				</div>
			</div>`;
	}

	function apply() {
		let meta = document.querySelector('meta[name="theme-color"]');
		if (!meta) {
			meta = document.createElement("meta");
			meta.name = "theme-color";
			document.head.appendChild(meta);
		}
		meta.content = BRAND;

		if (document.body) document.body.classList.add("bm-theme");

		if (in_desk()) {
			add_footer();
			watch_for_bars();
		}
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", apply, { once: true });
	} else {
		apply();
	}
})();
