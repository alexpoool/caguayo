import { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Input, Label, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal, FormModal,
  CreateButton, IconButton, MobileRecordCard, ModalOverlay,
} from '@/shared/ui/components';
import type { CasosUsoVentas } from '../application/casos-uso';
import { useInfiniteList } from '@/shared/ui/hooks/useInfiniteList';
import type { ContratoWithDetails, SuplementoWithDetails } from '../domain/ventas';
import { Trash2, Edit, Search, Layers, FileText, Calendar, Tag, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { required } from '@/utils/validacionFormularios';
import { formatFecha, toISODateLocal} from '@/utils/fecha';
import { DateInput } from '@/shared/ui/components';

type View = 'list' | 'form';

const SUPLEMENTO_FORM_ID = 'suplemento-form';

const hoy = toISODateLocal();

export function SuplementosPage({ casosUso }: { casosUso: CasosUsoVentas }) {
  const [searchParams] = useSearchParams();
  const initialContratoId = searchParams.get('contrato');

  const [view, setView] = useState<View>('list');
  
  const [contratos, setContratos] = useState<ContratoWithDetails[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(initialContratoId ? Number(initialContratoId) : null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [contratoSearch, setContratoSearch] = useState('');
  const [showContratoDropdown, setShowContratoDropdown] = useState(false);
  const contratoRef = useRef<HTMLDivElement | null>(null);
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: SuplementoWithDetails | null }>({ isOpen: false, item: null });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  // ── Infinite scroll ──────────────────────────────────────────────────────

  const {
    items: suplementos,
    isLoading,
    isFetchingMore,
    isError,
    error,
    hasMore,
    loadMore,
    refresh,
    total: totalSuplementos,
    searchTerm,
    setSearch: setSearchTerm,
  } = useInfiniteList<SuplementoWithDetails>({
    queryKeyBase: 'suplementos',
    queryFn: (skip, limit, search, onTotal) =>
      initialContratoId
        ? casosUso.listarSuplementosPorContrato(Number(initialContratoId), skip, limit, search)
        : casosUso.listarSuplementos(skip, limit, onTotal, search),
    extraQueryKeyParams: [initialContratoId],
    limit: 100,
  });

  // IntersectionObserver para infinite scroll
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, loadMore]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      const contratosRes = await casosUso.listarContratos(0, 1000);
      setContratos(contratosRes);
    } catch (error) { console.error('Error:', error); }
  };

  const filteredContratos = useMemo(() => {
    if (!contratoSearch) return contratos;
    const term = contratoSearch.toLowerCase();
    return contratos.filter(c => c.nombre.toLowerCase().includes(term));
  }, [contratos, contratoSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contratoRef.current && !contratoRef.current.contains(e.target as Node)) {
        setShowContratoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuplementos = suplementos;

  const handleSave = async () => {
    if (!selectedContratoId) {
      toast.error('Debe seleccionar un contrato');
      return;
    }
    const nombreErr = required(formData.nombre, 'Nombre');
    if (nombreErr) {
      toast.error(nombreErr);
      return;
    }
    const vigenciaErr = required(formData.fecha_vigencia, 'Fecha de vigencia');
    if (vigenciaErr) {
      toast.error(vigenciaErr);
      return;
    }
    setIsSaving(true);
    try {
      const data = {
        id_contrato: selectedContratoId,
        nombre: formData.nombre || '',
        fecha: formData.fecha || toISODateLocal(),
        fecha_vigencia: formData.fecha_vigencia || toISODateLocal(),
        monto: Number(formData.monto) || 0,
        documento: formData.documento
      };
      if (editingId) {
        await casosUso.actualizarSuplemento(editingId, data as any);
      } else {
        await casosUso.crearSuplemento(data as any);
      }
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      refresh();
    } catch (error: any) { toast.error(error.message || 'Error'); } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar suplemento?',
      message: `¿Está seguro de eliminar el suplemento "${nombre}"?`,
      onConfirm: async () => {
        try {
          await casosUso.eliminarSuplemento(id);
          toast.success('Eliminado');
          refresh();
        } catch (error: any) { toast.error(error.message || 'Error'); }
      },
      type: 'danger'
    });
  };

  const resetForm = () => {
    setFormData({ fecha: hoy, fecha_vigencia: hoy });
    setEditingId(null);
    setSelectedContratoId(initialContratoId ? Number(initialContratoId) : null);
  };

  const openForm = (item?: SuplementoWithDetails) => {
    if (item) {
      setEditingId(item.id_suplemento);
      setSelectedContratoId(item.id_contrato);
      setFormData({ 
        nombre: item.nombre, 
        fecha: item.fecha, 
        fecha_vigencia: item.fecha_vigencia,
        monto: item.monto ?? '',
        documento: item.documento,
        id_contrato: item.id_contrato
      });
    } else { resetForm(); }
    setView('form');
  };

  const renderList = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-brand-500 to-brand-600 rounded shadow-lg animate-bounce-subtle">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Suplementos</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Gestión de suplementos ({totalSuplementos ?? suplementos.length} registrados)
            </p>
          </div>
        </div>
        <CreateButton label="Nuevo Suplemento" onClick={() => openForm()} disabled={contratos.length === 0} />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar por código o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Listado móvil: tarjetas en lugar de tabla ancha */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-12 text-gray-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            Cargando suplementos...
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-12 text-center text-red-600">
            Error al cargar suplementos: {(error as Error)?.message || 'Error desconocido'}
          </div>
        ) : filteredSuplementos.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-gray-500">
            {searchTerm
              ? 'No se encontraron suplementos que coincidan con la búsqueda'
              : 'No hay suplementos'}
          </div>
        ) : (
          filteredSuplementos.map((item) => (
            <MobileRecordCard
              key={item.id_suplemento}
              title={item.nombre}
              subtitle={item.codigo || undefined}
              icon={<Layers className="h-4 w-4" />}
              badges={
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    item.estado?.nombre === 'ACTIVO'
                      ? 'bg-green-100 text-green-800'
                      : item.estado?.nombre === 'CANCELADO'
                        ? 'bg-red-100 text-red-800'
                        : item.estado?.nombre === 'FINALIZADO'
                          ? 'bg-brand-100 text-brand-800'
                          : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {item.estado?.nombre || 'N/A'}
                </span>
              }
              fields={[
                {
                  label: 'Valor',
                  value: Number(item.monto || 0).toFixed(2),
                },
                {
                  label: 'Vigencia',
                  value: formatFecha(item.fecha_vigencia) || 'N/A',
                },
              ]}
              onOpen={() => setDetailModal({ isOpen: true, item })}
              openLabel={`Ver detalle del suplemento ${item.nombre}`}
              actions={
                <>
                  <IconButton
                    label="Editar"
                    icon={<Edit className="h-4 w-4" />}
                    onClick={() => openForm(item)}
                    className="text-green-600 hover:bg-green-50 hover:text-green-800"
                  />
                  <IconButton
                    label="Eliminar"
                    icon={<Trash2 className="h-4 w-4" />}
                    variant="danger"
                    onClick={() => handleDelete(item.id_suplemento, item.nombre)}
                  />
                </>
              }
            />
          ))
        )}
      </div>

      <Card className="hidden overflow-hidden shadow-sm border-gray-200 md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gradient-to-r from-brand-50 to-brand-50">
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-brand-600" />
                      Código
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-brand-600" />
                      Nombre
                    </div>
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-brand-600" />
                      Fecha
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Fecha vigencia</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-5 w-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        Cargando suplementos...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-red-500">
                      Error al cargar suplementos: {(error as Error)?.message || 'Error desconocido'}
                    </TableCell>
                  </TableRow>
                ) : filteredSuplementos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                      {searchTerm ? 'No se encontraron suplementos que coincidan con la búsqueda' : 'No hay suplementos'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuplementos.map((item) => (
                    <TableRow key={item.id_suplemento} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item })}>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-brand-50 text-brand-700 rounded text-sm font-mono font-medium">
                          <Tag className="h-3 w-3" />
                          {item.codigo || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900">{item.nombre}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.estado?.nombre === 'ACTIVO' ? 'bg-green-100 text-green-800' :
                          item.estado?.nombre === 'CANCELADO' ? 'bg-red-100 text-red-800' :
                          item.estado?.nombre === 'FINALIZADO' ? 'bg-brand-100 text-brand-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.estado?.nombre || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500">{formatFecha(item.fecha)}</TableCell>
                      <TableCell className="text-right text-gray-700">{Number(item.monto || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-gray-500">{formatFecha(item.fecha_vigencia) || 'N/A'}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <IconButton
                            label="Editar"
                            icon={<Edit className="h-4 w-4" />}
                            onClick={() => openForm(item)}
                            className="text-green-600 hover:bg-green-50 hover:text-green-800"
                          />
                          <IconButton
                            label="Eliminar"
                            icon={<Trash2 className="h-4 w-4" />}
                            variant="danger"
                            onClick={() => handleDelete(item.id_suplemento, item.nombre)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Sentinel para infinite scroll: fuera de las vistas para que funcione en móvil y escritorio */}
        {!isLoading && filteredSuplementos.length > 0 && (
          <div ref={loadMoreRef} className="flex justify-center py-3 border-t border-gray-100">
            {isFetchingMore ? (
              <span className="text-sm text-brand-600 flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                Cargando más...
              </span>
            ) : hasMore ? (
              <span className="text-sm text-gray-400">Desplázate para cargar más</span>
            ) : (
              <span className="text-sm text-gray-400">— Fin de los resultados —</span>
            )}
          </div>
        )}
    </div>
  );

  const renderForm = () => (
    <form
      id={SUPLEMENTO_FORM_ID}
      onSubmit={(e) => { e.preventDefault(); handleSave(); }}
      className="p-4 md:p-6"
    >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium">Nombre *</Label>
              <Input value={formData.nombre || ''} onChange={(e: any) => setFormData({...formData, nombre: e.target.value})} className="mt-1" placeholder="Nombre del suplemento" />
            </div>
            <div ref={contratoRef}>
              <Label className="text-sm font-medium">Contrato *</Label>
              {selectedContratoId && editingId ? (
                <div className="mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                  {contratos.find(c => c.id_contrato === Number(selectedContratoId))?.nombre || `Contrato #${selectedContratoId}`}
                </div>
              ) : (
                <div className="relative mt-1">
                  <Input
                    value={selectedContratoId ? (contratos.find(c => c.id_contrato === selectedContratoId)?.nombre || '') : contratoSearch}
                    onChange={(e: any) => {
                      setContratoSearch(e.target.value);
                      setSelectedContratoId(null);
                      setShowContratoDropdown(true);
                    }}
                    onFocus={() => setShowContratoDropdown(true)}
                    placeholder="Buscar contrato..."
                  />
                  {showContratoDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredContratos.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No se encontraron contratos</div>
                      ) : (
                        filteredContratos.map(c => (
                          <button
                            key={c.id_contrato}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-brand-50 transition-colors"
                            onClick={() => {
                              setSelectedContratoId(c.id_contrato);
                              setContratoSearch('');
                              setShowContratoDropdown(false);
                            }}
                          >
                            {c.nombre}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha</Label>
              <DateInput
                className="mt-1 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={formData.fecha || hoy}
                min={hoy}
                onChange={(fecha) => setFormData({...formData, fecha})}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha de vigencia *</Label>
              <DateInput
                className="mt-1 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={formData.fecha_vigencia || hoy}
                onChange={(fecha_vigencia) => setFormData({...formData, fecha_vigencia})}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Valor</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.monto ?? ''}
                onChange={(e: any) => setFormData({...formData, monto: e.target.value})}
                className="mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Documento</Label>
              <Input value={formData.documento || ''} onChange={(e: any) => setFormData({...formData, documento: e.target.value})} className="mt-1" placeholder="Número de documento" />
            </div>
          </div>
    </form>
  );

  return (
    <div className="p-4 md:p-6">
      {renderList()}
      <FormModal
        isOpen={view === 'form'}
        onClose={() => { setView('list'); resetForm(); }}
        title={editingId ? 'Editar Suplemento' : 'Nuevo Suplemento'}
        subtitle="Complete los datos del suplemento"
        icon={<Layers className="h-6 w-6" />}
        size="xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setView('list'); resetForm(); }}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={SUPLEMENTO_FORM_ID}
              disabled={isSaving}
              isLoading={isSaving}
              className="gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {editingId ? 'Actualizar' : 'Guardar'}
            </Button>
          </>
        }
      >
        {renderForm()}
      </FormModal>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={() => confirmModal.onConfirm()}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

      {detailModal.isOpen && detailModal.item && (
        <ModalOverlay
          isOpen
          onClose={() => setDetailModal({ isOpen: false, item: null })}
          ariaLabel="Detalle del suplemento"
        >
          <div className="bg-white shadow-2xl w-full sm:max-w-lg max-h-[100dvh] sm:max-h-[90dvh] overflow-auto sm:rounded-2xl animate-scale-in">
            <div className="p-4 md:p-6 border-b border-gray-200 bg-gradient-to-r from-brand-50 to-brand-50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg">
                    <Layers className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{detailModal.item.nombre}</h3>
                    <p className="text-sm text-gray-500 font-mono">{detailModal.item.codigo || 'Sin código'}</p>
                  </div>
                </div>
                <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
              <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Estado</p>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    detailModal.item.estado?.nombre === 'ACTIVO' ? 'bg-green-100 text-green-800' :
                    detailModal.item.estado?.nombre === 'CANCELADO' ? 'bg-red-100 text-red-800' :
                    detailModal.item.estado?.nombre === 'FINALIZADO' ? 'bg-brand-100 text-brand-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {detailModal.item.estado?.nombre || 'N/A'}
                  </span>
                </div>
                <div className="bg-gradient-to-br from-brand-50 to-pink-50 p-4 rounded-xl border border-brand-100">
                  <p className="text-xs text-brand-600 uppercase tracking-wider mb-1">Fecha</p>
                  <p className="font-bold text-gray-900">{formatFecha(detailModal.item.fecha) || 'N/A'}</p>
                </div>
                <div className="bg-gradient-to-br from-brand-50 to-pink-50 p-4 rounded-xl border border-brand-100">
                  <p className="text-xs text-brand-600 uppercase tracking-wider mb-1">Fecha de vigencia</p>
                  <p className="font-bold text-gray-900">{formatFecha(detailModal.item.fecha_vigencia) || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Valor</p>
                  <p className="font-bold text-gray-900">{Number(detailModal.item.monto || 0).toFixed(2)}</p>
                </div>
                {detailModal.item.documento && (
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Documento</p>
                    <p className="text-gray-700">{detailModal.item.documento}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 md:p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cerrar</button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
