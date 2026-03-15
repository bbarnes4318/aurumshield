/* ================================================================
   DOM SIMULATOR — Pure DOM manipulation utilities for autopilot
   
   Rules:
   1. Every function returns a Promise<void> that resolves when
      the animation/mutation is complete.
   2. All selectors support [data-tour="..."] attributes.
   3. Functions are abort-aware via AbortSignal.
   4. No React state — these operate directly on the DOM.
   ================================================================ */

/* ---------- Helpers ---------- */

function waitMs(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

function resolveElement(selector: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(selector);
}

/** Wait for element to appear in DOM, with timeout */
async function waitForElement(
  selector: string,
  timeoutMs: number = 5000,
  signal?: AbortSignal,
): Promise<HTMLElement | null> {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (signal?.aborted) return null;
    const el = resolveElement(selector);
    if (el) return el;
    await waitMs(100, signal).catch(() => null);
  }
  console.warn(`[domSimulator] Element not found: ${selector}`);
  return null;
}

/* ---------- Ghost Typing ---------- */

/**
 * Programmatically type text into an input field character by character.
 * Dispatches native InputEvent for React compatibility.
 */
export async function ghostType(
  selector: string,
  text: string,
  charDelayMs: number = 50,
  signal?: AbortSignal,
): Promise<void> {
  const el = await waitForElement(selector, 5000, signal);
  if (!el) return;

  // Focus the element
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.focus();
    el.value = "";

    for (let i = 0; i < text.length; i++) {
      if (signal?.aborted) return;
      el.value += text[i];
      // Dispatch native input event for React's synthetic event system
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        el instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(el, el.value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      await waitMs(charDelayMs, signal).catch(() => {});
    }
  } else {
    // For contentEditable or generic elements
    el.focus();
    el.textContent = "";
    for (let i = 0; i < text.length; i++) {
      if (signal?.aborted) return;
      el.textContent += text[i];
      await waitMs(charDelayMs, signal).catch(() => {});
    }
  }
}

/* ---------- Element Highlight ---------- */

const HIGHLIGHT_CLASS =
  "ring-2 ring-[#c6a86b] ring-offset-4 ring-offset-slate-950 shadow-[0_0_30px_rgba(198,168,107,0.25)] transition-all duration-300";

/**
 * Adds a gold ring highlight to an element, then removes it.
 */
export async function highlightElement(
  selector: string,
  durationMs: number = 2000,
  signal?: AbortSignal,
): Promise<void> {
  const el = await waitForElement(selector, 5000, signal);
  if (!el) return;

  // Ensure element is scrolled into view
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  await waitMs(300, signal).catch(() => {});

  const classes = HIGHLIGHT_CLASS.split(" ");
  el.classList.add(...classes);

  await waitMs(durationMs, signal).catch(() => {});

  if (!signal?.aborted) {
    el.classList.remove(...classes);
  }
}

/* ---------- Simulate Click ---------- */

/**
 * Finds element, scrolls into view, dispatches click MouseEvent.
 */
export async function simulateClick(
  selector: string,
  signal?: AbortSignal,
): Promise<void> {
  const el = await waitForElement(selector, 5000, signal);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  await waitMs(300, signal).catch(() => {});

  el.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    }),
  );
}

/* ---------- Flash Badge ---------- */

/**
 * Locates a status badge, transitions text content and background color.
 * Creates a brief emerald or amber flash effect.
 */
export async function flashBadge(
  selector: string,
  fromText: string,
  toText: string,
  colorClass: string = "bg-emerald-500/20 text-emerald-400",
  signal?: AbortSignal,
): Promise<void> {
  const el = await waitForElement(selector, 5000, signal);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  await waitMs(200, signal).catch(() => {});

  // Show "from" state briefly
  el.textContent = fromText;
  await waitMs(800, signal).catch(() => {});

  if (signal?.aborted) return;

  // Flash transition
  el.style.transition = "all 0.5s ease";
  el.textContent = toText;
  const flashClasses = colorClass.split(" ");
  el.classList.add(...flashClasses);

  // Brief bright flash
  el.style.boxShadow = "0 0 20px rgba(63, 174, 122, 0.4)";
  await waitMs(1500, signal).catch(() => {});

  if (!signal?.aborted) {
    el.style.boxShadow = "";
    // Keep the badge color — do NOT remove classes
  }
}

/* ---------- Scroll To ---------- */

/**
 * Smooth scroll element into center of viewport.
 */
export async function scrollToElement(
  selector: string,
  signal?: AbortSignal,
): Promise<void> {
  const el = await waitForElement(selector, 5000, signal);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  await waitMs(500, signal).catch(() => {});
}

/* ---------- Type Terminal Output ---------- */

/**
 * Appends monospaced lines sequentially to simulate terminal output.
 * The target element should be a container (pre, div) where lines are appended.
 */
export async function typeTerminalOutput(
  selector: string,
  lines: string[],
  lineDelayMs: number = 150,
  signal?: AbortSignal,
): Promise<void> {
  const el = await waitForElement(selector, 5000, signal);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  
  for (const line of lines) {
    if (signal?.aborted) return;

    const lineEl = document.createElement("div");
    lineEl.style.fontFamily =
      "ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Monaco, Consolas, monospace";
    lineEl.style.fontSize = "0.75rem";
    lineEl.style.color = "#c6a86b";
    lineEl.style.opacity = "0";
    lineEl.style.transform = "translateY(4px)";
    lineEl.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    lineEl.textContent = line;
    el.appendChild(lineEl);

    // Trigger animation
    requestAnimationFrame(() => {
      lineEl.style.opacity = "1";
      lineEl.style.transform = "translateY(0)";
    });

    // Scroll container to bottom
    el.scrollTop = el.scrollHeight;
    await waitMs(lineDelayMs, signal).catch(() => {});
  }
}

/* ---------- Wait ---------- */

export { waitMs };
