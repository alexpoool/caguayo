import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Key,
  Copy,
  CheckCircle,
  Search,
  Shield,
  Building,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Button,
  Input,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui";
import { apiClient } from "../lib/api";

interface UsuarioCredenciales {
  id_usuario: number;
  ci: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string | null;
  alias: string;
  contrasenia: string;
  contrasenia_plana: string | null;
  cargo: string | null;
  id_grupo: number | null;
  id_dependencia: number | null;
  grupo_nombre: string | null;
  dependencia_nombre: string | null;
}

export function UsuariosCredencialesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);


  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["usuarios-credenciales"],
    queryFn: () =>
      apiClient.get<UsuarioCredenciales[]>("/usuarios-lista"),
  });

  const filteredUsuarios = searchTerm.trim()
    ? usuarios.filter(
        (u) =>
          u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.primer_apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.ci.includes(searchTerm),
      )
    : usuarios;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copiado al portapapeles");
    setTimeout(() => setCopiedField(null), 2000);
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded shadow-lg animate-bounce-subtle">
            <Key className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">
              Credenciales de Usuarios
            </h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              {filteredUsuarios.length === usuarios.length
                ? `${usuarios.length} usuario(s)`
                : `Mostrando ${filteredUsuarios.length} de ${usuarios.length}`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Buscar por nombre, alias o CI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Alias</TableHead>
                <TableHead>Contraseña</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Dependencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsuarios.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-gray-500"
                  >
                    {searchTerm
                      ? "No se encontraron usuarios"
                      : "No hay usuarios"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsuarios.map((usuario) => (
                  <TableRow
                    key={usuario.id_usuario}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                          {usuario.nombre.charAt(0).toUpperCase()}
                        </div>
                        {usuario.nombre} {usuario.primer_apellido}{" "}
                        {usuario.segundo_apellido || ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">
                          {usuario.alias}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            handleCopy(
                              usuario.alias,
                              `alias-${usuario.id_usuario}`,
                            )
                          }
                        >
                          {copiedField === `alias-${usuario.id_usuario}` ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-gray-900 bg-green-50 px-2 py-1 rounded">
                          {usuario.contrasenia_plana || "(hash)"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            handleCopy(
                              usuario.contrasenia_plana || usuario.contrasenia,
                              `pass-${usuario.id_usuario}`,
                            )
                          }
                        >
                          {copiedField === `pass-${usuario.id_usuario}` ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{usuario.cargo || "-"}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        <Shield className="h-3 w-3" />
                        {usuario.grupo_nombre || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <Building className="h-3 w-3" />
                        {usuario.dependencia_nombre || "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
