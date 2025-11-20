-- Hacer campos opcionales en la tabla equipment
-- Esto permite que brand, model, year, serial_number y motor_serial sean NULL
-- ya que ahora solo code y type son obligatorios en el formulario

ALTER TABLE equipment
ALTER COLUMN brand DROP NOT NULL,
ALTER COLUMN model DROP NOT NULL,
ALTER COLUMN year DROP NOT NULL,
ALTER COLUMN serial_number DROP NOT NULL,
ALTER COLUMN motor_serial DROP NOT NULL;

-- Agregar comentarios explicativos
COMMENT ON COLUMN equipment.brand IS 'Marca del equipo (opcional)';
COMMENT ON COLUMN equipment.model IS 'Modelo del equipo (opcional)';
COMMENT ON COLUMN equipment.year IS 'Año de fabricación (opcional)';
COMMENT ON COLUMN equipment.serial_number IS 'Número de serie del equipo (opcional)';
COMMENT ON COLUMN equipment.motor_serial IS 'Número de serie del motor (opcional)';
