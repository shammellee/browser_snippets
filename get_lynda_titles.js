javascript:
(
  function()
  {
    String.prototype.times = function(count)
    {
      let return_string = '';

      for(var i = 0; i < count; i++)
      {
        return_string += this.valueOf();
      }

      return return_string;
    };

    var text_field = document.createElement('textarea');

    var get_formatted_titles = function()
    {
      var title_class_name    = 'video-name'
          ,titles             = document.querySelectorAll(`.${title_class_name}`)
          ,title_count        = titles.length
          ,title_count_digits = get_digit_count(title_count)
          ,titles__formatted  = []
          ,file_extension     = '.mp4'
          ;

      for(let i = 0; i < title_count; i++)
      {
        let title           = ''
            ,number__padded = pad_value(i + 1, title_count_digits, '0')
            ;

        title += `${number__padded}${file_extension}:${number__padded}_`;
        title += `${sanitize_string(titles[i].textContent)}${file_extension}`;

        titles__formatted.push(title);
      }

      return titles__formatted;
    }

    var pad_value = function(value, total_digits, pad_character)
    {
      let value_count_digits = get_digit_count(value);

      if(total_digits <= value_count_digits)
      {
        return value;
      }

      return `${pad_character.times(total_digits - value_count_digits)}${value}`;
    };

    var get_digit_count = function(number)
    {
      return number.toString().length;
    };

    var sanitize_string = function(string)
    {
      let title__formatted = string;

      title__formatted = title__formatted.trim();
      title__formatted = title__formatted.toLowerCase();
      title__formatted = title__formatted.replace(/[\!\?\;\*\(\)\{\}\#\$\^\=\<\>\,\'\"\“\”\.\\]+/g,'');
      title__formatted = title__formatted.replace(/[\@]/g,'_at_');
      title__formatted = title__formatted.replace(/[+&]/g,'_and_');
      title__formatted = title__formatted.replace(/[\s\|\/_\:\-]+/g,'_');
      title__formatted = title__formatted.replace(/^_/,'');
      title__formatted = title__formatted.replace(/_$/,'');

      return title__formatted;
    };

    document.body.appendChild(text_field);
    text_field.value = get_formatted_titles().join('\n');
    text_field.select();
    document.execCommand('copy');
    document.body.removeChild(text_field);
  }()
)
