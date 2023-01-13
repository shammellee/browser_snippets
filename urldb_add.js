javascript:((()=>{
  const [ls_key, ls] = ['urls', localStorage];
  const urls         = ls.getItem(ls_key) || '';

  ls.setItem(ls_key, urls + location.href + ' ');
  void 0;
})())
