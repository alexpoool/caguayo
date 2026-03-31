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
import { Dependencia } from "../../types";
import { authHelpers } from "../../lib/api";

const { Option } = Select;
const { RangePicker } = DatePicker;

const ReporteMovimientosProducto: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);

  // Mock products list state until hookup with actual service
  const [productos, setProductos] = useState([
    { id: 1, nombre: "Producto Mock", codigo: "MOCK" },
  ]);

  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias);
  }, []);

  const handleFormSubmit = async (values: any) => {
    setLoading(true);
    try {
      const [fechaInicio, fechaFin] = values.fechas || [];
      const params = new URLSearchParams({
        id_dependencia: values.id_dependencia.toString(),
        id_producto: values.id_producto.toString(),
        fecha_inicio: fechaInicio ? fechaInicio.format("YYYY-MM-DD") : "",
        fecha_fin: fechaFin ? fechaFin.format("YYYY-MM-DD") : "",
        aprobado_por_nombre: values.aprobado_por_nombre || "",
        aprobado_por_cargo: values.aprobado_por_cargo || "",
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
      a.download = `movimientos_producto_${values.id_producto}.pdf`;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success("Reporte generado exitosamente");
    } catch (error) {
      console.error(error);
      message.error("Hubo un error al generar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, background: "#fff", minHeight: 400 }}>
      <h2>Generar Reporte: Movimientos por Producto</h2>
      <Form layout="vertical" form={form} onFinish={handleFormSubmit}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="id_dependencia"
              label="Dependencia"
              rules={[
                { required: true, message: "Seleccione una dependencia" },
              ]}
            >
              <Select placeholder="Seleccionar dependencia">
                {dependencias.map((d: any) => (
                  <Option key={d.id_dependencia} value={d.id_dependencia}>
                    {d.nombre}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="id_producto"
              label="Producto"
              rules={[{ required: true, message: "Seleccione un producto" }]}
            >
              <Select placeholder="Seleccionar producto">
                {productos.map((p) => (
                  <Option key={p.id} value={p.id}>
                    {p.codigo} - {p.nombre}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="fechas"
              label="Rango de Fechas"
              rules={[
                { required: true, message: "Seleccione un rango de fechas" },
              ]}
            >
              <RangePicker format="YYYY-MM-DD" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <h3 style={{ marginTop: 24 }}>Firmas e Información Adicional</h3>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="aprobado_por_nombre" label="Aprobado Por (Nombre)">
              <Input placeholder="Ej. Juan Pérez" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="aprobado_por_cargo" label="Cargo del Aprobador">
              <Input placeholder="Ej. Director General" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<FilePdfOutlined />}
          >
            Generar PDF
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ReporteMovimientosProducto;
