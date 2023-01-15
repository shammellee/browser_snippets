javascript:((() =>
{
  const
    ls_key      = 'urldb_urls'
    ,debug_css  = 'background-color:hsl(180,30%,10%);color:hsl(180,30%,80%);padding:0.1em 0.5em'
    ,ls         = localStorage
    ,urls       = {}
    ;

  const url_string = (ls.getItem(ls_key) || '').trim();

  if(url_string)
  {
    if(/\s/.test(url_string))
    {
      url_string
        .split(' ')
        .forEach(u => urls[u] = 0)
        ;
    }
    else
    {
      urls[url_string] = 0;
    }

    const url_count = Object.keys(urls).length;

    console.log(`%c${url_count} URL${url_count > 1 ? 's' : ''}...`, debug_css);
    console.log(Object.keys(urls).join('\n'));
  }
  else
  {
    console.log('%cNo URLs', debug_css);
  }
  void 0;
})())

