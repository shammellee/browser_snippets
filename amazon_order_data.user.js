// ==UserScript==
// @name         Amazon Order Data Copier
// @namespace    https://www.amazon.com
// @version      1.0.2
// @description  On Amazon's order history page, add a copy icon to each item that copies its title, ASIN, and order number as a tab-separated row for pasting into a spreadsheet.
// @match        https://www.amazon.com/*/your-account/order-history*
// @match        https://www.amazon.com/gp/your-account/order-history*
// @match        https://www.amazon.com/gp/css/order-history*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function ()
{
  'use strict';

  // Amazon renders each order as an ".order-card", which can hold more than
  // one item -- either because the order held several distinct products, or
  // because a single order shipped in more than one box. Every item in a
  // card shares that card's order number but has its own title and ASIN
  // (Amazon Standard Identification Number, the product's unique
  // 10-character catalog ID), so the order number is read once per card and
  // paired with each item found inside it.
  //
  // Amazon uses two different markup layouts for an item depending on how
  // many products shipped together in the same box: a single item gets an
  // ".item-box" with its title in ".yohtmlc-product-title", while items
  // that shipped alongside others in the same box get a
  // ".yo-enhanced-flex-card" with its title in ".yo-enhanced-title"
  // instead. Both are scanned so no item is missed.
  const ITEM_LAYOUTS =
  [
    {
      item_selector:      '.item-box'
      ,title_selector:    '.yohtmlc-product-title'
    }
    ,{
      item_selector:      '.yo-enhanced-flex-card'
      ,title_selector:    '.yo-enhanced-title'
    }
  ];

  const PROCESSED_ATTR    = 'data-aod-processed';
  const ORDER_NUMBER_RE   = /\d{3}-\d{7}-\d{7}/;
  const ASIN_RE           = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i;

  const COPY_ICON_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      width="14" height="14" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1">
      </path>
    </svg>
  `;

  const CHECK_ICON_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      width="14" height="14" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;

  function inject_styles()
  {
    const style_el = document.createElement('style');

    style_el.textContent = `
      .aod-copy-button
      {
        align-items: center;
        background: #ffd814;
        border-radius: 4px;
        border: none;
        color: #0f1111;
        cursor: pointer;
        display: inline-flex;
        height: 24px;
        justify-content: center;
        margin: 4px 0 0 0;
        padding: 0;
        width: 24px;
      }
      .aod-copy-button:hover
      {
        background: #ffce12;
      }
      .aod-copy-button.aod-copied
      {
        background: #1fea4e;
        color: #074b17;
      }
    `;

    document.head.appendChild(style_el);
  }

  function get_order_number(order_card_el)
  {
    const order_id_el = order_card_el.querySelector('.yohtmlc-order-id');

    if (!order_id_el)
    {
      return '';
    }

    const match = order_id_el.textContent.match(ORDER_NUMBER_RE);

    return match ? match[0] : '';
  }

  function get_item_data(item_el, title_selector, order_number)
  {
    const title_link_el = item_el.querySelector(`${title_selector} a`);

    if (!title_link_el)
    {
      return null;
    }

    const title = `${title_link_el.textContent.trim().toLowerCase()} buy`;
    const href  = title_link_el.getAttribute('href') || '';
    const match = href.match(ASIN_RE);
    const asin  = match ? match[1] : '';

    return { title, asin, order_number };
  }

  function show_copied_feedback(button_el)
  {
    button_el.innerHTML = CHECK_ICON_SVG;
    button_el.classList.add('aod-copied');

    setTimeout(() =>
    {
      button_el.innerHTML = COPY_ICON_SVG;
      button_el.classList.remove('aod-copied');
    }, 1500);
  }

  function escape_html(text)
  {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function copy_item_data(button_el, item_data)
  {
    // Field order: title (lowercased), ASIN, a blank field, order number.
    //
    // A plain tab-separated string is written as a fallback, but Apple
    // Numbers' paste handler doesn't reliably split tab-separated plain
    // text into columns -- it can drop the whole string into a single
    // cell. Spreadsheet apps (Numbers included) read an HTML <table>
    // clipboard flavor instead when one is present, so that's written as
    // the primary format to guarantee each field lands in its own column.
    const fields =
    [
      item_data.title
      ,item_data.asin
      ,''
      ,item_data.order_number
    ];

    // Cells carry an inline style reset (no border, no background, inherit
    // font) so the table brings no visual styling of its own -- otherwise
    // Numbers treats the pasted table as rich content and overwrites the
    // destination cells' existing formatting with the table's implicit
    // look instead of leaving it alone.
    const cell_style = 'border:none;background:transparent;' +
      'font:inherit;font-weight:normal;';
    const plain_row  = fields.join('\t');
    const cells      = fields
      .map((field) => `<td style="${cell_style}">${escape_html(field)}</td>`)
      .join('');
    const html_row   = `<table style="border-collapse:collapse;">` +
      `<tr>${cells}</tr></table>`;

    const clipboard_item = new ClipboardItem(
    {
      'text/plain': new Blob([plain_row], { type: 'text/plain' })
      ,'text/html': new Blob([html_row], { type: 'text/html' })
    });

    navigator.clipboard.write([clipboard_item]).then(() =>
    {
      show_copied_feedback(button_el);
    });
  }

  function add_copy_button(item_el, title_selector, order_number)
  {
    if (item_el.hasAttribute(PROCESSED_ATTR))
    {
      return;
    }

    item_el.setAttribute(PROCESSED_ATTR, 'true');

    const item_data = get_item_data(item_el, title_selector, order_number);

    if (!item_data)
    {
      return;
    }

    const title_div_el = item_el.querySelector(title_selector);
    const button_el    = document.createElement('button');

    button_el.type      = 'button';
    button_el.className = 'aod-copy-button';
    button_el.title     = 'Copy title, ASIN, and order number';
    button_el.innerHTML = COPY_ICON_SVG;

    button_el.addEventListener('click', (event) =>
    {
      event.preventDefault();
      event.stopPropagation();
      copy_item_data(button_el, item_data);
    });

    title_div_el.insertAdjacentElement('afterend', button_el);
  }

  function scan_order_cards()
  {
    document.querySelectorAll('.order-card').forEach((order_card_el) =>
    {
      const order_number = get_order_number(order_card_el);

      ITEM_LAYOUTS.forEach(({ item_selector, title_selector }) =>
      {
        order_card_el.querySelectorAll(item_selector).forEach((item_el) =>
        {
          add_copy_button(item_el, title_selector, order_number);
        });
      });
    });
  }

  // Amazon streams order cards in as the page settles and re-renders parts
  // of the list when the time-period filter changes, without a full
  // navigation -- a MutationObserver catches both. Scans are debounced
  // since our own button insertions also trigger mutations.
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
      scan_order_cards();
    }, 150);
  }

  const observer = new MutationObserver(schedule_scan);

  observer.observe(document.documentElement,
  {
    childList: true
    ,subtree: true
  });

  inject_styles();
  schedule_scan();
})();
