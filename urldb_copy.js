javascript:((()=>{
  const
    ls_key      = 'urls'
    ,ls         = localStorage
    ,text_field = document.createElement('textarea')
    ;

  text_field.value = (ls.getItem(ls_key).trim().split(' ')).join('\n');

  document.body.appendChild(text_field);
  text_field.select();
  document.execCommand('copy');
  document.body.removeChild(text_field);
  void 0;
})())

