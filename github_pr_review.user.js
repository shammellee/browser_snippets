// ==UserScript==
// @name         GitHub PR Review
// @namespace    https://github.com
// @version      1.3.0
// @description  On any GitHub "Files changed" (/changes) PR view, collapse every file by default and auto-expand only chosen file types.
// @match        https://github.com/*/*/pull/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function ()
{
  'use strict';

  // The @match above covers the whole PR (not just /changes) on purpose.
  // GitHub switches between PR tabs via pushState (Turbo), not a real
  // navigation, so a script matched only against /changes never gets
  // injected when the user arrives there by clicking the "Files changed"
  // tab -- only a hard refresh triggers a real navigation for the
  // userscript manager to act on. Matching the whole PR instead means the
  // script (and its MutationObserver, below) is already running before
  // that tab click, ready to see the diff headers Turbo streams in.

  // ---------------------------------------------------------------------
  // File patterns to auto-expand. Everything NOT matched by one of these
  // stays collapsed. Each entry is a regular expression tested against the
  // lowercased file path, so a pattern can express more than a plain
  // extension -- see the TypeScript/JavaScript entry, which uses a
  // negative lookbehind to skip test files ("foo.spec.ts" is left
  // collapsed, while "foo.ts" is expanded).
  //
  // Related extensions are grouped into a single alternation -- add a new
  // one to whichever group it belongs to, or append a new pattern.
  //
  // Anchor new patterns with "$" so they match the end of the path;
  // otherwise "\.ts" would also match "foo.tsx" and "foo.ts.snap".
  // ---------------------------------------------------------------------
  const EXPAND_PATTERNS =
  [
    /\.(sa|sc|c)ss$/
    ,/\.vue$/
    ,/\.slim$/
    // ,/(?<!\.(spec|jest))\.[tj]sx?$/
  ];

  // CSS-module class names GitHub uses for the per-file diff header. These
  // are hashed (e.g. "DiffFileHeader-module__diff-file-header__UuNN4"), so
  // we match on the stable, human-readable part of the class name rather
  // than the full string.
  const FILE_HEADER_SELECTOR = '[class*="diff-file-header__"]';

  // Header -> timestamp first seen. On a cold/hard reload, GitHub can flip
  // a header's chevron icon well after the header itself mounts (diff
  // content streams in over the network and swaps the icon class on the
  // existing node). We keep reconciling each header for a short window
  // after first sighting to catch that late flip, then stop -- so we don't
  // fight a user who manually expands a file later on.
  const first_seen   = new WeakMap();
  const RECONCILE_MS = 5000;

  function should_expand(file_path)
  {
    if (!file_path)
    {
      return false;
    }

    const lower_path = file_path.toLowerCase();

    return EXPAND_PATTERNS.some(pattern => pattern.test(lower_path));
  }

  function get_file_path(header)
  {
    // The "Expand all lines: <path>" icon button carries the exact file
    // path (post-rename, for renamed files) in a data attribute -- this is
    // far more reliable than scraping the visible filename text, which
    // contains zero-width marks and, for renamed files, both old and new
    // paths concatenated together.
    const path_button = header.querySelector('button[data-file-path]');

    if (path_button)
    {
      return path_button.getAttribute('data-file-path');
    }

    // Fallback: strip zero-width characters from the visible filename.
    const name_el = header.querySelector('h3');

    return name_el
      ? name_el.textContent.replace(/[\u200B-\u200F\uFEFF]/g, '').trim()
      : null;
  }

  function get_toggle_button(header)
  {
    const buttons = [...header.querySelectorAll('button')];

    return buttons.find(btn =>
    {
      const svg = btn.querySelector('svg');
      const svg_class = svg ? svg.getAttribute('class') || '' : '';

      return /octicon-chevron-(right|down)/.test(svg_class);
    }) || null;
  }

  function is_collapsed(header, toggle_button)
  {
    const svg = toggle_button ? toggle_button.querySelector('svg') : null;
    const svg_class = svg ? svg.getAttribute('class') || '' : '';

    if (svg_class.includes('octicon-chevron-right'))
    {
      return true;
    }

    if (svg_class.includes('octicon-chevron-down'))
    {
      return false;
    }

    // Fallback if the icon shape ever changes: check the header's own
    // "collapsed" modifier class.
    return header.className.includes('collapsed');
  }

  function process_header(header)
  {
    const seen_at = first_seen.get(header);

    // Past the reconciliation window: assume any remaining mismatch is
    // either GitHub's settled final state or a deliberate user toggle, and
    // stop touching this header.
    if (seen_at !== undefined && Date.now() - seen_at > RECONCILE_MS)
    {
      return;
    }

    const toggle_button = get_toggle_button(header);

    // Header may render before its toggle button mounts (GitHub streams
    // diff content in progressively on large PRs). Don't record it as seen
    // until there's a button to act on, so a later scan can still catch it
    // once it exists.
    if (!toggle_button)
    {
      return;
    }

    if (seen_at === undefined)
    {
      first_seen.set(header, Date.now());
    }

    const file_path      = get_file_path(header);
    const want_expanded  = should_expand(file_path);
    const currently_open = !is_collapsed(header, toggle_button);

    if (want_expanded !== currently_open)
    {
      toggle_button.click();
    }
  }

  function scan_for_headers()
  {
    document.querySelectorAll(FILE_HEADER_SELECTOR).forEach(process_header);
  }

  // GitHub's diff view is a client-rendered React app: files can render
  // after the initial load, and more files can be inserted as the list is
  // lazily paginated while scrolling. A MutationObserver catches all of
  // that, plus any client-side navigation between PRs, without depending
  // on GitHub-internal event names.
  let scan_scheduled = false;

  function schedule_scan()
  {
    if (scan_scheduled)
    {
      return;
    }

    scan_scheduled = true;

    setTimeout(() =>
    {
      scan_scheduled = false;
      scan_for_headers();
    }, 150);
  }

  const observer = new MutationObserver(schedule_scan);

  // "attributes" (scoped to "class") catches the chevron icon flipping from
  // a loading placeholder to its final state on an existing node -- a plain
  // childList observer misses that when the header itself doesn't remount.
  observer.observe(document.documentElement,
  {
    childList: true
    ,subtree: true
    ,attributes: true
    ,attributeFilter: ['class']
  });

  // Initial pass in case content is already present (e.g. bfcache restore).
  schedule_scan();
})();
