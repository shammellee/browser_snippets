javascript:
(
  function(){
    var downloads       = document.querySelectorAll('.hduMF')
        ,commands       = []
        ,FILE_EXTENSION = '.jpg'
        ,photographer
        ,anchor
        ,url
        ,match
        ,text_field
        ;

    downloads.forEach(function(download)
    {
      photographer = download.querySelector('a._3XzpS._3myVE._2zITg')
        .text.normalize('NFKD')
        .replace(/[\u0300-\u036F]/g,'')
        .replace(/\s+/g,'-')
        .trim()
        .toLowerCase()
        ;

      anchor = download.querySelector('a[title="Download photo"]')
      ,url   = anchor.href
      ,match = anchor.href.match(/^https?:\/\/.+\/photos\/([^\/]+)\//)
      ;

      if(match.length === 2)
      {
        var id = match[1].toLowerCase();

        commands.push('wget '+'-O '+id +'-'+photographer+FILE_EXTENSION+' '+url);
      }
    });

    text_field = document.createElement('textarea');

    document.body.appendChild(text_field);

    text_field.value = commands.join(';');

    text_field.select();
    document.execCommand('copy');
    document.body.removeChild(text_field);
  }()
);
