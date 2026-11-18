/**
 * Nombre que debe verse en listados y selectores de terceros.
 *
 * `clientes.nombre` es el nombre comercial. En personas naturales y TCP el
 * nombre real se compone con los apellidos; el backend expone
 * `nombre_completo`, pero se compone aquí como respaldo para respuestas
 * anidadas que sólo traen los datos del hijo.
 */
export interface Nombrable {
  nombre?: string | null;
  nombre_completo?: string | null;
  cliente_natural?: {
    nombre?: string | null;
    primer_apellido?: string | null;
    segundo_apellido?: string | null;
  } | null;
  cliente_tcp?: {
    nombre?: string | null;
    primer_apellido?: string | null;
    segundo_apellido?: string | null;
  } | null;
}

/** Une nombre y apellidos sin dejar espacios sobrantes. */
export function componerNombre(
  nombre?: string | null,
  primerApellido?: string | null,
  segundoApellido?: string | null,
): string {
  return [nombre, primerApellido, segundoApellido]
    .filter((parte): parte is string => Boolean(parte && parte.trim()))
    .map((parte) => parte.trim())
    .join(" ");
}

export function nombreMostrado(cliente?: Nombrable | null): string {
  if (!cliente) return "";
  if (cliente.nombre_completo?.trim()) return cliente.nombre_completo.trim();

  const hijo = cliente.cliente_natural || cliente.cliente_tcp;
  if (hijo) {
    return componerNombre(
      hijo.nombre,
      hijo.primer_apellido,
      hijo.segundo_apellido,
    );
  }

  return componerNombre(cliente.nombre);
}
