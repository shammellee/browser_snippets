javascript:((() =>
{
  const
    ls                     = localStorage
    ,ns                    = s => `urldb_${s}`
    ,ls_key                = ns('urls')
    ,ls_query_selector_key = ns('query_selector')
    ,ls_query_selector     = ls.getItem(ls_query_selector_key) || prompt('Enter query selector').trim()
    ,urls                  = {}
    ,anchors_found         = document.querySelectorAll(ls_query_selector)
    ;

  if(!anchors_found.length)
  {
    alert('No URLs found!');
    ls.removeItem(ls_query_selector_key);

    return;
  }

  ls.setItem(ls_query_selector_key, ls_query_selector);

  const url_string = (ls.getItem(ls_key) || '').trim();

  if(url_string)
    url_string
      .split(' ')
      .forEach(u => {
        urls[u] = 0;
      })
      ;

  anchors_found.forEach(a => urls[a.href] = 0);
  ls.setItem(ns('url_count'), Object.keys(urls).length);
  ls.setItem(ls_key, Object.keys(urls).join(' '));
  void 0;
})())

