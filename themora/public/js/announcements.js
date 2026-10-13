// Announcement bar: live Themora Announcements in a bar above the Desk
// (server side: themora/announcements.py).
//  - First child of .main-section: the full width of the workspace, right of
//    the sidebar (in v16 <body> is a flex row of sidebar + .main-section).
//    .main-section is the scroll container, so the bar scrolls away and
//    Frappe's sticky page bar keeps `top: 0`.
//  - Several live announcements are shown one at a time with ‹ 1/3 › controls.
//  - Dismissals are remembered per browser; editing an announcement brings it back.
//  - Refreshed when one is saved (realtime), every 5 minutes, and shown or
//    hidden on time according to its schedule.

const t = (text) => (window.__ ? window.__(text) : text);
const esc = (text) => frappe.utils.escape_html(String(text ?? ""));

const DISMISSED_KEY = "themora:dismissed-announcements";
const REFRESH_MS = 5 * 60 * 1000;
const TICK_MS = 30 * 1000;
const ICONS = {
	info: `<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>`,
	success: `<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>`,
	warning: `<path d="M10.3 4.3 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/><path d="M12 10v4M12 17h.01"/>`,
	danger: `<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>`,
	brand: `<path d="M4 10v4a1 1 0 0 0 1 1h2l5 4V5L7 9H5a1 1 0 0 0-1 1Z"/><path d="M16 9a4 4 0 0 1 0 6"/>`,
};

let all = []; // from the server, with absolute local start/end timestamps
let index = 0;
let bar = null;

// --- Dismissals (per browser) --------------------------------------------------
function read_dismissed() {
	try {
		return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"));
	} catch {
		return new Set();
	}
}

function dismiss(id) {
	const ids = read_dismissed();
	ids.add(id);
	// Keep only ids that can still matter, so the list never grows unbounded.
	const live = new Set(all.map((a) => a.id));
	try {
		localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids].filter((x) => live.has(x))));
	} catch {
		// storage blocked: dismissal lasts until the next reload
	}
}

// --- Data --------------------------------------------------------------------
async function load() {
	try {
		const rows = await frappe.xcall("themora.announcements.get_active");
		const now = Date.now();
		all = rows.map((a) => ({
			...a,
			starts_at: now + a.starts_in * 1000,
			ends_at: a.ends_in == null ? Infinity : now + a.ends_in * 1000,
		}));
	} catch {
		return; // keep showing what we had
	}
	render();
}

function visible() {
	const now = Date.now();
	const dismissed = read_dismissed();
	return all.filter((a) => a.starts_at <= now && now < a.ends_at && !dismissed.has(a.id));
}

// --- Render ------------------------------------------------------------------
function safe_url(url) {
	return /^(https?:\/\/|\/(?!\/))/i.test(url || "") ? url : "";
}

function render() {
	const items = visible();
	if (!items.length) {
		bar?.remove();
		bar = null;
		return;
	}

	index = Math.min(index, items.length - 1);
	const a = items[index];

	if (!bar) {
		bar = document.createElement("div");
		bar.setAttribute("role", "region");
		bar.setAttribute("aria-label", t("Announcement"));
		bar.addEventListener("click", on_click);
		document.querySelector(".main-section").prepend(bar);
	}

	const url = safe_url(a.link_url);
	const internal = url.startsWith("/");
	const link =
		a.link_label && url
			? `<a class="tm-announcement-link" href="${esc(url)}"${
					internal ? "" : ' target="_blank" rel="noopener"'
			  }>${esc(a.link_label)}</a>`
			: "";
	const pager =
		items.length > 1
			? `<div class="tm-announcement-pager">
					<button type="button" class="btn-reset" data-action="prev" aria-label="${esc(t("Previous announcement"))}">‹</button>
					<span aria-live="polite">${index + 1}/${items.length}</span>
					<button type="button" class="btn-reset" data-action="next" aria-label="${esc(t("Next announcement"))}">›</button>
				</div>`
			: "";
	const close = a.dismissible
		? `<button type="button" class="btn-reset tm-announcement-close" data-action="dismiss"
				aria-label="${esc(t("Dismiss announcement"))}" title="${esc(t("Dismiss"))}">
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
			</button>`
		: "";

	bar.className = `tm-announcement tm-announcement-${a.style in ICONS ? a.style : "info"}`;
	bar.innerHTML = `
		<div class="tm-announcement-body">
			<svg class="tm-announcement-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[a.style] || ICONS.info}</svg>
			<span class="tm-announcement-text">${esc(a.message)}</span>
			${link}
		</div>
		${pager}${close}`;
}

function on_click(e) {
	const action = e.target.closest("[data-action]")?.dataset.action;
	const link = e.target.closest(".tm-announcement-link");
	const items = visible();

	if (action === "prev" || action === "next") {
		index = (index + (action === "next" ? 1 : -1) + items.length) % items.length;
		render();
	} else if (action === "dismiss") {
		dismiss(items[index].id);
		render();
	} else if (link && link.getAttribute("href").startsWith("/desk") && !e.metaKey && !e.ctrlKey) {
		// Desk paths: route inside the app instead of a full page load.
		e.preventDefault();
		frappe.set_route(link.getAttribute("href").replace(/^\/desk\/?/, ""));
	}
}

// --- Public ------------------------------------------------------------------
export function init_announcements() {
	if (!document.querySelector(".main-section")) return;
	load();
	setInterval(load, REFRESH_MS);
	setInterval(render, TICK_MS); // scheduled start / end while the page is open
	frappe.realtime?.on?.("themora_announcements_changed", load);
}
