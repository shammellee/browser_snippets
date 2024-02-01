javascript:((() =>
{
  const
    SELECTOR = [
      'ytd-browse'
      ,'ytd-playlist-thumbnail'
      ,'a#thumbnail'
      ,'#overlays'
      ,'ytd-thumbnail-overlay-bottom-panel-renderer'
      ,'yt-formatted-string'
    ].join(' ')
    ,labels = document.querySelectorAll(SELECTOR)
    ,total  = Array.prototype.slice.call(labels)
                  .map(e => parseInt(e.textContent.match(/(\d+)/)[0],10))
                  .reduce((prev, next) => prev + next)
    ;

  alert(`${total} videos`);
  void 0;
})())

