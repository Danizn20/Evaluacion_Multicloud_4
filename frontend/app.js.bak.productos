require('dotenv').config();

const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

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
  ssl: {
    rejectUnauthorized: false
  }
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
      usuario: usuario
    });
  }

  return res.status(401).json({
    ok: false,
    mensaje: 'Credenciales incorrectas'
  });
});

app.post('/api/mfa', (req, res) => {
  const { usuario, codigo } = req.body;

  if (usuario === process.env.ADMIN_USER && codigo === process.env.MFA_CODE) {
    const token = jwt.sign(
      {
        usuario: usuario,
        rol: 'administrador'
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h'
      }
    );

    return res.json({
      ok: true,
      mensaje: 'MFA correcto. Token generado.',
      token: token
    });
  }

  return res.status(401).json({
    ok: false,
    mensaje: 'Código MFA incorrecto'
  });
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/api/dashboard-data', validarToken, async (req, res) => {
  try {
    const resultado = await pool.query('SELECT NOW() AS fecha_servidor');

    res.json({
      ok: true,
      usuario: req.usuario.usuario,
      rol: req.usuario.rol,
      mensaje: 'Conexión correcta con RDS PostgreSQL',
      fecha_servidor: resultado.rows[0].fecha_servidor
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error conectando con RDS',
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

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      estado: 'OK',
      frontend: 'activo',
      rds: 'conectado'
    });
  } catch (error) {
    res.status(500).json({
      estado: 'ERROR',
      frontend: 'activo',
      rds: 'sin conexion',
      detalle: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor Cruz Azul ERP iniciado en puerto ${PORT}`);
});
