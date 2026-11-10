LUMINA – SISTEMA DE TIENDA EN LÍNEA + SUPABASE

REQUISITOS
- Proyecto gratuito o de pago en Supabase.
- Visual Studio Code y extensión Live Server (o cualquier servidor web estático).
- URL del proyecto y clave pública anon/publishable de Supabase.

PASO 1. CREAR LA BASE DE DATOS
1. Entra a https://supabase.com/ y crea un proyecto.
2. Abre SQL Editor > New query.
3. Abre el archivo supabase_schema.sql de esta carpeta.
4. Copia todo su contenido, pégalo en el editor SQL y pulsa Run.
5. En Table Editor comprueba que aparezcan: profiles, categories, products, favorites, orders, order_items y contact_messages.
6. En Authentication > Providers > Email, deja habilitado Email. Para pruebas puedes desactivar temporalmente Confirm email; para producción es mejor mantener la confirmación activa.

PASO 2. CONFIGURAR LAS CREDENCIALES
1. En Supabase entra a Project Settings > API (o Connect, según la interfaz).
2. Copia Project URL y la clave pública anon/publishable.
3. Abre supabase-config.js.
4. Sustituye TU-PROYECTO por tu URL y TU_CLAVE_ANON_O_PUBLISHABLE por la clave pública.
   Ejemplo de URL: https://abcdefgh.supabase.co
5. No uses nunca la clave service_role/secret en archivos del navegador ni la publiques en GitHub.

PASO 3. EJECUTAR
1. Abre la carpeta LUMINA_Sistema en Visual Studio Code.
2. Ejecuta index.html con Live Server (no abras el archivo directamente con file://).
3. Registra un usuario desde Cuenta > Crear cuenta.
4. Inicia sesión y prueba favoritos, pedidos y el formulario de contacto.

TABLAS Y FUNCIONES
- profiles: perfil asociado a auth.users; se crea automáticamente al registrarse.
- categories: categorías de lámparas.
- products: catálogo inicial de 9 lámparas.
- favorites: favoritos privados por usuario.
- orders: cabecera de los pedidos y datos de envío.
- order_items: productos, cantidades y precios de cada pedido.
- contact_messages: consultas recibidas desde el formulario.

QUÉ SE GUARDA DÓNDE
- Supabase Auth: registro, inicio y cierre de sesión; las contraseñas no se guardan en una tabla propia.
- Supabase Database: perfiles, favoritos, pedidos, detalles de pedido y consultas.
- Navegador (localStorage): carrito temporal de compra.
- El catálogo mostrado en esta versión sigue definido en app.js y sus datos iniciales también se insertan en public.products. Los IDs coinciden para que pedidos y favoritos relacionen los productos correctamente.

SEGURIDAD
- El SQL activa Row Level Security (RLS) y crea políticas para que cada usuario consulte sus propios datos.
- Los productos y categorías son de lectura pública.
- La clave pública anon/publishable puede estar en el frontend; la protección real depende de RLS.
- No publiques service_role/secret.
- Esta versión registra pedidos de demostración. No procesa pagos, no descuenta inventario de forma transaccional y no debe usarse para ventas reales sin un backend o funciones seguras que validen precios, stock, descuentos y pagos en el servidor.

ARCHIVOS
- index.html: interfaz y carga de librerías.
- styles.css: diseño original, sin cambios visuales.
- app.js: lógica original de tienda.
- supabase-config.js: credenciales públicas del proyecto (debes completarlas).
- supabase-integration.js: autenticación y operaciones de base de datos.
- supabase_schema.sql: creación de tablas, relaciones, RLS y datos iniciales.
