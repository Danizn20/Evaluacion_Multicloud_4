CREATE TABLE IF NOT EXISTS prueba_conexion (
    id SERIAL PRIMARY KEY,
    mensaje VARCHAR(255) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO prueba_conexion (mensaje)
VALUES ('Base PostgreSQL Docker EVA4 operativa');

CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    precio NUMERIC(12,2) NOT NULL DEFAULT 0,
    proveedor VARCHAR(150),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
