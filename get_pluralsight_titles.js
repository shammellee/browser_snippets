javascript:
(
  raw_titles       = [];
  processed_titles = [];

  document.querySelectorAll('.table-of-contents__clip-list-title')
          .forEach(function(item)
          {
            raw_titles.push(item.innerText.toLowerCase());
          });

  raw_titles.forEach(function(title,i)
  {
    _padding           = (raw_titles.length+'').length;
    _title             = title.replace(/[\(\)\[\]:,'"!#\$-+=\?\.]/g,'');
    _title             = _title.replace(/&/g,' and ');
    _title             = _title.replace(/[^\w]+/g,'_');
    _title             = _title.replace(/_$/g,'');
    _title             = '_'+_title+'.mp4';
    _index             = i + 1;
    _title_number      = _index;
    _remainder_padding = _padding-(_index+'').length;

    while(_remainder_padding--)
    {
      _title_number = '0' + _title_number;
    }

    _processed_title = _title_number + '.mp4:' + _title_number + _title;

    processed_titles.push(_processed_title);
  });

  title_field = document.createElement('textarea');

  document.body.appendChild(title_field);

  title_field.value = processed_titles.join('\n');

  title_field.select();
  document.execCommand('copy');
  document.body.removeChild(title_field);
)

