var urls=Array.prototype.slice.call(document.querySelectorAll('[data-e2e=user-post-item')).map(i=>'https://pastedownload.com/tiktok-video-downloader/#url=' + i.querySelector('a').href);
var text_field=document.createElement('textarea');
document.body.appendChild(text_field);
text_field.value=urls.join('\n');
text_field.select();
document.execCommand('copy');
document.body.removeChild(text_field);
void 0;

//bookmark version: javascript:(function(){var text_field=document.createElement('textarea');document.body.appendChild(text_field);text_field.value=Array.prototype.slice.call(document.querySelectorAll('[data-e2e=user-post-item')).map(i=>i.querySelector('a').href).join('\n');text_field.select();document.execCommand('copy');document.body.removeChild(text_field);}())
