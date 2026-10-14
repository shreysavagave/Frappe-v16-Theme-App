// Sticky notes: a note button among the Desk tools that opens a panel of the
// user's private notes (server side: themora/sticky_notes.py).
//  - "On this document": notes on the form that is open; the button's badge
//    shows how many. Pinned ones open the panel when the document is opened.
//  - "Personal": notes not tied to a document; they follow the user everywhere.
//  - No Save button: typing saves after a short pause. A new note is stored
//    once it has some text.
//  - Alt+N opens it from anywhere; Esc closes it.

import { place_popover, reveal_in_dock } from "./tools_dock";

const t = (text) => (window.__ ? window.__(text) : text);
const esc = (text) => frappe.utils.escape_html(String(text ?? ""));

const ICON_NOTE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v10l-6 6H5z"/><path d="M13 20v-6h6"/></svg>`;
const ICON_PLUS = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
const ICON_PIN = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5"/><path d="M9 3h6l-1 7 4 3v2H6v-2l4-3z"/></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>`;
const COLORS = ["Yellow", "Pink", "Green", "Blue", "Purple"];
const SAVE_DELAY_MS = 800;
const DELETE_CONFIRM_MS = 3000;
const MAX_LENGTH = 2000; // same as the server
const phone = window.matchMedia("(max-width: 767.98px)");

let panel = null;
let anchor = null; // the button the panel is open for
let context = null; // { doctype, name, title, key } of the open form, if any
let notes = { doc: [], personal: [] }; // note objects, as shown
let load_seq = 0; // ignores answers to superseded loads
let auto_opened = null; // key of the document whose pinned notes opened the panel
const cards = new WeakMap(); // note → its card element

// --- Data --------------------------------------------------------------------
// While a note has unsaved edits, the local copy wins over a reloaded one.
function merge(incoming, current) {
	const local = new Map(current.filter((n) => n.name).map((n) => [n.name, n]));
	const drafts = current.filter((n) => !n.name);
	const fresh = (n) => ({ ...n, content: n.content || "", color: n.color || "Yellow" });
	return [...drafts, ...incoming.map((n) => (local.get(n.name)?._dirty ? local.get(n.name) : fresh(n)))];
}

async function load() {
	const seq = ++load_seq;
	try {
		const data = await frappe.xcall("themora.sticky_notes.get", {
			doctype: context?.doctype,
			name: context?.name,
		});
		if (seq !== load_seq) return;
		notes = {
			doc: context ? merge(data.doc, notes.doc) : [],
			personal: merge(data.personal, notes.personal),
		};
	} catch {
		return;
	}
	update_badges();
	if (panel && !panel.hidden) render();
	maybe_auto_open();
}

// Pinned notes on the opened document show up by themselves, once per opening.
// Not on phones, where the panel would cover the form.
function maybe_auto_open() {
	if (!context || auto_opened === context.key || phone.matches) return;
	if (!notes.doc.some((n) => n.pinned && n.name)) return;
	if (panel && !panel.hidden) return;
	const btn = visible_button();
	if (!btn) return;
	auto_opened = context.key;
	open(btn, { focus: false });
}

function set_context(next) {
	if ((next?.key || null) === (context?.key || null)) {
		if (next) context.title = next.title;
		return;
	}
	flush_all();
	context = next;
	notes.doc = [];
	update_badges();
	if (panel && !panel.hidden) render();
	load();
}

function on_form(frm) {
	if (!frm?.doc || frm.is_new() || frm.meta?.issingle || frm.meta?.istable) return set_context(null);
	const title_field = frm.meta?.title_field;
	set_context({
		doctype: frm.doctype,
		name: frm.docname,
		title: (title_field && frm.doc[title_field]) || frm.docname,
		key: `${frm.doctype}\0${frm.docname}`,
	});
}

// Leaving a form: forget it until the next form-refresh names a new one.
function on_route_change() {
	close();
	const [view, doctype, name] = frappe.get_route?.() || [];
	if (view !== "Form" || !context || context.doctype !== doctype || context.name !== name) {
		set_context(null);
	}
}

// --- Saving ------------------------------------------------------------------
function queue_save(note) {
	note._dirty = true;
	clearTimeout(note._timer);
	set_status(note, "pending");
	note._timer = setTimeout(() => flush(note), SAVE_DELAY_MS);
}

// Saves run one after another per note, so a new note is created only once.
function flush(note) {
	clearTimeout(note._timer);
	note._timer = null;
	note._chain = (note._chain || Promise.resolve())
		.then(async () => {
			if (!note.name && !note.content.trim()) return set_status(note, "");
			const args = { content: note.content, color: note.color, pinned: note.pinned ? 1 : 0 };
			if (note.name) {
				args.name = note.name;
			} else if (note.section === "doc") {
				args.reference_doctype = note.reference_doctype;
				args.reference_name = note.reference_name;
			}
			set_status(note, "saving");
			const saved = await frappe.xcall("themora.sticky_notes.save", args);
			const created = !note.name;
			note.name = saved.name;
			note.modified = saved.modified;
			if (!note._timer) note._dirty = false;
			set_status(note, "saved");
			if (created) update_badges();
		})
		.catch(() => set_status(note, "error"));
	return note._chain;
}

function flush_all() {
	[...notes.doc, ...notes.personal].filter((n) => n._timer).forEach(flush);
}

function set_status(note, state) {
	const el = cards.get(note)?.querySelector(".tm-note-status");
	if (!el) return;
	el.dataset.state = state;
	el.textContent =
		{
			pending: "",
			saving: t("Saving…"),
			saved: t("Saved"),
			error: t("Not saved"),
		}[state] || "";
}

// --- Actions -----------------------------------------------------------------
function add_note(section) {
	const note = { name: null, content: "", color: "Yellow", pinned: 0, section };
	if (section === "doc") {
		if (!context) return;
		note.reference_doctype = context.doctype;
		note.reference_name = context.name;
		notes.doc.push(note);
	} else {
		notes.personal.unshift(note);
	}
	render();
	cards.get(note)?.querySelector(".tm-note-text").focus();
}

async function delete_note(note) {
	clearTimeout(note._timer);
	note._timer = null;
	const list = notes[note.section];
	const i = list.indexOf(note);
	if (i >= 0) list.splice(i, 1);
	render();
	update_badges();
	if (!note.name) return;
	try {
		await (note._chain || Promise.resolve());
		await frappe.xcall("themora.sticky_notes.delete", { name: note.name });
	} catch {
		load(); // put it back as the server has it
	}
}

// --- Panel -------------------------------------------------------------------
function build_panel() {
	panel = document.createElement("div");
	panel.className = "tm-notes-panel tm-popover";
	panel.hidden = true;
	panel.setAttribute("role", "dialog");
	panel.setAttribute("aria-label", t("Sticky notes"));
	panel.innerHTML = `
		<div class="tm-notes-head">
			<span class="tm-notes-heading">${esc(t("Notes"))}</span>
			<kbd>${esc(frappe.utils.is_mac() ? "⌥ N" : "Alt+N")}</kbd>
		</div>
		<div class="tm-notes-body"></div>`;
	document.body.appendChild(panel);

	panel.addEventListener("keydown", (e) => {
		if (e.key !== "Escape") return;
		e.preventDefault();
		e.stopPropagation();
		const button = anchor;
		close();
		button?.focus();
	});

	document.addEventListener("mousedown", (e) => {
		if (panel.hidden || panel.contains(e.target) || anchor?.contains(e.target)) return;
		close();
	});
	window.addEventListener("resize", () => !panel.hidden && place_popover(panel, anchor));
}

function section_html(section, heading, hint) {
	return `
		<section class="tm-notes-section" data-section="${section}">
			<div class="tm-notes-section-head">
				<span class="tm-notes-section-title" title="${esc(heading)}">${esc(heading)}</span>
				<button type="button" class="btn-reset tm-notes-add" data-section="${section}"
					title="${esc(t("Add note"))}" aria-label="${esc(t("Add note"))}">${ICON_PLUS}</button>
			</div>
			<div class="tm-notes-list"></div>
			<div class="tm-notes-empty">${esc(hint)}</div>
		</section>`;
}

function render() {
	const body = panel.querySelector(".tm-notes-body");

	// Keep the caret where it was if a note is being typed in.
	const focused = document.activeElement?.closest?.(".tm-note");
	const focused_note = focused?._note;
	const caret = focused_note && [document.activeElement.selectionStart, document.activeElement.selectionEnd];

	const doc_heading = context ? `${t(context.doctype)} · ${context.title}` : "";
	body.innerHTML =
		(context
			? section_html("doc", doc_heading, t("No notes on this document yet."))
			: "") + section_html("personal", t("Personal"), t("Personal notes follow you on every page."));

	for (const section of ["doc", "personal"]) {
		const el = body.querySelector(`.tm-notes-section[data-section="${section}"]`);
		if (!el) continue;
		const list = notes[section];
		el.querySelector(".tm-notes-list").append(...list.map((n) => build_card(n, section)));
		el.querySelector(".tm-notes-empty").hidden = list.length > 0;
	}

	body.querySelectorAll(".tm-notes-add").forEach((btn) =>
		btn.addEventListener("click", () => add_note(btn.dataset.section))
	);

	const card = focused_note && cards.get(focused_note);
	if (card) {
		const text = card.querySelector(".tm-note-text");
		text.focus();
		text.setSelectionRange(...caret);
	}
}

function build_card(note, section) {
	note.section = section;
	const card = document.createElement("div");
	card.className = "tm-note";
	card.dataset.color = note.color.toLowerCase();
	card._note = note;
	cards.set(note, card);

	const pin_label = t("Pin: open with this document");
	card.innerHTML = `
		<textarea class="tm-note-text" rows="2" maxlength="${MAX_LENGTH}" spellcheck="true"
			placeholder="${esc(t("Write a note…"))}" aria-label="${esc(t("Note"))}"></textarea>
		<div class="tm-note-foot">
			<div class="tm-note-colors" role="radiogroup" aria-label="${esc(t("Color"))}">
				${COLORS.map(
					(c) => `<button type="button" class="btn-reset tm-note-color" role="radio"
						data-color="${c.toLowerCase()}" data-value="${c}" aria-checked="${c === note.color}"
						title="${esc(t(c))}" aria-label="${esc(t(c))}"></button>`
				).join("")}
			</div>
			<span class="tm-note-status" aria-live="polite"></span>
			${
				section === "doc"
					? `<button type="button" class="btn-reset tm-note-action tm-note-pin" aria-pressed="${!!note.pinned}"
						title="${esc(pin_label)}" aria-label="${esc(pin_label)}">${ICON_PIN}</button>`
					: ""
			}
			<button type="button" class="btn-reset tm-note-action tm-note-delete"
				title="${esc(t("Delete note"))}" aria-label="${esc(t("Delete note"))}">${ICON_TRASH}</button>
		</div>`;

	const text = card.querySelector(".tm-note-text");
	text.value = note.content || "";
	const grow = () => {
		text.style.height = "auto";
		text.style.height = `${Math.min(text.scrollHeight, 240)}px`;
	};
	requestAnimationFrame(grow);
	text.addEventListener("input", () => {
		note.content = text.value;
		grow();
		queue_save(note);
	});
	text.addEventListener("blur", () => note._timer && flush(note));

	card.querySelector(".tm-note-colors").addEventListener("click", (e) => {
		const dot = e.target.closest(".tm-note-color");
		if (!dot || dot.dataset.value === note.color) return;
		note.color = dot.dataset.value;
		card.dataset.color = dot.dataset.color;
		card.querySelectorAll(".tm-note-color").forEach((d) =>
			d.setAttribute("aria-checked", String(d === dot))
		);
		note._dirty = true;
		flush(note);
	});

	card.querySelector(".tm-note-pin")?.addEventListener("click", (e) => {
		note.pinned = note.pinned ? 0 : 1;
		e.currentTarget.setAttribute("aria-pressed", String(!!note.pinned));
		note._dirty = true;
		flush(note);
	});

	// Two steps instead of a dialog, which would close the panel.
	const del = card.querySelector(".tm-note-delete");
	del.addEventListener("click", () => {
		if (!note.content.trim() || del.classList.contains("is-confirming")) return delete_note(note);
		del.classList.add("is-confirming");
		del.title = t("Click again to delete");
		setTimeout(() => {
			del.classList.remove("is-confirming");
			del.title = t("Delete note");
		}, DELETE_CONFIRM_MS);
	});

	return card;
}

function open(button, { focus = true } = {}) {
	if (!panel) build_panel();
	anchor = button;
	anchor.setAttribute("aria-expanded", "true");
	panel.hidden = false;
	render();
	place_popover(panel, anchor);
	load();
	if (!focus) return;
	const section = context ? "doc" : "personal";
	const first = cards.get(notes[section][0])?.querySelector(".tm-note-text");
	if (first) first.focus();
	else add_note(section);
}

function close() {
	if (!panel || panel.hidden) return;
	flush_all();
	// Drop new notes that never got any text.
	for (const section of ["doc", "personal"]) {
		notes[section] = notes[section].filter((n) => n.name || n.content.trim());
	}
	panel.hidden = true;
	anchor?.setAttribute("aria-expanded", "false");
}

function toggle(button) {
	if (panel && !panel.hidden && anchor === button) close();
	else open(button);
}

function update_badges() {
	const count = notes.doc.filter((n) => n.name).length;
	document.querySelectorAll(".tm-notes-btn .tm-notes-badge").forEach((badge) => {
		badge.textContent = count > 9 ? "9+" : String(count);
		badge.hidden = !count;
	});
	const label = count
		? `${t("Sticky notes")} (${count}) (${frappe.utils.is_mac() ? "⌥N" : "Alt+N"})`
		: `${t("Sticky notes")} (${frappe.utils.is_mac() ? "⌥N" : "Alt+N"})`;
	document.querySelectorAll(".tm-notes-btn").forEach((btn) => {
		btn.title = label;
		btn.setAttribute("aria-label", label);
	});
}

// The button nearest the user's eye: a bar button if any is shown, else the
// tools dock (expanded first if it is collapsed).
function visible_button() {
	return (
		[...document.querySelectorAll(".tm-notes-btn")].find((b) => b.offsetParent !== null) ||
		reveal_in_dock(".tm-notes-btn")
	);
}

// --- Public ------------------------------------------------------------------
export function make_notes_button(extra_class) {
	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = `btn-reset tm-bar-btn tm-notes-btn ${extra_class}`;
	btn.innerHTML = `${ICON_NOTE}<span class="tm-notes-badge" hidden></span>`;
	btn.setAttribute("aria-haspopup", "dialog");
	btn.setAttribute("aria-expanded", "false");
	btn.addEventListener("click", () => toggle(btn));
	// Bars are built as pages open, after the first update.
	requestAnimationFrame(update_badges);
	return btn;
}

export function init_sticky_notes() {
	$(document).on("form-refresh", (e, frm) => on_form(frm));
	frappe.router?.on?.("change", on_route_change);
	window.addEventListener("pagehide", flush_all);

	frappe.ui.keys.add_shortcut({
		shortcut: "alt+n",
		action: () => {
			const btn = visible_button();
			if (btn) toggle(btn);
		},
		description: t("Sticky notes"),
		ignore_inputs: true,
	});

	load(); // personal notes, and the first form's notes if it opened already
}
