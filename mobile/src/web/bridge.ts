export const websiteBridge = String.raw`
(function(){
 if(window.__labassistNativeBridge)return;window.__labassistNativeBridge=true;
 function send(value){window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({channel:'labassist.web'},value)));}
 function file(url,name){fetch(url).then(function(r){return r.blob();}).then(function(blob){var reader=new FileReader();reader.onload=function(){send({type:'download',name:name||'LabAssist-file',mime:blob.type,data:String(reader.result).split(',')[1]});};reader.onerror=function(){send({type:'error',message:'Could not read this download.'});};reader.readAsDataURL(blob);}).catch(function(){send({type:'error',message:'Could not prepare this download.'});});}
 function download(anchor){if(anchor&&anchor.download&&/^(blob:|data:)/.test(anchor.href)){file(anchor.href,anchor.download);return true;}return false;}
 var click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!download(this))return click.call(this);};
 document.addEventListener('click',function(event){var anchor=event.target&&event.target.closest&&event.target.closest('a');if(download(anchor))event.preventDefault();},true);
 var open=window.open;window.open=function(url,target,features){if(url&&/^(blob:|data:)/.test(String(url))){file(String(url),'LabAssist-document.pdf');return null;}return open.call(window,url,target,features);};
 window.print=function(){var copy=document.documentElement.cloneNode(true);copy.querySelectorAll('script').forEach(function(s){s.remove();});var base=document.createElement('base');base.href=location.href;copy.querySelector('head').prepend(base);send({type:'print',html:'<!doctype html>'+copy.outerHTML});};
})();true;
`;
