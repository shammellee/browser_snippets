/*
 * Skillshare Video Extractor
 *
 * Extracts video URLs from Skillshare course pages by clicking through each
 * session item and capturing the m3u8 playlist URLs from network requests.
 *
 * Output: A bash script that downloads all videos using yt-dlp with aria2c.
 *
 * Usage: Run in browser console on a Skillshare course page, or use as bookmarklet.
 */

(async function extractSessionVideos() {
  /*
   * Find all session items (video entries) on the page.
   * The .populated class indicates the list has loaded content.
   */
  const sessionItems = document.querySelectorAll('.session-list.populated .session-item');
  const totalItems = sessionItems.length;

  if (totalItems === 0) {
    console.error('No session items found');
    return;
  }

  /*
   * Calculate padding length for filenames.
   * Ensures consistent numbering (e.g., 01, 02 for <100 videos; 001, 002 for >=100).
   * Minimum of 2 digits for cleaner sorting.
   */
  const padLength = Math.max(2, String(totalItems).length);
  const results = [];

  /*
   * Convert text to a filesystem-safe slug.
   * - Lowercase everything
   * - Replace non-alphanumeric sequences with underscores
   * - Trim leading/trailing underscores
   */
  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /*
   * Network request interception setup.
   *
   * We need to capture m3u8 URLs that are fetched when each video loads.
   * Two approaches are used:
   * 1. Intercept fetch() and XMLHttpRequest to catch requests as they happen
   * 2. Check Performance API for requests that may have already completed
   *
   * seenUrls tracks URLs we've already captured to avoid duplicates.
   * capturedM3U8 stores the most recently seen m3u8 request with timestamp.
   * clickTime records when we clicked an item (to filter old vs new requests).
   */
  const seenUrls = new Set();
  let capturedM3U8 = null;
  let clickTime = 0;
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;

  /*
   * Intercept fetch() calls to capture m3u8 URLs.
   * The url parameter can be a string or a Request object.
   */
  window.fetch = function(url, ...args) {
    const urlStr = typeof url === 'string' ? url : url?.url;
    if (urlStr?.includes('video.m3u8')) {
      capturedM3U8 = { url: urlStr, time: performance.now() };
    }
    return originalFetch.apply(this, [url, ...args]);
  };

  /*
   * Intercept XMLHttpRequest.open() to capture m3u8 URLs.
   * Some video players use XHR instead of fetch.
   */
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (typeof url === 'string' && url.includes('video.m3u8')) {
      capturedM3U8 = { url, time: performance.now() };
    }
    return originalXHROpen.apply(this, [method, url, ...args]);
  };

  /*
   * Wait for an m3u8 URL to be captured after clicking a session item.
   *
   * @param timeout - Maximum time to wait in milliseconds (default 30s)
   * @param isFirstItem - If true, accept pre-loaded URLs (handles case where
   *                      user already had a video selected before running script)
   * @returns Promise<string> - The captured m3u8 URL
   */
  function waitForM3U8(timeout = 30000, isFirstItem = false) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      capturedM3U8 = null;

      const checkSource = () => {
        /*
         * First, check our intercepted network requests.
         * Only accept if the request happened after we clicked (time >= clickTime)
         * and we haven't already captured this URL.
         */
        if (capturedM3U8 && capturedM3U8.time >= clickTime && !seenUrls.has(capturedM3U8.url)) {
          seenUrls.add(capturedM3U8.url);
          resolve(capturedM3U8.url);
          return;
        }

        /*
         * Also check the Performance API for resource timing entries.
         * This catches requests that might have been made before our
         * interceptors were set up, or through other mechanisms.
         */
        const entries = performance.getEntriesByType('resource');
        for (const entry of entries) {
          if (entry.name.includes('video.m3u8') && !seenUrls.has(entry.name)) {
            /*
             * For the first item, accept any m3u8 (might be pre-loaded).
             * For subsequent items, only accept if started after our click.
             */
            if (isFirstItem || entry.startTime >= clickTime) {
              seenUrls.add(entry.name);
              resolve(entry.name);
              return;
            }
          }
        }

        /*
         * Special handling for first item: after 2 seconds, accept any
         * unseen m3u8 URL. This handles the case where the video was
         * already loaded before we started.
         */
        if (isFirstItem && Date.now() - startTime > 2000) {
          for (const entry of entries) {
            if (entry.name.includes('video.m3u8') && !seenUrls.has(entry.name)) {
              seenUrls.add(entry.name);
              resolve(entry.name);
              return;
            }
          }
        }

        /* Timeout - give up waiting for this video */
        if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for video.m3u8'));
          return;
        }

        /* Check again in 500ms */
        setTimeout(checkSource, 500);
      };

      checkSource();
    });
  }

  /*
   * Main extraction loop.
   * Click each session item, wait for its video URL, and record the result.
   */
  for (let i = 0; i < sessionItems.length; i++) {
    const item = sessionItems[i];

    /* Extract rank (lesson number) and title from the DOM */
    const rankEl = item.querySelector('.session-item-rank');
    const titleEl = item.querySelector('.session-item-title');

    /*
     * Get the rank number, stripping any non-digit characters (e.g., "1." -> "1").
     * Fall back to loop index if rank element is missing.
     */
    const rankText = rankEl?.textContent?.trim() || String(i + 1);
    const rank = rankText.replace(/\D/g, '') || String(i + 1);
    const title = titleEl?.textContent?.trim() || `video_${i + 1}`;

    /* Build the output filename: zero-padded index + slugified title + .mp4 */
    const paddedIndex = rank.padStart(padLength, '0');
    const sluggedTitle = slugify(title);
    const filename = `${paddedIndex}_${sluggedTitle}.mp4`;

    console.log(`[${i + 1}/${totalItems}] Processing: ${title}`);

    /* Record when we click so we can filter old vs new network requests */
    clickTime = performance.now();
    item.click();

    try {
      /* Wait for the video's m3u8 URL to appear in network traffic */
      const videoUrl = await waitForM3U8(30000, i === 0);

      results.push({
        index: i + 1,
        rank,
        title,
        filename,
        videoUrl
      });

      console.log(`  ✓ Found: ${videoUrl}`);

      /* Brief delay before processing next item to avoid overwhelming the page */
      await new Promise(r => setTimeout(r, 1000));

    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
      results.push({
        index: i + 1,
        rank,
        title,
        filename,
        videoUrl: null,
        error: error.message
      });
    }
  }

  /*
   * Generate bash script output.
   *
   * Format: Array of "url filename" pairs, then loop through them.
   * Uses yt-dlp with aria2c for fast parallel downloads.
   */
  const videoEntries = results
    .filter(r => r.videoUrl)
    .map(r => `  "${r.videoUrl} ${r.filename}"`);

  const output = `#!/bin/bash

videos=(
${videoEntries.join('\n')}
)

total=\${#videos[@]}
index=0

for entry in "\${videos[@]}"; do
  ((index++))
  url="\${entry% *}"
  filename="\${entry##* }"
  echo "Downloading \$index/\$total: \$filename"
  yt-dlp --downloader aria2c --downloader-args "aria2c: -j 4" --output "\$filename" "\$url"
done
`;

  /* Print the generated script to console */
  console.log('\n=== BASH SCRIPT ===\n');
  console.log(output);
  console.log('===================\n');

  /* Attempt to auto-download the script as a file */
  try {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'download_videos.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('File saved as download_videos.sh');
  } catch (e) {
    console.log('Could not auto-save file. Copy the output above.');
  }

  /* Attempt to copy script to clipboard for convenience */
  try {
    await navigator.clipboard.writeText(output);
    console.log('Output copied to clipboard!');
  } catch (e) {
    console.log('Could not copy to clipboard.');
  }

  /*
   * Restore original fetch/XHR functions.
   * Important to avoid affecting the page's normal operation after we're done.
   */
  window.fetch = originalFetch;
  XMLHttpRequest.prototype.open = originalXHROpen;

  return results;
})();
