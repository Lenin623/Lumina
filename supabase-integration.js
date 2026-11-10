/* Integración de LUMINA con Supabase. El carrito permanece local por comodidad;
   usuarios, perfiles, favoritos, pedidos y consultas se guardan en Supabase. */
let supabaseClient = null;
user = null;
favorites = [];
orders = [];

function supaReady(){return supabaseClient !== null;}
function supaError(error){
  const message=String(error?.message||error||'Error desconocido');
  if(message.toLowerCase().includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if(message.toLowerCase().includes('already registered')) return 'Este correo ya está registrado.';
  return message;
}
async function refreshLuminaUser(){
  const {data:{user:authUser},error}=await supabaseClient.auth.getUser();
  if(error) throw error;
  user=authUser?{id:authUser.id,name:authUser.user_metadata?.full_name||authUser.email.split('@')[0],email:authUser.email}:null;
  favorites=[];
  if(user){
    const {data,error:favError}=await supabaseClient.from('favorites').select('product_id');
    if(favError) throw favError;
    favorites=(data||[]).map(row=>Number(row.product_id));
  }
}

// Sustituye el registro/inicio de sesión de demostración por Supabase Auth.
function bindAuth(){
  document.querySelectorAll('[data-auth]').forEach(button=>button.onclick=()=>{authMode=button.dataset.auth;render();});
  const form=$('#authForm');
  if(!form)return;
  form.onsubmit=async event=>{
    event.preventDefault();
    if(!supaReady())return toast('Primero configura Supabase en supabase-config.js.');
    const values=Object.fromEntries(new FormData(form));
    const submit=form.querySelector('button'); submit.disabled=true;
    try{
      if(authMode==='register'){
        const {data,error}=await supabaseClient.auth.signUp({email:values.email,password:values.password,options:{data:{full_name:values.name}}});
        if(error)throw error;
        if(!data.session){toast('Registro creado. Revisa tu correo para confirmar la cuenta.');return;}
      }else{
        const {error}=await supabaseClient.auth.signInWithPassword({email:values.email,password:values.password});
        if(error)throw error;
      }
      await refreshLuminaUser(); toast('Sesión iniciada correctamente.'); navigate('account');
    }catch(error){toast('No se pudo iniciar sesión: '+supaError(error));}
    finally{submit.disabled=false;}
  };
}

function accountMarkup(){
  if(!user)return `<div class="page-wrap"><div class="empty"><h2>Inicia sesión para ver tu cuenta</h2><button class="btn primary" data-page="auth">Ingresar</button></div></div>`;
  return `<div class="page-wrap"><span class="eyebrow">MI ESPACIO LUMINA</span><h1 class="page-title">Hola, ${escapeHtml(user.name)}</h1><div class="content-card" style="margin-top:22px"><h2 style="font:700 23px 'Playfair Display'">Mis datos</h2><p>${escapeHtml(user.email)}</p><button class="btn outline" id="logout">Cerrar sesión</button></div><h2 style="font:700 25px 'Playfair Display';color:var(--navy);margin-top:30px">Mis pedidos</h2><div id="accountOrders"><p class="muted">Cargando pedidos...</p></div></div>`;
}
async function loadLuminaOrders(){
  if(!user||!$('#accountOrders'))return;
  const {data,error}=await supabaseClient.from('orders').select('id,order_code,status,total,created_at,order_items(product_name,quantity)').order('created_at',{ascending:false});
  const target=$('#accountOrders'); if(!target)return;
  if(error){target.innerHTML='<p class="muted">No se pudieron cargar los pedidos.</p>';console.error(error);return;}
  target.innerHTML=data.length?data.map(order=>`<div class="order-card"><b>Pedido ${escapeHtml(order.order_code)}</b><span style="float:right;color:var(--green)">${escapeHtml(order.status)}</span><p class="muted">${new Date(order.created_at).toLocaleDateString('es-PE')} · ${money(order.total)}</p>${(order.order_items||[]).map(item=>`<small>${item.quantity} × ${escapeHtml(item.product_name)}</small>`).join(' · ')}</div>`).join(''):'<p class="muted">Todavía no tienes pedidos registrados.</p>';
}

// Guarda pedidos y sus líneas en las tablas orders y order_items.
function bindCheckout(){
  const form=$('#checkoutForm'); if(!form)return;
  form.onsubmit=async event=>{
    event.preventDefault();
    if(!user)return toast('Inicia sesión para continuar.');
    const values=Object.fromEntries(new FormData(form));
    const subtotal=cart.reduce((sum,item)=>sum+PRODUCTS.find(p=>p.id===item.id).price*item.qty,0);
    const discount=coupon==='BIENVENIDO'?30:0;
    const shipping=subtotal-discount>=199?0:15;
    const total=subtotal-discount+shipping;
    const code='LM-'+Date.now().toString().slice(-8);
    const button=form.querySelector('button'); button.disabled=true; button.textContent='Registrando pedido...';
    try{
      const {data:order,error}=await supabaseClient.from('orders').insert({user_id:user.id,order_code:code,status:'confirmado',subtotal,discount,shipping_cost:shipping,total,customer_name:values.name,phone:values.phone,address:values.address,city:values.city,region:values.region,delivery_method:values.delivery}).select('id').single();
      if(error)throw error;
      const lines=cart.map(item=>{const product=PRODUCTS.find(p=>p.id===item.id);return {order_id:order.id,product_id:product.id,product_name:product.name,unit_price:product.price,quantity:item.qty,line_total:product.price*item.qty};});
      const {error:lineError}=await supabaseClient.from('order_items').insert(lines);
      if(lineError)throw lineError;
      cart=[];coupon='';save();
      modal('¡Pedido registrado!',`Tu pedido ${code} se guardó en Supabase. El pago no se procesa todavía porque no hay una pasarela de pago conectada.`,[{label:'Ver mis pedidos',action:()=>navigate('account')},{label:'Volver al inicio',action:()=>navigate('home')}]);
    }catch(error){console.error(error);toast('No se pudo registrar el pedido: '+supaError(error));button.disabled=false;button.textContent='Confirmar pedido de prueba';}
  };
}

// Conserva las interacciones originales y cambia favoritos, cierre de sesión y contacto.
function render(){renderBase();if(page==='account'&&user)setTimeout(loadLuminaOrders,0);}
function bindGlobal(){
  bindGlobalLocal();
  document.querySelectorAll('[data-fav]').forEach(button=>button.onclick=async()=>{
    if(!user){toast('Inicia sesión para guardar tus favoritos.');navigate('auth');return;}
    const id=Number(button.dataset.fav);
    try{
      if(favorites.includes(id)){
        const {error}=await supabaseClient.from('favorites').delete().eq('user_id',user.id).eq('product_id',id);if(error)throw error;
        favorites=favorites.filter(value=>value!==id);
      }else{
        const {error}=await supabaseClient.from('favorites').insert({user_id:user.id,product_id:id});if(error)throw error;
        favorites.push(id);
      }
      toast(favorites.includes(id)?'Agregado a favoritos':'Quitado de favoritos');render();
    }catch(error){toast('Error con favoritos: '+supaError(error));}
  });
  if($('#logout'))$('#logout').onclick=async()=>{const {error}=await supabaseClient.auth.signOut();if(error)return toast(supaError(error));user=null;favorites=[];orders=[];navigate('home');toast('Sesión cerrada');};
  if($('#contactForm'))$('#contactForm').onsubmit=async event=>{
    event.preventDefault();const values=Object.fromEntries(new FormData(event.target));
    try{const {error}=await supabaseClient.from('contact_messages').insert({user_id:user?.id||null,name:values.name,email:values.email,message:values.message});if(error)throw error;event.target.reset();toast('Consulta enviada correctamente.');}
    catch(error){toast('No se pudo enviar la consulta: '+supaError(error));}
  };
}

async function startLumina(){
  addMobileTabs();
  const url=window.SUPABASE_URL,key=window.SUPABASE_ANON_KEY;
  if(!window.supabase||!url||!key||url.includes('TU-PROYECTO')||key.includes('TU_CLAVE')){
    render();toast('Configura la URL y la clave pública en supabase-config.js.');return;
  }
  supabaseClient=window.supabase.createClient(url,key);
  try{await refreshLuminaUser();}catch(error){console.error(error);toast('No se pudo conectar con Supabase: '+supaError(error));}
  supabaseClient.auth.onAuthStateChange(()=>{setTimeout(async()=>{try{await refreshLuminaUser();if(page==='account'||page==='favorites')render();}catch(error){console.error(error);}},0);});
  render();
}
startLumina();
