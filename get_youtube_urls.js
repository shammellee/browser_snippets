javascript:
(
  function()
  {
    var urls = get_items('a.ytd-playlist-thumbnail');

    if (!urls.length){urls = get_items('a.ytd-thumbnail')}

    for(var i=0;i<urls.length;i++)
    {
      urls[i]=urls[i].href;
    }

    text_field=document.createElement('textarea');

    document.body.appendChild(text_field);

    text_field.value=urls.join('\n');
    text_field.select();
    document.execCommand('copy');
    document.body.removeChild(text_field);

    function get_items(s)
    {
      return Array.prototype.slice.call(document.querySelectorAll(s));
    }
  }()
)

javascript:(function(){var urls=get_items('a.ytd-playlist-thumbnail');if(!urls.length){urls=get_items('a.ytd-thumbnail')}for(var i=0;i<urls.length;i++){urls[i]=urls[i].href}text_field=document.createElement('textarea');document.body.appendChild(text_field);text_field.value=urls.join('\n');text_field.select();document.execCommand('copy');document.body.removeChild(text_field);function get_items(s){return Array.prototype.slice.call(document.querySelectorAll(s))}}())

