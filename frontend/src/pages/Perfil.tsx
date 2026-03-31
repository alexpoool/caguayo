import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { 
  User, Lock, Save, ArrowLeft, Loader2, 
  Shield, Database, Building2, BadgeCheck 
} from 'lucide-react';
import toast from 'react-hot-toast';

export function PerfilPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
  const [alias, setAlias] = useState(user?.alias || '');
  const [contraseniaActual, setContraseniaActual] = useState('');
  const [contraseniaNueva, setContraseniaNueva] = useState('');
  const [confirmarContrasenia, setConfirmarContrasenia] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGuardar = async () => {
    if (!alias.trim()) {
      toast.error('El alias no puede estar vacío');
      return;
    }

    setLoading(true);
    try {
      await authService.updatePerfil({ alias });
      await refreshUser();
      toast.success('Alias actualizado correctamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar alias');
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarContrasenia = async () => {
    if (!contraseniaActual) {
      toast.error('Ingrese la contraseña actual');
      return;
    }
    if (!contraseniaNueva) {
      toast.error('Ingrese la nueva contraseña');
      return;
    }
    if (contraseniaNueva.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (contraseniaNueva !== confirmarContrasenia) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await authService.updatePerfil({
        contrasenia_actual: contraseniaActual,
        contrasenia_nueva: contraseniaNueva,
      });
      await refreshUser();
      toast.success('Contraseña actualizada correctamente');
      setContraseniaActual('');
      setContraseniaNueva('');
      setConfirmarContrasenia('');
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white shadow-sm hover:shadow-md transition-all hover:bg-gray-50 border border-gray-200"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Perfil de Usuario</h1>
            <p className="text-gray-500">Gestiona tu información personal y seguridad</p>
          </div>
        </div>

        {/* Avatar y info principal */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 mb-6 text-white">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <User className="h-10 w-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {user.nombre} {user.primer_apellido} {user.segundo_apellido}
              </h2>
              <p className="text-blue-100">@{user.alias}</p>
              <div className="flex items-center gap-2 mt-2">
                <BadgeCheck className="h-4 w-4 text-blue-200" />
                <span className="text-sm text-blue-100">{user.grupo?.nombre}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Información personal */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-white rounded-t-2xl border-b border-gray-100 pb-4">
              <CardTitle className="flex items-center gap-3 text-gray-800">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Carné de Identidad</p>
                  <p className="font-semibold text-gray-900 text-lg">{user.ci}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Grupo</p>
                  <p className="font-semibold text-gray-900 text-lg">{user.grupo?.nombre}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Dependencia</p>
                  <p className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    {user.dependencia?.nombre}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Base de Datos</p>
                  <p className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                    <Database className="h-4 w-4 text-green-500" />
                    {user.dependencia?.base_datos || 'No asignada'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Editar alias */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-white rounded-t-2xl border-b border-gray-100 pb-4">
              <CardTitle className="flex items-center gap-3 text-gray-800">
                <div className="p-2 bg-purple-100 rounded-xl">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                Cambiar Alias
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4">
                El alias es tu identificador único en el sistema. Otros usuarios te reconocerán por este nombre.
              </p>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="Nuevo alias"
                    className="h-12 text-lg"
                  />
                </div>
                <Button
                  onClick={handleGuardar}
                  disabled={loading || alias === user.alias}
                  className="h-12 px-6"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
              </div>
              {alias === user.alias && (
                <p className="text-sm text-gray-400 mt-2">El alias es igual al actual</p>
              )}
            </CardContent>
          </Card>

          {/* Cambiar contraseña */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-white rounded-t-2xl border-b border-gray-100 pb-4">
              <CardTitle className="flex items-center gap-3 text-gray-800">
                <div className="p-2 bg-red-100 rounded-xl">
                  <Lock className="h-5 w-5 text-red-600" />
                </div>
                Cambiar Contraseña
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-6">
                Asegúrate de usar una contraseña segura con al menos 6 caracteres.
              </p>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña Actual
                  </label>
                  <Input
                    type="password"
                    value={contraseniaActual}
                    onChange={(e) => setContraseniaActual(e.target.value)}
                    placeholder="••••••••"
                    className="h-12"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nueva Contraseña
                    </label>
                    <Input
                      type="password"
                      value={contraseniaNueva}
                      onChange={(e) => setContraseniaNueva(e.target.value)}
                      placeholder="••••••••"
                      className="h-12"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmar Contraseña
                    </label>
                    <Input
                      type="password"
                      value={confirmarContrasenia}
                      onChange={(e) => setConfirmarContrasenia(e.target.value)}
                      placeholder="••••••••"
                      className="h-12"
                    />
                  </div>
                </div>
                
                {contraseniaNueva && confirmarContrasenia && contraseniaNueva !== confirmarContrasenia && (
                  <p className="text-sm text-red-500 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Las contraseñas no coinciden
                  </p>
                )}
                
                <div className="pt-2">
                  <Button
                    onClick={handleCambiarContrasenia}
                    disabled={loading || !contraseniaActual || !contraseniaNueva || contraseniaNueva !== confirmarContrasenia}
                    variant="outline"
                    className="h-12 px-6 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Lock className="h-5 w-5 mr-2" />
                        Actualizar Contraseña
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
