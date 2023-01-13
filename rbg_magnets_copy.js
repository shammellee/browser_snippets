javascript:((() =>
{
  const
    magnets     = {}
    ,text_field = document.createElement('textarea')
    ;

  m = Array(
    JSON.parse(localStorage.getItem('magnets')) || []
  )[0].forEach(m => magnets[m] = 0);

  text_field.value = Object.keys(magnets).join('\n');

  document.body.appendChild(text_field);
  text_field.select();
  document.execCommand('copy');
  document.body.removeChild(text_field);
  void 0;
})())

