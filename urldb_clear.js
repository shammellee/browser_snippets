javascript:((()=>{
  const
    ns      = s => `urldb_${s}`
    ,ls_key = ns('urls')
    ,ls     = localStorage
    ;

  ls.removeItem(ls_key);
  ls.setItem(ns('url_count'), 0);
  void 0;
})())

