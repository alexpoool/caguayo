import { useAuth } from "../context/AuthContext";
import {
  User,
  Building2,
  CreditCard,
  Shield,
  Database,
  MapPin,
} from "lucide-react";

export function HomePage() {
  const { user, baseDatos } = useAuth();

  return (
    <div className="h-full w-full grid grid-cols-[1fr_2fr_1fr] gap-4 p-4">
      {/* Columna izquierda - Info del usuario */}
      <div className="bg-white rounded-md shadow-sm overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-gray-100">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{user?.nombre}</h2>
            <p className="text-gray-400 text-sm">@{user?.alias}</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Cédula</p>
              <p className="text-sm font-medium text-gray-900">{user?.ci}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Nombre completo</p>
              <p className="text-sm font-medium text-gray-900">
                {user?.nombre} {user?.primer_apellido} {user?.segundo_apellido}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Grupo</p>
              <p className="text-sm font-medium text-gray-900">
                {user?.grupo?.nombre}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Dependencia</p>
              <p className="text-sm font-medium text-gray-900">
                {user?.dependencia?.nombre}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Base de Datos</p>
              <p className="text-sm font-medium text-gray-900">{baseDatos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Columna centro - Imagen */}
      <div className="flex items-center justify-center">
        <img
          src="/home.jpeg"
          alt="Caguayo Home"
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      </div>

      {/* Columna derecha - Info de la empresa */}
      <div className="bg-white rounded-md shadow-sm overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-gray-100">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              {user?.dependencia?.nombre}
            </h2>
            <p className="text-gray-400 text-sm">Información de la empresa</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Nombre</p>
              <p className="text-sm font-medium text-gray-900">
                {user?.dependencia?.nombre}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">
                {user?.dependencia?.email || "-"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Base de Datos</p>
              <p className="text-sm font-medium text-gray-900">
                {user?.dependencia?.base_datos}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Servidor</p>
              <p className="text-sm font-medium text-gray-900">
                {user?.dependencia?.host}:{user?.dependencia?.puerto}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
