/* One script for every page. Each part only runs on the page that has its elements. */
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id)};

  /* ---- settings ---- */
  var WA_NUMBER='';      /* digits only, with country code, e.g. 919XXXXXXXXX */
  var ORDER_API_URL='';  /* POST endpoint for order JSON. Empty = orders wait in the browser outbox. */

  var PRODUCTS={
    contraband:{name:'Contraband Straight Jeans',price:null},
    hotpursuit:{name:'Hot Pursuit Baggy Jeans',price:null},
    interrogation:{name:'Interrogation Tee',price:null},
    nowitnesses:{name:'No Witnesses Tee',price:null}
  };

  /* ---- helpers ---- */
  var toast=$('toast'),tt;
  function say(m){
    if(!toast)return;
    toast.textContent=m;toast.classList.add('show');
    clearTimeout(tt);tt=setTimeout(function(){toast.classList.remove('show')},2600);
  }
  function ls(k,v){
    try{
      if(arguments.length>1){localStorage.setItem(k,JSON.stringify(v));return v}
      return JSON.parse(localStorage.getItem(k)||'null');
    }catch(e){return null}
  }
  function waUrl(t){return WA_NUMBER?'https://wa.me/'+WA_NUMBER+'?text='+encodeURIComponent(t):''}

  /* ---- preloader (home only) ---- */
  var pre=$('pre');
  if(pre){
    var pull=$('pull'),pct=$('pct');
    var calm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(calm){pre.classList.add('done')}
    else{
      var finish=function(){pre.classList.add('go');setTimeout(function(){pre.classList.add('done')},1100)};
      requestAnimationFrame(function(){requestAnimationFrame(function(){pull.style.top='calc(100% - 72px)'})});
      var t0=performance.now(),dur=1800;
      (function tick(n){
        var p=Math.min(1,(n-t0)/dur);
        pct.textContent=Math.round(p*100)+'%';
        if(p<1)requestAnimationFrame(tick);else setTimeout(finish,250);
      })(t0);
    }
  }

  /* ---- hero unzip (home only) ---- */
  var updHero=function(){};
  var stage=$('top');
  if(stage){
    var hl=$('hl'),hr=$('hr'),hi=$('hi'),zp=$('zp'),stk=$('stk'),navEl=document.querySelector('nav');
    var cl=hi.cloneNode(true);cl.removeAttribute('id');cl.setAttribute('aria-hidden','true');hr.appendChild(cl);
    var pz=document.querySelectorAll('.pctz');
    var ease=function(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2};
    updHero=function(){
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
    };
    window.addEventListener('scroll',updHero,{passive:true});
    window.addEventListener('resize',updHero);
    updHero();
  }

  /* ---- size menus (replace the native select so the hover colour is ours) ---- */
  function closeSizes(except){
    document.querySelectorAll('.sz-list').forEach(function(ul){
      if(ul!==except){ul.hidden=true;ul.parentNode.querySelector('.sz-btn').setAttribute('aria-expanded','false')}
    });
  }
  document.querySelectorAll('.buy').forEach(function(buy){
    var sel=buy.querySelector('select');
    if(!sel)return;
    sel.hidden=true;sel.tabIndex=-1;

    var wrap=document.createElement('div');wrap.className='sz';
    var btn=document.createElement('button');
    btn.type='button';btn.className='sz-btn';btn.textContent='Size';
    btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-expanded','false');
    var ul=document.createElement('ul');ul.className='sz-list';ul.setAttribute('role','listbox');ul.hidden=true;

    Array.prototype.forEach.call(sel.options,function(o){
      if(!o.value)return;
      var li=document.createElement('li');
      li.setAttribute('role','option');li.tabIndex=0;li.dataset.v=o.value;li.textContent=o.value;
      ul.appendChild(li);
    });

    buy.insertBefore(wrap,sel);
    wrap.appendChild(btn);wrap.appendChild(ul);wrap.appendChild(sel);

    function choose(v){
      sel.value=v;
      btn.textContent=v;
      ul.querySelectorAll('li').forEach(function(li){li.setAttribute('aria-selected',li.dataset.v===v?'true':'false')});
      ul.hidden=true;btn.setAttribute('aria-expanded','false');
      wrap.classList.remove('need');
      btn.focus();
    }
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      var open=ul.hidden;
      closeSizes(ul);
      ul.hidden=!open;
      btn.setAttribute('aria-expanded',String(open));
      if(open){var cur=ul.querySelector('[aria-selected="true"]')||ul.firstElementChild;if(cur)cur.focus()}
    });
    ul.addEventListener('click',function(e){
      var li=e.target.closest('li');
      if(li)choose(li.dataset.v);
    });
    ul.addEventListener('keydown',function(e){
      var items=Array.prototype.slice.call(ul.querySelectorAll('li')),i=items.indexOf(document.activeElement);
      if(e.key==='ArrowDown'){e.preventDefault();items[Math.min(items.length-1,i+1)].focus()}
      else if(e.key==='ArrowUp'){e.preventDefault();items[Math.max(0,i-1)].focus()}
      else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(i>-1)choose(items[i].dataset.v)}
      else if(e.key==='Escape'){e.preventDefault();closeSizes();btn.focus()}
    });
  });
  document.addEventListener('click',function(e){
    if(!e.target.closest||!e.target.closest('.sz'))closeSizes();
  });

  /* ---- cart (saved in this browser, shared by every page) ---- */
  var cart=(ls('bc_cart')||[]).filter(function(i){return PRODUCTS[i.id]&&i.qty>0});
  var placed=false,lastMsg='';

  function paintCount(){
    var n=0;cart.forEach(function(i){n+=i.qty});
    var c=$('cc');
    if(c){c.textContent=n;c.hidden=!n}
  }
  function saveCart(){
    ls('bc_cart',cart);
    paintCount();
    if($('cartlist'))renderCart();
  }

  /* ---- add to cart buttons (home) ---- */
  document.querySelectorAll('.add').forEach(function(b){
    b.addEventListener('click',function(){
      var buy=b.closest('.buy'),sel=buy.querySelector('select'),wrap=buy.querySelector('.sz');
      var id=b.getAttribute('data-id');
      if(!sel.value){
        say('Pick a size first.');
        wrap.classList.add('need');setTimeout(function(){wrap.classList.remove('need')},1800);
        wrap.querySelector('.sz-btn').focus();
        return;
      }
      var f=cart.filter(function(i){return i.id===id&&i.size===sel.value})[0];
      if(f)f.qty++;else cart.push({id:id,size:sel.value,qty:1});
      saveCart();
      say(PRODUCTS[id].name+' is in your cart.');
    });
  });

  /* ---- WhatsApp buttons (home) ---- */
  document.querySelectorAll('.wa').forEach(function(b){
    b.addEventListener('click',function(){
      var item=b.getAttribute('data-item')||'a piece';
      if(!WA_NUMBER){say('WhatsApp ordering opens soon.');return}
      window.open(waUrl('Hi Bad Cop, I want to buy '+item+'.'),'_blank','noopener');
    });
  });

  /* ---- cart page ---- */
  function summary(o){
    var l=o.items.map(function(i){return i.qty+' x '+i.name+' (size '+i.size+')'}).join('\n');
    var a=[o.address.line1,o.address.line2,o.address.city,o.address.state,o.address.pincode].filter(Boolean).join(', ');
    return 'Hi Bad Cop, I just placed an order request ('+o.id+').\n\n'+l+'\n\nName: '+o.customer.name+'\nPhone: '+o.customer.phone+'\nEmail: '+(o.customer.email||'-')+'\nAddress: '+a+(o.notes?'\nNotes: '+o.notes:'')+'\n\nPlease confirm availability and payment.';
  }
  function queueOrder(o){var q=ls('bc_outbox')||[];q.push(o);ls('bc_outbox',q);return 'queued'}
  function send(o){
    if(!ORDER_API_URL)return Promise.resolve(queueOrder(o));
    return fetch(ORDER_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return 'sent'})
      .catch(function(){return queueOrder(o)});
  }
  function flushOutbox(){
    var q=ls('bc_outbox')||[];
    if(!ORDER_API_URL||!q.length)return;
    ls('bc_outbox',[]);
    q.forEach(send);
  }

  function renderCart(){
    var has=cart.length>0,list=$('cartlist'),total=0,priced=true;
    $('cartempty').style.display=(has||placed)?'none':'block';
    $('cartbody').style.display=(has&&!placed)?'block':'none';
    list.innerHTML='';
    cart.forEach(function(it,ix){
      var pr=PRODUCTS[it.id];
      if(pr.price==null)priced=false;else total+=pr.price*it.qty;
      var row=document.createElement('div');row.className='line';
      row.innerHTML='<div><b></b><small></small></div><div class="qty"><button type="button" aria-label="One fewer">-</button><span></span><button type="button" aria-label="One more">+</button></div><button type="button" class="rm">Remove</button>';
      row.querySelector('b').textContent=pr.name;
      row.querySelector('small').textContent='Size '+it.size;
      row.querySelector('span').textContent=it.qty;
      var bs=row.querySelectorAll('.qty button');
      bs[0].onclick=function(){it.qty--;if(it.qty<1)cart.splice(ix,1);saveCart()};
      bs[1].onclick=function(){it.qty++;saveCart()};
      row.querySelector('.rm').onclick=function(){cart.splice(ix,1);saveCart()};
      list.appendChild(row);
    });
    $('total').textContent=has?(priced?'Total: INR '+total.toLocaleString('en-IN'):'Prices are confirmed on WhatsApp.'):'';
  }

  var orderform=$('orderform');
  if(orderform){
    function placeOrder(){
      if(!cart.length)return;
      if(!orderform.reportValidity())return;
      var g=function(n){return (orderform.elements[n].value||'').trim()};
      var order={
        id:'BC-'+Date.now().toString(36).toUpperCase(),createdAt:new Date().toISOString(),status:'new',source:'badcop-site',currency:'INR',
        customer:{name:g('name'),phone:g('phone'),email:g('email')},
        address:{line1:g('line1'),line2:g('line2'),city:g('city'),state:g('state'),pincode:g('pincode')},
        notes:g('notes'),
        items:cart.map(function(i){return {sku:i.id,name:PRODUCTS[i.id].name,size:i.size,qty:i.qty,price:PRODUCTS[i.id].price}})
      };
      lastMsg=summary(order);
      var wa=waUrl(lastMsg);if(wa)window.open(wa,'_blank','noopener');
      var btn=orderform.querySelector('.place');
      btn.disabled=true;btn.textContent='Placing order';
      send(order).then(function(){
        placed=true;cart=[];ls('bc_cart',cart);
        orderform.reset();
        btn.disabled=false;btn.textContent='Place order';
        document.querySelector('.oid').textContent=order.id;
        $('done').style.display='block';
        paintCount();renderCart();
        window.scrollTo(0,0);
      });
    }
    orderform.querySelector('.place').addEventListener('click',placeOrder);
    orderform.addEventListener('keydown',function(e){
      if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();placeOrder()}
    });
    var wabtn=$('wabtn');
    if(wabtn)wabtn.addEventListener('click',function(){
      var u=waUrl(lastMsg);
      if(u)window.open(u,'_blank','noopener');else say('WhatsApp ordering opens soon.');
    });
    renderCart();
  }

  /* ---- same-page links scroll smoothly ---- */
  document.addEventListener('click',function(e){
    var a=e.target.closest?e.target.closest('a[href^="#"]'):null;
    if(!a)return;
    var id=a.getAttribute('href').slice(1);
    var t=id?document.getElementById(id):null;
    if(!t)return;
    e.preventDefault();
    t.scrollIntoView();
    updHero();
    try{history.replaceState(null,'','#'+id)}catch(x){}
  });

  paintCount();
  flushOutbox();
})();
