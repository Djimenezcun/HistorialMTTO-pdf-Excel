CREATE DATABASE IF NOT EXISTS historial_mantenimiento;
USE historial_mantenimiento;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS ordenes_servicio;
DROP TABLE IF EXISTS equipos;

-- 1. Tabla Clientes
CREATE TABLE clientes (
    id_cliente VARCHAR(20) PRIMARY KEY,
    nombre_empresa VARCHAR(150) NOT NULL,
    contacto_principal VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion VARCHAR(200),
    pais VARCHAR(50),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla Ingenieros
CREATE TABLE ingenieros (
    id_ingeniero INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo'
);

-- 3. Tabla Equipos (id_cliente ajustado a VARCHAR(20))
CREATE TABLE equipos (
    id_equipo VARCHAR(20) PRIMARY KEY,
    id_cliente VARCHAR(20),
    nombre_equipo VARCHAR(100) NOT NULL,
    marca VARCHAR(50),
    modelo VARCHAR(50),
    numero_serie VARCHAR(100) UNIQUE,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL ON UPDATE CASCADE
);

-- 4. Tabla Ordenes de Servicio (id_cliente ajustado a VARCHAR(20))
CREATE TABLE ordenes_servicio (
    id_servicio INT PRIMARY KEY AUTO_INCREMENT,
    id_cliente VARCHAR(20) NOT NULL,
    id_equipo VARCHAR(20) NOT NULL,
    id_ingeniero INT NOT NULL,
    tipo_mantenimiento ENUM('preventivo', 'correctivo', 'predictivo') NOT NULL,
    fecha_servicio DATETIME NOT NULL,
    descripcion_trabajo TEXT NOT NULL,
    diagnostico TEXT,
    repuestos_utilizados TEXT,
    horas_trabajadas DECIMAL(4, 2),
    costo_total DECIMAL(10, 2),
    estado_servicio ENUM('completado', 'pendiente', 'cancelado') DEFAULT 'completado',
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON UPDATE CASCADE,
    FOREIGN KEY (id_equipo) REFERENCES equipos(id_equipo) ON UPDATE CASCADE,
    FOREIGN KEY (id_ingeniero) REFERENCES ingenieros(id_ingeniero)
);


