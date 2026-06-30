require('dotenv').config();

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg'); const os = require('os');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false
});

function validarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token no enviado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/login', (req, res) => {
  const { usuario, password } = req.body;

  if (usuario === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    return res.json({
      ok: true,
      mensaje: 'Credenciales correctas. Continúe con MFA.',
      usuario
    });
  }

  return res.status(401).json({
    ok: false,
    mensaje: 'Credenciales incorrectas'
  });
});

app.post('/api/mfa', (req, res) => {
  const { usuario, codigo } = req.body;

  if (usuario !== process.env.ADMIN_USER) {
    return res.status(401).json({
      ok: false,
      mensaje: 'Usuario no válido para MFA'
    });
  }

  const mfaValido = speakeasy.totp.verify({
    secret: process.env.MFA_SECRET,
    encoding: 'base32',
    token: codigo,
    window: 1
  });

  if (mfaValido) {
    const token = jwt.sign(
      {
        usuario,
        rol: 'administrador'
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h'
      }
    );

    return res.json({
      ok: true,
      mensaje: 'MFA correcto. Token JWT generado.',
      token
    });
  }

  return res.status(401).json({
    ok: false,
    mensaje: 'Código MFA incorrecto o expirado'
  });
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/productos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'productos.html'));
});

app.get('/api/dashboard-data', validarToken, async (req, res) => {
  try {
    const resultado = await pool.query('SELECT NOW() AS fecha_servidor');

    res.json({
      ok: true,
      usuario: req.usuario.usuario,
      rol: req.usuario.rol,
      mensaje: 'Conexión correcta con PostgreSQL Docker privado',
      fecha_servidor: resultado.rows[0].fecha_servidor
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error conectando con PostgreSQL Docker privado',
      detalle: error.message
    });
  }
});

app.get('/api/recurso-protegido', validarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT id, mensaje, fecha FROM prueba_conexion ORDER BY id DESC LIMIT 5'
    );

    res.json({
      ok: true,
      mensaje: 'Recurso protegido consultado correctamente',
      datos: resultado.rows
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error consultando tabla prueba_conexion',
      detalle: error.message
    });
  }
});

app.get('/api/productos', validarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT id, codigo, nombre, categoria, stock, precio, proveedor, fecha_registro FROM productos ORDER BY id DESC'
    );

    res.json({
      ok: true,
      mensaje: 'Listado de productos obtenido correctamente',
      productos: resultado.rows
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error consultando productos',
      detalle: error.message
    });
  }
});

app.post('/api/productos', validarToken, async (req, res) => {
  try {
    const { codigo, nombre, categoria, stock, precio, proveedor } = req.body;

    if (!codigo || !nombre || !categoria) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Código, nombre y categoría son obligatorios'
      });
    }

    const resultado = await pool.query(
      `INSERT INTO productos (codigo, nombre, categoria, stock, precio, proveedor)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        codigo,
        nombre,
        categoria,
        Number(stock) || 0,
        Number(precio) || 0,
        proveedor || ''
      ]
    );

    res.json({
      ok: true,
      mensaje: 'Producto registrado correctamente',
      producto: resultado.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error registrando producto',
      detalle: error.message
    });
  }
});

app.delete('/api/productos/:id', validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM productos WHERE id = $1', [id]);

    res.json({
      ok: true,
      mensaje: 'Producto eliminado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error eliminando producto',
      detalle: error.message
    });
  }
});

app.get('/mfa-setup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mfa-setup.html'));
});

app.get('/api/mfa/qr', async (req, res) => {
  try {
    const otpauthUrl = speakeasy.otpauthURL({
      secret: process.env.MFA_SECRET,
      label: 'admin@cruzazul-erp',
      issuer: 'Cruz Azul ERP',
      encoding: 'base32'
    });

    const qr = await QRCode.toDataURL(otpauthUrl);

    res.json({
      ok: true,
      qr
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error generando QR MFA',
      detalle: error.message
    });
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      estado: 'OK',
      frontend: 'activo',
      postgresql: 'conectado', instancia: os.hostname()
    });
  } catch (error) {
    res.status(500).json({
      estado: 'ERROR',
      frontend: 'activo',
      postgresql: 'sin conexion', instancia: os.hostname(),
      detalle: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor Cruz Azul ERP iniciado en puerto ${PORT}`);
});
