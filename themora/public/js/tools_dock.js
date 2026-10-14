// Tools dock: a slim brand-gradient rail fixed to the right edge of the Desk
// holding the Themora tools (recent documents, theme toggle, …), so they
// stay in reach without crowding the navbar and page bars.
//  - The handle under the tools collapses the rail to a small tab; the choice
//    is remembered per browser.
//  - Phones (< 768px): a round button in the bottom-right corner that opens
//    the tools upward; it closes again on an outside tap or navigation.
// Used when Themora Settings → Tools Position is "Right Dock" (the default).

const t = (text) => (window.__ ? window.__(text) : text);

const ICON_CHEVRON = `<svg class="tm-dock-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`;
const ICON_GRID = `<svg class="tm-dock-grid" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>`;
const STORAGE_KEY = "themora:dock-collapsed";
const phone = window.matchMedia("(max-width: 767.98px)");

let dock = null;
let handle = null;

function remembered_collapsed() {
	try {
		return localStorage.getItem(STORAGE_KEY) === "1";
	} catch {
		return false;
	}
}

function set_collapsed(collapsed, remember = false) {
	dock.classList.toggle("is-collapsed", collapsed);
	handle.setAttribute("aria-expanded", String(!collapsed));
	const label = collapsed ? t("Show tools") : t("Hide tools");
	handle.title = label;
	handle.setAttribute("aria-label", label);
	if (!remember || phone.matches) return;
	try {
		localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
	} catch {
		// private window / blocked storage: the dock still works, it just forgets
	}
}

// Phones always start closed; larger screens restore the last choice.
const initial_collapsed = () => phone.matches || remembered_collapsed();

// Expand the dock if needed and return the tool matching `selector` in it,
// e.g. for a keyboard shortcut pressed while the dock is collapsed.
export function reveal_in_dock(selector) {
	const btn = dock?.querySelector(selector);
	if (btn && dock.classList.contains("is-collapsed")) set_collapsed(false);
	return btn || null;
}

// Position a fixed panel (.tm-popover) for the button that opened it: under a
// bar button; beside the tools dock (left of it, level with the button), or
// above the dock on phones where there is no room beside it.
export function place_popover(panel, anchor) {
	const rect = anchor.getBoundingClientRect();
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const width = Math.min(360, vw - 16);
	const box = anchor.closest(".tm-dock")?.getBoundingClientRect();
	panel.style.width = `${width}px`;
	panel.style.bottom = "";
	panel.style.maxHeight = "";

	if (!box) {
		panel.style.left = `${Math.max(8, Math.min(rect.right - width, vw - width - 8))}px`;
		panel.style.top = `${rect.bottom + 8}px`;
	} else if (vw >= 768 && box.left - width - 16 >= 0) {
		const max_height = Math.min(480, vh - 80); // the CSS max-height
		panel.style.left = `${box.left - width - 8}px`;
		panel.style.top = `${Math.max(8, Math.min(rect.top - 12, vh - max_height - 8))}px`;
	} else {
		panel.style.left = `${vw - width - 8}px`;
		panel.style.top = "auto";
		panel.style.bottom = `${vh - box.top + 8}px`;
		panel.style.maxHeight = `${Math.max(160, box.top - 16)}px`;
	}
}

export function init_tools_dock(tools) {
	if (!tools.length || dock) return;

	dock = document.createElement("div");
	dock.className = "tm-dock";
	dock.setAttribute("role", "toolbar");
	dock.setAttribute("aria-orientation", "vertical");
	dock.setAttribute("aria-label", t("Tools"));

	const list = document.createElement("div");
	list.className = "tm-dock-tools";
	list.append(...tools);

	handle = document.createElement("button");
	handle.type = "button";
	handle.className = "btn-reset tm-dock-handle";
	handle.innerHTML = ICON_CHEVRON + ICON_GRID;
	handle.addEventListener("click", () => set_collapsed(!dock.classList.contains("is-collapsed"), true));

	dock.append(list, handle);
	document.body.appendChild(dock);
	set_collapsed(initial_collapsed());

	phone.addEventListener?.("change", () => set_collapsed(initial_collapsed()));

	// Phones: the open dock covers content, so close it on an outside tap
	// (panels opened from it, marked .tm-popover, count as inside) and on navigation.
	const close_on_phone = () => phone.matches && set_collapsed(true);
	document.addEventListener("mousedown", (e) => {
		if (dock.contains(e.target) || e.target.closest?.(".tm-popover")) return;
		close_on_phone();
	});
	frappe.router?.on?.("change", close_on_phone);
}
