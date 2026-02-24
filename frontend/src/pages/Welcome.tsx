import React, { useEffect, useState } from 'react';

export function WelcomePage() {
  const [nombre, setNombre] = useState('Solji Charón');

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem('usuario') ||
        localStorage.getItem('user') ||
        localStorage.getItem('username') ||
        localStorage.getItem('nombre') ||
        localStorage.getItem('nombre_usuario');

      if (raw) {
        let name = 'Usuario';
        try {
          const parsed = JSON.parse(raw);
          if (parsed.nombre || parsed.first_name || parsed.username) {
            name = `${parsed.nombre || parsed.first_name || parsed.username} ${parsed.primer_apellido || ''}`.trim();
          } else if (parsed.nombre_completo) {
            name = parsed.nombre_completo;
          } else {
            name = String(parsed);
          }
        } catch {
          name = raw;
        }
        setNombre(name || 'Usuario');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  return (
    <div className="max-w-xl mx-auto py-24">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-xl p-10 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold mb-4">SC</div>
        <h1 className="text-3xl font-extrabold">Bienvenido al sistema</h1>
        <p className="mt-3 text-xl">{nombre}</p>
        <p className="mt-4 text-sm text-white/80">¡Que tengas un buen día!</p>
      </div>
    </div>
  );
}
