(function(){
  var pre=document.getElementById('pre'),pull=document.getElementById('pull'),pct=document.getElementById('pct');
  var calm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function finish(){pre.classList.add('go');setTimeout(function(){pre.classList.add('done')},1100)}
  if(calm){pre.classList.add('done');return}
  requestAnimationFrame(function(){requestAnimationFrame(function(){pull.style.top='calc(100% - 72px)'})});
  var t0=performance.now(),dur=1800;
  (function tick(n){var p=Math.min(1,(n-t0)/dur);pct.textContent=Math.round(p*100)+'%';
    if(p<1)requestAnimationFrame(tick);else setTimeout(finish,250)})(t0);
})();
document.querySelector('nav .brand img').src=document.querySelector('.hero img').src;
var hl=document.getElementById('hl'),hr=document.getElementById('hr'),hi=document.getElementById('hi'),zp=document.getElementById('zp'),stage=document.getElementById('top'),stk=document.getElementById('stk'),navEl=document.querySelector('nav');
var cl=hi.cloneNode(true);cl.removeAttribute('id');cl.setAttribute('aria-hidden','true');hr.appendChild(cl);
var pz=document.querySelectorAll('.pctz');
function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}
function upd(){
  if(document.body.classList.contains("cartview"))return;
  var r=stage.getBoundingClientRect(),max=stage.offsetHeight-stk.offsetHeight;
  var p=Math.min(1,Math.max(0,(navEl.offsetHeight-r.top)/max));
  var pull=Math.min(1,p/.5),open=ease(Math.min(1,Math.max(0,(p-.4)/.5)));
  zp.style.top='calc('+(pull*100)+'% - '+(pull*72)+'px)';
  var zf=Math.min(1,p/.08);
  stage.style.setProperty('--z',zf);
  zp.style.opacity=p>.9?0:(.15+.85*zf);
  hl.style.transform='translateX('+(-open*100)+'%)';
  hr.style.transform='translateX('+(open*100)+'%)';
  var v=String(Math.round(Math.min(1,p/.9)*100)).padStart(3,'0');
  pz.forEach(function(e){e.textContent=v});
}
window.addEventListener('scroll',upd,{passive:true});window.addEventListener('resize',upd);upd();
var WA_NUMBER='';
var toast=document.getElementById('toast'),tt;
document.querySelectorAll('.wa').forEach(function(b){b.addEventListener('click',function(){
  var item=b.getAttribute('data-item')||'a piece';
  if(!WA_NUMBER){toast.textContent='WhatsApp ordering opens soon.';toast.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){toast.classList.remove('show')},2600);return}
  window.open('https://wa.me/'+WA_NUMBER+'?text='+encodeURIComponent('Hi Bad Cop, I want to buy '+item+'.'),'_blank','noopener');
})});

/* ---- cart and orders ----
   WA_NUMBER (above): digits only with country code, e.g. 919XXXXXXXXX
   ORDER_API_URL: endpoint that accepts POST application/json (see order shape in send/summary). Empty = orders wait in the browser outbox. */
var ORDER_API_URL='';
var PRODUCTS={
  contraband:{name:'Contraband Straight Jeans',price:null},
  hotpursuit:{name:'Hot Pursuit Baggy Jeans',price:null},
  interrogation:{name:'Interrogation Tee',price:null},
  nowitnesses:{name:'No Witnesses Tee',price:null}
};
function ls(k,v){try{if(arguments.length>1){localStorage.setItem(k,JSON.stringify(v));return v}return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
function say(m){toast.textContent=m;toast.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){toast.classList.remove('show')},2600)}
function waUrl(t){return WA_NUMBER?'https://wa.me/'+WA_NUMBER+'?text='+encodeURIComponent(t):''}
var cart=(ls('bc_cart')||[]).filter(function(i){return PRODUCTS[i.id]&&i.qty>0}),placed=false,lastMsg='';
var $=function(id){return document.getElementById(id)};
function render(){
  var has=cart.length>0,list=$('cartlist'),total=0,priced=true,n=0;
  $('cartempty').style.display=(has||placed)?'none':'block';
  $('cartbody').style.display=(has&&!placed)?'block':'none';
  list.innerHTML='';
  cart.forEach(function(it,ix){
    var pr=PRODUCTS[it.id];n+=it.qty;
    if(pr.price==null)priced=false;else total+=pr.price*it.qty;
    var row=document.createElement('div');row.className='line';
    row.innerHTML='<div><b></b><small></small></div><div class="qty"><button type="button" aria-label="One fewer">-</button><span></span><button type="button" aria-label="One more">+</button></div><button type="button" class="rm">Remove</button>';
    row.querySelector('b').textContent=pr.name;
    row.querySelector('small').textContent='Size '+it.size;
    row.querySelector('span').textContent=it.qty;
    var bs=row.querySelectorAll('.qty button');
    bs[0].onclick=function(){it.qty--;if(it.qty<1)cart.splice(ix,1);save()};
    bs[1].onclick=function(){it.qty++;save()};
    row.querySelector('.rm').onclick=function(){cart.splice(ix,1);save()};
    list.appendChild(row);
  });
  $('total').textContent=has?(priced?'Total: INR '+total.toLocaleString('en-IN'):'Prices are confirmed on WhatsApp.'):'';
  $('cc').textContent=n;$('cc').hidden=!n;
}
function save(){ls('bc_cart',cart);render()}
document.querySelectorAll('.add').forEach(function(b){b.addEventListener('click',function(){
  var sel=b.closest('.card').querySelector('select'),id=b.getAttribute('data-id');
  if(!sel.value){say('Pick a size first.');sel.classList.add('need');setTimeout(function(){sel.classList.remove('need')},1800);sel.focus();return}
  var f=cart.filter(function(i){return i.id===id&&i.size===sel.value})[0];
  if(f)f.qty++;else cart.push({id:id,size:sel.value,qty:1});
  save();say(PRODUCTS[id].name+' is in your cart.');
})});
function summary(o){
  var l=o.items.map(function(i){return i.qty+' x '+i.name+' (size '+i.size+')'}).join('\n');
  var a=[o.address.line1,o.address.line2,o.address.city,o.address.state,o.address.pincode].filter(Boolean).join(', ');
  return 'Hi Bad Cop, I just placed an order request ('+o.id+').\n\n'+l+'\n\nName: '+o.customer.name+'\nPhone: '+o.customer.phone+'\nAddress: '+a+(o.notes?'\nNotes: '+o.notes:'')+'\n\nPlease confirm availability and payment.';
}
function send(o){
  var queue=function(){var q=ls('bc_outbox')||[];q.push(o);ls('bc_outbox',q);return 'queued'};
  if(!ORDER_API_URL)return Promise.resolve(queue());
  return fetch(ORDER_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)})
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return 'sent'}).catch(queue);
}
function flush(){
  var q=ls('bc_outbox')||[];
  if(!ORDER_API_URL||!q.length)return;
  ls('bc_outbox',[]);q.forEach(send);
}
function placeOrder(){
  if(!cart.length)return;
  var f=$('orderform');
  if(!f.reportValidity())return;
  var g=function(n){return (f.elements[n].value||'').trim()};
  var order={id:'BC-'+Date.now().toString(36).toUpperCase(),createdAt:new Date().toISOString(),status:'new',source:'badcop-site',currency:'INR',
    customer:{name:g('name'),phone:g('phone'),email:g('email')},
    address:{line1:g('line1'),line2:g('line2'),city:g('city'),state:g('state'),pincode:g('pincode')},
    notes:g('notes'),
    items:cart.map(function(i){return {sku:i.id,name:PRODUCTS[i.id].name,size:i.size,qty:i.qty,price:PRODUCTS[i.id].price}})};
  lastMsg=summary(order);
  var wa=waUrl(lastMsg);if(wa)window.open(wa,'_blank','noopener');
  var btn=f.querySelector('.place');btn.disabled=true;btn.textContent='Placing order';
  send(order).then(function(){
    placed=true;cart=[];ls('bc_cart',cart);f.reset();btn.disabled=false;btn.textContent='Place order';
    document.querySelector('.oid').textContent=order.id;$('done').style.display='block';render();window.scrollTo(0,0);
  });
}
$('orderform').querySelector('.place').addEventListener('click',placeOrder);
$('orderform').addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();placeOrder()}});
$('wabtn').addEventListener('click',function(){var u=waUrl(lastMsg);if(u)window.open(u,'_blank','noopener');else say('WhatsApp ordering opens soon.')});
function route(){
  var on=location.hash==='#cart';
  document.body.classList.toggle('cartview',on);
  if(on){window.scrollTo(0,0)}
  else{
    if(placed){placed=false;$('done').style.display='none';render()}
    var t=location.hash.length>1&&document.getElementById(location.hash.slice(1));
    if(t)t.scrollIntoView();
    upd();
  }
}
function showCart(on){
  document.body.classList.toggle('cartview',on);
  if(on){window.scrollTo(0,0)}
  else if(placed){placed=false;$('done').style.display='none';render()}
}
document.addEventListener('click',function(e){
  var a=e.target.closest?e.target.closest('a[href^="#"]'):null;
  if(!a)return;
  var id=a.getAttribute('href').slice(1);
  if(!id)return;
  e.preventDefault();
  var open=id==='cart';
  showCart(open);
  if(!open){upd();var t=document.getElementById(id);if(t)t.scrollIntoView()}
  try{history.replaceState(null,'','#'+id)}catch(x){}
});
window.addEventListener('hashchange',route);
render();route();flush();
