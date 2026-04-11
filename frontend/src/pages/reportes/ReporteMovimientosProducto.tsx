import React, { useState, useEffect } from "react";

import {
  Form,
  Select,
  Button,
  Input,
  message,
  Row,
  Col,
  DatePicker,
} from "antd";
import { FilePdfOutlined } from "@ant-design/icons";
import { dependenciasService } from "../../services/administracion";
import { Dependencia, Productos } from "../../types";
import { authHelpers } from "../../lib/api";
import { productosService } from "../../services/api";
import toast from "react-hot-toast";

const { Option } = Select;
const { RangePicker } = DatePicker;

const ReporteMovimientosProducto: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [productos, setProductos] = useState<Productos[]>([]);

  const [idDependencia, setIdDependencia] = useState<number | null>(null);
  const [idProducto, setIdProducto] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [aprobadoPorNombre, setAprobadoPorNombre] = useState<string>("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState<string>("");

  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias);
    productosService.getProductos(0, 1000).then(setProductos);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idDependencia || !idProducto || !fechaInicio || !fechaFin) {
      toast.error("Complete todos los campos requeridos");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        id_dependencia: idDependencia.toString(),
        id_producto: idProducto.toString(),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        aprobado_por_nombre: aprobadoPorNombre || "",
        aprobado_por_cargo: aprobadoPorCargo || "",
      });

      const token = authHelpers.getToken() || "";
      const response = await fetch(
        `http://localhost:8000/api/v1/reportes/movimientos-producto?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `movimientos_producto_${idProducto}.pdf`;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Reporte generado exitosamente");
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al generar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Generar Reporte: Movimientos por Producto
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dependencia *
            </label>
            <select
              value={idDependencia || ""}
              onChange={(e) => {
                setIdDependencia(
                  e.target.value ? Number(e.target.value) : null,
                );
                setIdProducto(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Seleccionar dependencia</option>
              {dependencias.map((d) => (
                <option key={d.id_dependencia} value={d.id_dependencia}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Producto *
            </label>
            <select
              value={idProducto || ""}
              onChange={(e) =>
                setIdProducto(e.target.value ? Number(e.target.value) : null)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={!idDependencia}
            >
              <option value="">Seleccionar producto</option>
              {productos.map((p: any) => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.codigo} - {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rango de Fechas *
            </label>
            <RangePicker
              format="YYYY-MM-DD"
              style={{ width: "100%", height: "42px" }}
              onChange={(dates, dateStrings) => {
                setFechaInicio(dateStrings[0]);
                setFechaFin(dateStrings[1]);
              }}
            />
          </div>
        </div>

        <h3 className="text-md font-medium text-gray-800 mt-6 mb-3">
          Firmas e Información Adicional
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aprobado Por (Nombre)
            </label>
            <input
              type="text"
              value={aprobadoPorNombre}
              onChange={(e) => setAprobadoPorNombre(e.target.value)}
              placeholder="Ej. Juan Pérez"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cargo del Aprobador
            </label>
            <input
              type="text"
              value={aprobadoPorCargo}
              onChange={(e) => setAprobadoPorCargo(e.target.value)}
              placeholder="Ej. Director General"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Generando..." : "Generar PDF"}
        </button>
      </form>
    </div>
  );
};

export { ReporteMovimientosProducto };
