;(function(root)
{
  const pattern = window.prompt('Enter pattern');

  if(!!pattern)
  {
    const regex = new RegExp(pattern, 'i');

    document
      .querySelectorAll('.card-container')
      .forEach(c => {if(regex.test(c.querySelector('.card-title').getAttribute('title'))) c.style.border = '8px solid red'})
  }
}(window));

