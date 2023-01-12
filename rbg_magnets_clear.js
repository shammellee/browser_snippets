var text_field=document.createElement('textarea');
document.body.appendChild(text_field);
text_field.value=(JSON.parse(localStorage.getItem('magnets')) || []).join('\n');
text_field.select();
document.execCommand('copy');
document.body.removeChild(text_field);
void 0;
