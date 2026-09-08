// ==UserScript==
// @name         Amazon Cart Deals
// @namespace    https://shammellee.local/tampermonkey
// @version      1.0.0
// @description  Highlights "from $X to $Y" price-change items in the Amazon Cart's "Important messages about items in your Cart" section when the price dropped 10% or more.
// @author       Shammel
// @match        https://www.amazon.com/gp/cart/view.html*
// @match        https://www.amazon.com/cart*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function ()
{
  'use strict';

  var MIN_DROP_PERCENT = 10;         // Minimum percentage decrease to highlight
  var HIGHLIGHT_COLOR  = 'lime';

  // node_parse_price -> parses a "$1,234.56" string into a float
  function parse_price(text)
  {
    var match = text.replace(/,/g, '').match(/[\d.]+/);
    return match ? parseFloat(match[0]) : NaN;
  }

  // node_highlight_message -> checks one price-change message and, if it
  // qualifies, paints its row with a lime green background
  function highlight_message(message_span)
  {
    // Skip messages already processed (Amazon re-renders this section on
    // quantity/remove actions, and the MutationObserver below re-scans it)
    if (message_span.dataset.priceDropChecked === 'true')
    {
      return;
    }
    message_span.dataset.priceDropChecked = 'true';

    var price_spans = message_span.querySelectorAll('.sc-product-price');
    if (price_spans.length < 2)
    {
      return;
    }

    var from_price = parse_price(price_spans[0].textContent);  // "from" price
    var to_price   = parse_price(price_spans[1].textContent);  // "to" price

    if (isNaN(from_price) || isNaN(to_price) || from_price <= 0)
    {
      return;
    }

    var percent_drop = (from_price - to_price) / from_price * 100;

    if (percent_drop >= MIN_DROP_PERCENT)
    {
      var row = message_span.closest('li') || message_span;
      row.style.backgroundColor = HIGHLIGHT_COLOR;
      row.style.borderRadius    = '4px';
      row.style.padding         = '2px 4px';
    }
  }

  // node_scan_cart_messages -> finds every price-change message currently
  // in the "Important messages" section and evaluates each one
  function scan_cart_messages()
  {
    var messages = document.querySelectorAll('span[id^="imb-message-"]');
    messages.forEach(highlight_message);
  }

  scan_cart_messages();

  // Amazon loads/updates this section asynchronously (and re-renders it
  // after cart edits), so keep watching for new messages to check.
  var observer = new MutationObserver(function ()
  {
    scan_cart_messages();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
