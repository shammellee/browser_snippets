// ==UserScript==
// @name         GitHub PR Review
// @namespace    https://github.com
// @version      1.1.0
// @description  On any GitHub "Files changed" (/changes) PR view, collapse every file by default and auto-expand only chosen file types.
// @match        https://github.com/*/*/pull/*/changes*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function ()
{
  'use strict';

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
    ,/(?<!\.spec)\.[tj]sx?$/
  ];

  // CSS-module class names GitHub uses for the per-file diff header. These
  // are hashed (e.g. "DiffFileHeader-module__diff-file-header__UuNN4"), so
  // we match on the stable, human-readable part of the class name rather
  // than the full string.
  const FILE_HEADER_SELECTOR = '[class*="diff-file-header__"]';

  const processed_headers = new WeakSet();

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
    if (processed_headers.has(header))
    {
      return;
    }

    processed_headers.add(header);

    const toggle_button = get_toggle_button(header);

    if (!toggle_button)
    {
      return;
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

  observer.observe(document.documentElement, {childList: true, subtree: true});

  // Initial pass in case content is already present (e.g. bfcache restore).
  schedule_scan();
})();
