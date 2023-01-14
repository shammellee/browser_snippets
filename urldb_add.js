javascript:((() =>
{
  const
    ls          = localStorage
    ,ns         = s => `urldb_${s}`
    ,ls_key     = ns('urls')
    ,urls       = {}
    ,url_string = ls.getItem(ls_key)
    ;

  (
    (url_string && ('string' === typeof url_string) && url_string.split(' '))
    || []
  )
    .forEach(u => urls[u] = 0)
    ;

  urls[location.href] = 0;

  ls.setItem(ns('url_count'), Object.keys(urls).length);
  ls.setItem(ls_key, Object.keys(urls).join(' ').trim());
  void 0;
})())
