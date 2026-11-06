-- Insertar nuevos clientes
USE historial_mantenimiento;

INSERT INTO clientes (id_cliente, nombre_empresa, contacto_principal, telefono, email, direccion, pais)
VALUES 
('502_GU_001', 'Plásticos de Guatemala SA', 'Mario Estrada', '+502 2331-4000', 'contacto@plasguate.com', 'Zona 10, Ciudad de Guatemala', 'Guatemala'),
('502_GU_002', 'Empaques Centroamericanos', 'Lucía Morales', '+502 2450-8900', 'lmorales@empacentro.com', 'Km 14.5 Carretera a El Salvador', 'Guatemala'),
('503_SA_001', 'Industrias Cuscatlán', 'Carlos Mendoza', '+503 2210-5500', 'cmendoza@cuscatlanind.com', 'Antiguo Cuscatlán', 'El Salvador'),
('503_SA_002', 'Termoplásticos Salvadoreños', 'Ana Gómez', '+503 2591-3000', 'agomez@termosav.com', 'Zona Industrial Merliot', 'El Salvador'),
('504_HO_001', 'Polímeros de Honduras', 'Roberto Suazo', '+504 2232-1122', 'rsuazo@polihonduras.hn', 'Anillo Periférico, Tegucigalpa', 'Honduras'),
('504_HO_002', 'Empaques Industriales San Pedro', 'Karen Oliva', '+504 2550-4433', 'koliva@empaquessps.hn', 'Zona ZIP Calpules, San Pedro Sula', 'Honduras'),
('505_NI_001', 'Plastinica SA', 'Javier Chamorro', '+505 2249-0011', 'jchamorro@plastinica.com.ni', 'Carretera Norte Km 6', 'Nicaragua'),
('505_NI_002', 'Envases de Nicaragua', 'Sofia Lacayo', '+505 2266-7788', 'slacayo@envasesnic.com.ni', 'Zona Industrial Sabana Grande', 'Nicaragua'),
('506_CR_001', 'Plásticos Flexibles Ticos', 'Luis Rodríguez', '+506 2293-0101', 'lrodriguez@plasflex.cr', 'La Uruca, San José', 'Costa Rica'),
('506_CR_002', 'TecnoMoldes del Caribe', 'María Morales', '+506 2537-4400', 'mmorales@tecnomoldes.cr', 'Parque Industrial Zeta, Cartago', 'Costa Rica'),
('507_PA_001', 'MacroPlást Panamá Corp', 'Jorge Ramírez', '+507 300-5050', 'jramirez@macroplast.pa', 'Vía España, Ciudad de Panamá', 'Panamá'),
('507_PA_002', 'Soluciones de Envase Colón', 'Elena Torres', '+507 441-2020', 'etorres@soluenvase.pa', 'Zona Libre de Colón', 'Panamá'),
('57_CO_001', 'Plásticos Flexibles Colombia', 'Andrés Silva', '+57 601 555-0107', 'asilva@manextruidas.co', 'Calle 100 #15-20, Bogotá', 'Colombia'),
('57_CO_002', 'Polímeros Industriales del Valle', 'Gabriel Castro', '+57 602 555-0109', 'gcastro@polimeros.co', 'Zona Industrial Yumbo, Cali', 'Colombia'),
('57_CO_003', 'Inyecciones Plásticas Medellín', 'Valeria Delgado', '+57 604 555-0110', 'vdelgado@inyecmed.co', 'Av. El Poblado #10-12, Medellín', 'Colombia'),
('57_CO_004', 'Blow Molding Caribe', 'Fernando Ortiz', '+57 605 555-0111', 'fortiz@bmcaribe.co', 'Vía 40 #73-290, Barranquilla', 'Colombia'),
('593_EC_001', 'Plastiecuador SA', 'Diego Morales', '+593 4 288-1122', 'dmorales@plastiecuador.ec', 'Av. Juan Tanca Marengo, Guayaquil', 'Ecuador'),
('593_EC_002', 'Industrias del Moldado Quito', 'Patricia Guerrero', '+593 2 399-4455', 'pguerrero@moldadoquito.ec', 'Sector Carcelén Industrial, Quito', 'Ecuador'),
('593_EC_003', 'Empaques del Austro', 'Ricardo Peña', '+593 7 284-9900', 'rpena@empaquesaustro.ec', 'Parque Industrial, Cuenca', 'Ecuador'),
('593_EC_004', 'Resinas & Extrusión Ecuador', 'Camila Vargas', '+593 4 200-3344', 'cvargas@resinasec.ec', 'Vía a Daule Km 10.5, Guayaquil', 'Ecuador');