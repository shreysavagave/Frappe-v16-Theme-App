// Recent documents: a clock button on the Desk bars that opens a searchable
// list of the documents the user opened last (server side: themora/recent.py).
//  - Every saved form the user opens is recorded (at most once a minute per doc).
//  - The list follows the user across browsers and devices.
//  - Shows the latest "Shown in the Panel" documents; the filter searches all
//    "Kept per User" documents (both in Themora Settings).
//  - Alt+R opens it from anywhere; ↑ / ↓ / Enter / Esc work inside it.

const t = (text) => (window.__ ? window.__(text) : text);
const esc = (text) => frappe.utils.escape_html(String(text ?? ""));

const ICON_CLOCK = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
const TRACK_EVERY_MS = 60 * 1000;

let panel = null;
let anchor = null; // the button the panel is open for
let items = []; // every kept document, newest first, from the server
let active = -1; // keyboard-highlighted row in the filtered list
const last_tracked = new Map(); // "doctype\0name" → timestamp

const settings = () => window.frappe?.boot?.themora || {};

// --- Tracking ----------------------------------------------------------------
function track(frm) {
	if (!frm?.doc || frm.is_new() || frm.meta?.issingle || frm.meta?.istable) return;

	const key = `${frm.doctype}\0${frm.docname}`;
	const now = Date.now();
	if (now - (last_tracked.get(key) || 0) < TRACK_EVERY_MS) return;
	last_tracked.set(key, now);

	frappe
		.xcall("themora.recent.track", { doctype: frm.doctype, name: frm.docname })
		.catch(() => last_tracked.delete(key));
}

// --- Panel -------------------------------------------------------------------
function build_panel() {
	panel = document.createElement("div");
	panel.className = "tm-recent-panel";
	panel.hidden = true;
	panel.setAttribute("role", "dialog");
	panel.setAttribute("aria-label", t("Recent documents"));
	panel.innerHTML = `
		<div class="tm-recent-head">
			<span class="tm-recent-heading">${esc(t("Recent"))}</span>
			<kbd>${esc(frappe.utils.is_mac() ? "⌥ R" : "Alt+R")}</kbd>
		</div>
		<div class="tm-recent-search-wrap">
			<input type="search" class="tm-recent-search" autocomplete="off" spellcheck="false"
				placeholder="${esc(t("Filter recent documents"))}" aria-label="${esc(t("Filter recent documents"))}">
		</div>
		<div class="tm-recent-list" role="listbox" aria-label="${esc(t("Recent documents"))}"></div>
		<div class="tm-recent-foot">
			<button type="button" class="btn-reset tm-recent-clear">${esc(t("Clear history"))}</button>
		</div>`;
	document.body.appendChild(panel);

	const search = panel.querySelector(".tm-recent-search");
	search.addEventListener("input", () => {
		active = filtered().length ? 0 : -1;
		render();
	});
	search.addEventListener("keydown", on_keydown);
	panel.querySelector(".tm-recent-clear").addEventListener("click", clear_history);

	panel.querySelector(".tm-recent-list").addEventListener("click", (e) => {
		const row = e.target.closest(".tm-recent-item");
		// Let Ctrl/Cmd/Shift/middle clicks open a new tab through the href.
		if (!row || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
		e.preventDefault();
		open_item(filtered()[Number(row.dataset.index)]);
	});

	document.addEventListener("mousedown", (e) => {
		if (panel.hidden || panel.contains(e.target) || anchor?.contains(e.target)) return;
		close();
	});
	window.addEventListener("resize", () => !panel.hidden && position());
	frappe.router?.on?.("change", close);
}

function filtered() {
	const q = (panel.querySelector(".tm-recent-search").value || "").trim().toLowerCase();
	if (!q) return items.slice(0, settings().recent_documents_limit || 10);
	return items.filter((d) => `${d.title} ${d.name} ${d.doctype_label}`.toLowerCase().includes(q));
}

function render(state) {
	const list = panel.querySelector(".tm-recent-list");
	const foot = panel.querySelector(".tm-recent-foot");
	foot.hidden = !items.length;

	if (state === "loading" && !items.length) {
		list.innerHTML = `<div class="tm-recent-empty">${esc(t("Loading…"))}</div>`;
		return;
	}
	if (state === "error") {
		list.innerHTML = `<div class="tm-recent-empty">${esc(t("Could not load recent documents."))}</div>`;
		return;
	}

	const rows = filtered();
	if (!rows.length) {
		const msg = items.length ? t("No matches") : t("Documents you open will appear here.");
		list.innerHTML = `<div class="tm-recent-empty">${esc(msg)}</div>`;
		return;
	}

	list.innerHTML = rows
		.map((d, i) => {
			const same = d.title === d.name;
			const meta = [d.doctype_label, same ? null : d.name, frappe.datetime.prettyDate(d.last_opened)]
				.filter(Boolean)
				.map(esc)
				.join(" · ");
			return `
				<a class="tm-recent-item${i === active ? " is-active" : ""}" role="option"
					aria-selected="${i === active}" data-index="${i}"
					href="${esc(frappe.utils.get_form_link(d.doctype, d.name))}">
					<span class="tm-recent-title">${esc(d.title)}</span>
					<span class="tm-recent-meta">${meta}</span>
				</a>`;
		})
		.join("");

	list.querySelector(".is-active")?.scrollIntoView({ block: "nearest" });
}

function position() {
	const rect = anchor.getBoundingClientRect();
	const width = Math.min(360, window.innerWidth - 16);
	const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
	panel.style.width = `${width}px`;
	panel.style.left = `${left}px`;
	panel.style.top = `${rect.bottom + 8}px`;
}

async function load() {
	render("loading");
	try {
		items = await frappe.xcall("themora.recent.get");
		active = items.length ? 0 : -1;
		render();
	} catch {
		render("error");
	}
}

function open(button) {
	if (!panel) build_panel();
	anchor = button;
	anchor.setAttribute("aria-expanded", "true");
	panel.querySelector(".tm-recent-search").value = "";
	panel.hidden = false;
	position();
	render(); // show the previous list right away, then refresh it
	load();
	panel.querySelector(".tm-recent-search").focus();
}

function close() {
	if (!panel || panel.hidden) return;
	panel.hidden = true;
	anchor?.setAttribute("aria-expanded", "false");
}

function toggle(button) {
	if (panel && !panel.hidden && anchor === button) close();
	else open(button);
}

function open_item(doc) {
	if (!doc) return;
	close();
	frappe.set_route("Form", doc.doctype, doc.name);
}

function on_keydown(e) {
	const rows = filtered();
	if (e.key === "ArrowDown" || e.key === "ArrowUp") {
		e.preventDefault();
		if (!rows.length) return;
		const step = e.key === "ArrowDown" ? 1 : -1;
		active = (active + step + rows.length) % rows.length;
		render();
	} else if (e.key === "Enter") {
		e.preventDefault();
		open_item(rows[active]);
	} else if (e.key === "Escape") {
		e.preventDefault();
		const button = anchor;
		close();
		button?.focus();
	}
}

async function clear_history() {
	await frappe.xcall("themora.recent.clear");
	items = [];
	active = -1;
	last_tracked.clear();
	render();
}

// The button nearest the user's eye: the current page bar if any, else the home bar.
function visible_button() {
	return [...document.querySelectorAll(".tm-recent-btn")].find((b) => b.offsetParent !== null);
}

// --- Public ------------------------------------------------------------------
export function make_recent_button(extra_class) {
	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = `btn-reset tm-bar-btn tm-recent-btn ${extra_class}`;
	btn.innerHTML = ICON_CLOCK;
	const label = `${t("Recent documents")} (${frappe.utils.is_mac() ? "⌥R" : "Alt+R"})`;
	btn.title = label;
	btn.setAttribute("aria-label", label);
	btn.setAttribute("aria-haspopup", "dialog");
	btn.setAttribute("aria-expanded", "false");
	btn.addEventListener("click", () => toggle(btn));
	return btn;
}

export function init_recent_documents() {
	$(document).on("form-refresh", (e, frm) => track(frm));

	frappe.ui.keys.add_shortcut({
		shortcut: "alt+r",
		action: () => {
			const btn = visible_button();
			if (btn) toggle(btn);
		},
		description: t("Recent documents"),
		ignore_inputs: true,
	});
}
