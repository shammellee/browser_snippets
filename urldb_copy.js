javascript:((() =>
{
  const
    ls_key      = 'urldb_urls'
    ,ls         = localStorage
    ,urls       = {}
    ,text_field = document.createElement('textarea')
    ;

  (ls.getItem(ls_key) || '')
    .trim()
    .split(' ')
    .forEach(url => urls[url] = 0);

  text_field.value = Object.keys(urls).join('\n');

  document.body.appendChild(text_field);
  text_field.select();
  document.execCommand('copy');
  document.body.removeChild(text_field);
  void 0;
})())

