(()=>{'use strict';
const $=id=>document.getElementById(id);let sourceImage=null,photoBg='#ffffff',deferredPrompt=null,lastLayout=null;let imageTransform={x:0,y:0,scale:1,rotation:0},activeFilter='original';
const presets={ '35x45':[35,45],'30x40':[30,40],'40x60':[40,60],'25x35':[25,35] };
const papers={ '100x150':[100,150],a4:[210,297],a5:[148,210],'130x180':[130,180] };
function dimensions(){let v=$('preset').value;return v==='custom'?[Math.max(10,+$('customW').value||35),Math.max(10,+$('customH').value||45)]:presets[v]}
function paperSize(){let v=$('paper').value;return papers[v]}
function mmPx(mm,dpi){return Math.round(mm/25.4*dpi)}
function makeLayout(){const [pw,ph]=paperSize(),[w,h]=dimensions(),gap=Math.max(0,+$('gap').value||0),count=Math.min(60,Math.max(1,+$('count').value||1));let cols=Math.max(1,Math.floor((pw+gap)/(w+gap))),rows=Math.max(1,Math.floor((ph+gap)/(h+gap)));let fit=Math.min(count,cols*rows);return {pw,ph,w,h,gap,count,cols,rows,fit}}
function render(){let l=makeLayout();lastLayout=l;let dpi=+$('dpi').value;let scale=Math.min(3.2,470/Math.max(l.pw,l.ph));let sheet=$('sheet');sheet.style.setProperty('--paper-w',l.pw+'mm');sheet.style.setProperty('--paper-h',l.ph+'mm');sheet.style.setProperty('--photo-w',l.w+'mm');sheet.style.setProperty('--photo-h',l.h+'mm');sheet.style.setProperty('--gap-mm',l.gap+'mm');sheet.style.setProperty('--cols',l.cols);sheet.style.width=(l.pw*scale)+'px';sheet.style.height=(l.ph*scale)+'px';sheet.style.gridTemplateColumns='repeat('+l.cols+','+(l.w*scale)+'px)';sheet.style.gridAutoRows=(l.h*scale)+'px';sheet.style.gap=(l.gap*scale)+'px';sheet.style.background=$('bg').value;sheet.innerHTML='';
if(!sourceImage){$('transformEditor').hidden=true;$('colorStudio').hidden=true;sheet.innerHTML='<div class="empty-state"><span>▧</span><b>ستظهر ورقة الطباعة هنا</b><small>ارفع صورة للبدء</small></div>';return}
$('transformEditor').hidden=false;$('colorStudio').hidden=false;updateTransformEditor();updateColorStudio();for(let i=0;i<l.fit;i++){let cell=document.createElement('div');cell.className='photo-cell';cell.style.width=(l.w*scale)+'px';cell.style.height=(l.h*scale)+'px';cell.style.background=photoBg;let img=document.createElement('img');img.src=sourceImage;img.alt='صورة شخصية';img.style.filter=getColorFilter();img.style.transform=getTransformCSS();cell.appendChild(img);sheet.appendChild(cell)}
$('sheetMeta').textContent=l.pw+' × '+l.ph+' مم · '+l.fit+' / '+l.count+' نسخ';$('fitInfo').textContent='يتسع '+l.fit+' صور في الورقة'+(l.fit<l.count?' · يلزم '+Math.ceil(l.count/l.fit)+' أوراق':'');$('status').textContent='المعاينة جاهزة';$('status').classList.add('active');$('jpgBtn').disabled=$('pngBtn').disabled=$('printBtn').disabled=false}
function loadFile(file){if(!file||!file.type.startsWith('image/'))return;let reader=new FileReader();reader.onload=()=>{let im=new Image();im.onload=()=>{sourceImage=reader.result;resetTransform();activeFilter='original';$('editBrightness').value=$('editContrast').value=$('editSaturation').value=100;render()};im.src=reader.result};reader.readAsDataURL(file)}

const filterNames={original:'أصلي',bright:'مشرق',portrait:'بورتريه',warm:'دافئ',cool:'بارد',mono:'أبيض وأسود',vintage:'كلاسيكي'};
const filterStyles={original:'none',bright:'brightness(1.16) contrast(1.05) saturate(1.18)',portrait:'brightness(1.07) contrast(.96) saturate(.94)',warm:'sepia(.18) saturate(1.2) brightness(1.04)',cool:'hue-rotate(10deg) saturate(.92) contrast(1.04)',mono:'grayscale(1)',vintage:'sepia(.32) contrast(.92) saturate(.82)'};
function getColorFilter(){let base=filterStyles[activeFilter]||'';return (base==='none'?'':base+' ')+'brightness('+(+$('editBrightness').value/100)+') contrast('+(+$('editContrast').value/100)+') saturate('+(+$('editSaturation').value/100)+')'}
function getTransformCSS(){return 'translate('+imageTransform.x+'%,'+imageTransform.y+'%) scale('+imageTransform.scale+') rotate('+imageTransform.rotation+'deg)'}
function updateColorStudio(){if(!sourceImage)return;$('beforePhoto').src=sourceImage;$('afterPhoto').src=sourceImage;$('afterPhoto').style.filter=getColorFilter();$('activeFilterName').textContent=filterNames[activeFilter];document.querySelectorAll('.filter-chip').forEach(b=>b.classList.toggle('active',b.dataset.filter===activeFilter))}
function updateTransformEditor(){if(!sourceImage)return;let [w,h]=dimensions();$('transformFrame').style.aspectRatio=w+'/'+h;if($('transformImage').getAttribute('src')!==sourceImage)$('transformImage').src=sourceImage;$('transformImage').style.transform=getTransformCSS();$('transformImage').style.filter=getColorFilter();$('transformScale').value=imageTransform.scale;$('transformRotate').value=imageTransform.rotation}
function resetTransform(){imageTransform={x:0,y:0,scale:1,rotation:0};updateTransformEditor()}
function drawEditedPhoto(ctx,img,x,y,w,h){ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.translate(x+w/2+imageTransform.x/100*w,y+h/2+imageTransform.y/100*h);ctx.rotate(imageTransform.rotation*Math.PI/180);ctx.scale(imageTransform.scale,imageTransform.scale);ctx.filter=getColorFilter();let ratio=Math.max(w/img.width,h/img.height),dw=img.width*ratio,dh=img.height*ratio;ctx.drawImage(img,-dw/2,-dh/2,dw,dh);ctx.restore()}


let activePointer=null,dragStart=null;
const transformSurface=$('transformFrame');
transformSurface.addEventListener('pointerdown',e=>{
 if(!sourceImage)return;
 const handle=e.target.closest('[data-handle]')?.dataset.handle||'move';
 const r=transformSurface.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 activePointer=e.pointerId;
 try{transformSurface.setPointerCapture(activePointer)}catch(_){}
 dragStart={handle,x:e.clientX,y:e.clientY,tx:imageTransform.x,ty:imageTransform.y,scale:imageTransform.scale,rotation:imageTransform.rotation,dist:Math.max(8,Math.hypot(e.clientX-cx,e.clientY-cy)),angle:Math.atan2(e.clientY-cy,e.clientX-cx)};
 e.preventDefault();
});
transformSurface.addEventListener('pointermove',e=>{
 if(activePointer!==e.pointerId||!dragStart)return;
 const r=transformSurface.getBoundingClientRect(),dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y;
 if(dragStart.handle==='move'){
  imageTransform.x=Math.max(-200,Math.min(200,dragStart.tx+dx/r.width*100));
  imageTransform.y=Math.max(-200,Math.min(200,dragStart.ty+dy/r.height*100));
 }else if(dragStart.handle==='scale'){
  const cx=r.left+r.width/2,cy=r.top+r.height/2;
  const distance=Math.hypot(e.clientX-cx,e.clientY-cy);
  imageTransform.scale=Math.max(.25,Math.min(4.5,dragStart.scale*(distance/dragStart.dist)));
 }else if(dragStart.handle==='rotate'){
  const angle=Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2));
  let delta=(angle-dragStart.angle)*180/Math.PI;
  if(delta>180)delta-=360;if(delta< -180)delta+=360;
  imageTransform.rotation=dragStart.rotation+delta;
 }
 updateTransformEditor();
});
function endTransform(e){
 if(activePointer!==e.pointerId)return;
 activePointer=null;dragStart=null;
 try{if(transformSurface.hasPointerCapture(e.pointerId))transformSurface.releasePointerCapture(e.pointerId)}catch(_){}
 render();
}
transformSurface.addEventListener('pointerup',endTransform);
transformSurface.addEventListener('pointercancel',endTransform);
transformSurface.addEventListener('lostpointercapture',()=>{activePointer=null;dragStart=null});
$('transformScale').min='.25';$('transformScale').max='4.5';
$('transformScale').oninput=e=>{imageTransform.scale=+e.target.value;updateTransformEditor()};
$('transformScale').onchange=render;
$('transformRotate').oninput=e=>{imageTransform.rotation=+e.target.value;updateTransformEditor()};
$('transformRotate').onchange=render;
$('rotateLeft').onclick=()=>{imageTransform.rotation-=90;updateTransformEditor();render()};
$('rotateRight').onclick=()=>{imageTransform.rotation+=90;updateTransformEditor();render()};
$('transformReset').onclick=()=>{resetTransform();render()};
document.querySelectorAll('.filter-chip').forEach(b=>b.onclick=()=>{activeFilter=b.dataset.filter;updateColorStudio();updateTransformEditor();render()});
$('colorReset').onclick=()=>{activeFilter='original';$('editBrightness').value=$('editContrast').value=$('editSaturation').value=100;updateColorStudio();updateTransformEditor();render()};
['editBrightness','editContrast','editSaturation'].forEach(id=>$(id).addEventListener('input',()=>{updateColorStudio();updateTransformEditor();render()}));

function renderExport(type){if(!sourceImage)return;let l=lastLayout||makeLayout(),dpi=+$('dpi').value,canvas=document.createElement('canvas');canvas.width=mmPx(l.pw,dpi);canvas.height=mmPx(l.ph,dpi);let ctx=canvas.getContext('2d');ctx.fillStyle=$('bg').value;ctx.fillRect(0,0,canvas.width,canvas.height);let img=new Image();img.onload=()=>{let x0=0,y0=0;for(let i=0;i<l.fit;i++){let col=i%l.cols,row=Math.floor(i/l.cols),x=mmPx(col*(l.w+l.gap),dpi),y=mmPx(row*(l.h+l.gap),dpi),w=mmPx(l.w,dpi),h=mmPx(l.h,dpi);ctx.fillStyle=photoBg;ctx.fillRect(x,y,w,h);drawEditedPhoto(ctx,img,x,y,w,h);ctx.strokeStyle='#e84c59';ctx.lineWidth=Math.max(1,dpi/300);ctx.strokeRect(x+.5,y+.5,w-1,h-1)}canvas.toBlob(blob=>{if(!blob)return;let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='seif-id-studio-'+l.pw+'x'+l.ph+'mm.'+type;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)},type==='jpg'?'image/jpeg':'image/png',.96)};img.src=sourceImage}
$('photoInput').addEventListener('change',e=>loadFile(e.target.files[0]));$('dropZone').addEventListener('dragover',e=>{e.preventDefault();$('dropZone').classList.add('drag')});$('dropZone').addEventListener('dragleave',()=>$('dropZone').classList.remove('drag'));$('dropZone').addEventListener('drop',e=>{e.preventDefault();$('dropZone').classList.remove('drag');loadFile(e.dataTransfer.files[0])});
['preset','customW','customH','paper','count','dpi','gap','bg'].forEach(id=>$(id).addEventListener('change',()=>{if(id==='preset')$('customFields').hidden=$('preset').value!=='custom';render()}));
$('buildBtn').onclick=render;$('jpgBtn').onclick=()=>renderExport('jpg');$('pngBtn').onclick=()=>renderExport('png');$('printBtn').onclick=()=>window.print();$('resetBtn').onclick=()=>{sourceImage=null;$('photoInput').value='';$('preset').value='35x45';$('paper').value='100x150';$('count').value=8;$('dpi').value=300;$('gap').value=2;$('bg').value='#ffffff';photoBg='#ffffff';document.querySelectorAll('.swatch').forEach((b,i)=>b.classList.toggle('selected',i===0));$('customFields').hidden=true;render();$('status').textContent='بانتظار الصورة';$('status').classList.remove('active');$('jpgBtn').disabled=$('pngBtn').disabled=$('printBtn').disabled=true};
document.querySelectorAll('.swatch').forEach(b=>b.onclick=()=>{photoBg=b.dataset.photoBg;document.querySelectorAll('.swatch').forEach(x=>x.classList.toggle('selected',x===b));render()});

const cameraVideo=$('cameraVideo');let cameraStream=null,cameraFacing='environment',cameraGridOn=false,cameraTorchOn=false,cameraTimerId=null;
function cameraTrack(){return cameraStream&&cameraStream.getVideoTracks()[0]}
function cameraFilter(){let effect=$('cameraEffect').value,bright=+$('cameraBrightness').value/100,contrast=+$('cameraContrast').value/100,sat=+$('cameraSaturation').value/100;const presets={none:[1,1,1],vivid:[1.04,1.12,1.28],soft:[1.05,.92,.9],warm:[1.06,1.02,1.08],mono:[1,1,0]};let p=presets[effect]||presets.none;cameraVideo.style.setProperty('--cam-bright',bright*p[0]);cameraVideo.style.setProperty('--cam-contrast',contrast*p[1]);cameraVideo.style.setProperty('--cam-saturate',sat*p[2])}
function cameraQuality(){let v=$('cameraResolution').value;if(v==='4k')return {width:{ideal:3840},height:{ideal:2160}};if(v==='1080')return {width:{ideal:1920},height:{ideal:1080}};if(v==='720')return {width:{ideal:1280},height:{ideal:720}};return {width:{ideal:4096},height:{ideal:4096}}}
async function startCamera(){if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){$('cameraStatus').textContent='المتصفح لا يدعم الكاميرا أو يجب فتح الموقع عبر HTTPS.';return}stopCamera();cameraFacing=$('cameraFacing').value;try{cameraStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:cameraFacing},...cameraQuality()}});cameraVideo.srcObject=cameraStream;await cameraVideo.play();cameraVideo.classList.add('active');cameraVideo.classList.toggle('front',cameraFacing==='user');$('cameraPlaceholder').hidden=true;$('startCameraBtn').disabled=true;$('stopCameraBtn').disabled=false;$('switchCameraBtn').disabled=false;$('captureBtn').disabled=false;$('cameraGridBtn').disabled=false;$('cameraStatus').textContent='الكاميرا تعمل: '+cameraVideo.videoWidth+' × '+cameraVideo.videoHeight+' بكسل.';cameraFilter();updateCameraCapabilities()}catch(err){cameraStream=null;$('cameraStatus').textContent=err.name==='NotAllowedError'?'لم تسمح بإذن الكاميرا. فعّل الإذن من إعدادات المتصفح.':err.name==='NotFoundError'?'لم يتم العثور على كاميرا.':'تعذر تشغيل الكاميرا: '+err.message}}
function stopCamera(){if(cameraTimerId){clearInterval(cameraTimerId);cameraTimerId=null}$('cameraCountdown').hidden=true;if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;cameraVideo.srcObject=null;cameraVideo.classList.remove('active','front');$('cameraPlaceholder').hidden=false;$('startCameraBtn').disabled=false;$('stopCameraBtn').disabled=true;$('switchCameraBtn').disabled=true;$('captureBtn').disabled=true;$('cameraGridBtn').disabled=true;$('cameraTorchBtn').disabled=true;$('zoomControl').hidden=true}
function updateCameraCapabilities(){let track=cameraTrack(),caps=track&&track.getCapabilities?track.getCapabilities():{};let zoom=caps.zoom;if(zoom){$('zoomControl').hidden=false;$('cameraZoom').min=zoom.min;$('cameraZoom').max=zoom.max;$('cameraZoom').step=zoom.step||.1;$('cameraZoom').value=track.getSettings().zoom||zoom.min}else $('zoomControl').hidden=true;$('cameraTorchBtn').disabled=!caps.torch;$('cameraTorchBtn').textContent='الفلاش'+(caps.torch?'':' (غير مدعوم)')}
async function setCameraConstraint(key,value){let t=cameraTrack();if(!t)return;try{await t.applyConstraints({advanced:[{[key]:value}]})}catch(e){$('cameraStatus').textContent='هذا التحكم غير مدعوم في الكاميرا الحالية.'}}
async function capturePhoto(){if(!cameraStream||!cameraVideo.videoWidth)return;let seconds=+$('cameraTimer').value;if(seconds>0){let left=seconds;$('cameraCountdown').hidden=false;$('cameraCountdown').textContent=left;cameraTimerId=setInterval(()=>{left--;$('cameraCountdown').textContent=left;if(left<=0){clearInterval(cameraTimerId);cameraTimerId=null;$('cameraCountdown').hidden=true;captureNow()}},1000)}else captureNow()}
function captureNow(){let canvas=document.createElement('canvas');canvas.width=cameraVideo.videoWidth;canvas.height=cameraVideo.videoHeight;let ctx=canvas.getContext('2d');let effect=$('cameraEffect').value,bright=+$('cameraBrightness').value/100,contrast=+$('cameraContrast').value/100,sat=+$('cameraSaturation').value/100,p={none:[1,1,1],vivid:[1.04,1.12,1.28],soft:[1.05,.92,.9],warm:[1.06,1.02,1.08],mono:[1,1,0]}[effect];ctx.filter='brightness('+(bright*p[0])+') contrast('+(contrast*p[1])+') saturate('+(sat*p[2])+')';ctx.drawImage(cameraVideo,0,0,canvas.width,canvas.height);sourceImage=canvas.toDataURL('image/jpeg',.96);resetTransform();activeFilter='original';$('editBrightness').value=$('editContrast').value=$('editSaturation').value=100;render();$('cameraStatus').textContent='تم التقاط الصورة وتحميلها إلى مساحة تجهيز الطباعة. يمكنك الآن ضبط المقاس والنسخ.';document.querySelector('.preview-panel').scrollIntoView({behavior:'smooth',block:'start'})}
$('startCameraBtn').onclick=startCamera;$('stopCameraBtn').onclick=stopCamera;$('captureBtn').onclick=capturePhoto;$('switchCameraBtn').onclick=()=>{$('cameraFacing').value=$('cameraFacing').value==='user'?'environment':'user';startCamera()};$('cameraFacing').onchange=()=>{if(cameraStream)startCamera()};$('cameraResolution').onchange=()=>{if(cameraStream)startCamera()};$('cameraGridBtn').onclick=()=>{cameraGridOn=!cameraGridOn;$('cameraGrid').hidden=!cameraGridOn;$('cameraGridBtn').textContent=cameraGridOn?'إخفاء الشبكة':'شبكة التكوين'};$('cameraTorchBtn').onclick=async()=>{cameraTorchOn=!cameraTorchOn;await setCameraConstraint('torch',cameraTorchOn);$('cameraTorchBtn').textContent=cameraTorchOn?'إيقاف الفلاش':'تشغيل الفلاش'};$('cameraZoom').oninput=e=>setCameraConstraint('zoom',+e.target.value);['cameraBrightness','cameraContrast','cameraSaturation','cameraEffect'].forEach(id=>$(id).addEventListener('input',cameraFilter));window.addEventListener('pagehide',stopCamera);

$('themeBtn').onclick=()=>document.body.classList.toggle('dark');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').hidden=false});$('installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').hidden=true};
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
})();