import React, { useState, useEffect } from "react";
import { Form, Select, Button, Input, message, Row, Col } from "antd";
import { FilePdfOutlined } from "@ant-design/icons";
import { dependenciasService } from "../../services/administracion";
import { Dependencia } from "../../types";
import { authHelpers } from "../../lib/api";

const { Option } = Select;

const ReporteProveedores: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [provincias, setProvincias] = useState<
    { id_provincia: number; nombre: string }[]
  >([]);

  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias);
    dependenciasService.getProvincias().then(setProvincias);
  }, []);

  const handleFormSubmit = async (values: any) => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams({
        id_dependencia: values.id_dependencia.toString(),
        tipo_entidad: values.tipo_entidad,
        aprobado_por_nombre: values.aprobado_por_nombre || "",
        aprobado_por_cargo: values.aprobado_por_cargo || "",
      });

      if (values.id_provincia) {
        params.append("id_provincia", values.id_provincia.toString());
      }

      // Using fetch directly as an example. Replace with your Axios/API client.
      // Example: const res = await api.get('/reportes/proveedores-dependencia', { params, responseType: 'blob' });

      const token = authHelpers.getToken() || "";

      const response = await fetch(
        `http://localhost:8000/api/v1/reportes/proveedores-dependencia?${params.toString()}`,
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

      // Create object URL and trigger download/view
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proveedores_dependencia_${values.id_dependencia}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
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
      <h2>Generar Reporte: Proveedores por Dependencia</h2>
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
              name="tipo_entidad"
              label="Tipo de Proveedor"
              rules={[
                { required: true, message: "Seleccione un tipo de entidad" },
              ]}
            >
              <Select placeholder="Seleccionar tipo">
                <Option value="NATURAL">Persona Natural (Creador)</Option>
                <Option value="TCP">Trabajador por Cuenta Propia (TCP)</Option>
                <Option value="JURIDICA">
                  Institución / Empresa (Jurídica)
                </Option>
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item name="id_provincia" label="Provincia (Opcional)">
              <Select placeholder="Todas las provincias" allowClear>
                {provincias.map((p: any) => (
                  <Option key={p.id_provincia} value={p.id_provincia}>
                    {p.nombre}
                  </Option>
                ))}
              </Select>
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

export default ReporteProveedores;
