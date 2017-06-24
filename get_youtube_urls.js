javascript:
(
  function()
  {
    var urls=Array.prototype.slice.call(document.querySelectorAll('a.yt-uix-tile-link'));

    for(var i=0;i<urls.length;i++)
    {
      urls[i]=urls[i].href;
    }

    var text_field=document.createElement('textarea');

    document.body.appendChild(text_field);

    text_field.value=urls.join('\n');

    text_field.select();
    document.execCommand('copy');
    document.body.removeChild(text_field);
  }()
)