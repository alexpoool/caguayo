import React, { useState, useEffect } from "react";
import { Table, Input, Button, Card, Select, Space, message, Typography } from "antd";
import { SearchOutlined, FilePdfOutlined, AlertOutlined } from "@ant-design/icons";
import { authHelpers } from "../../lib/api";

const { Title, Text } = Typography;
const { Option } = Select;

interface AlertaStock {
  codigo: string;
  nombre: string;
  subcategoria: string;
  clasificacion_abc: string;
  stock_actual: number;
  punto_pedido: number;
  stock_minimo: number;
  lead_time_dias: number;
  diferencia: number;
}

export function AlertasStock() {
  const [data, setData] = useState<AlertaStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [clasificacionFilter, setClasificacionFilter] = useState<string>("all");

  const [aprobadoPor, setAprobadoPor] = useState("");
  const [cargoAprobador, setCargoAprobador] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchAlertas();
  }, []);

  const fetchAlertas = async () => {
    setLoading(true);
    try {
      const token = authHelpers.getToken() || "";
      const response = await fetch("http://localhost:8000/api/v1/reportes/alertas-reposicion", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Error fetching data");
      const result = await response.json();
      setData(result.alertas || []);
    } catch (error) {
      console.error(error);
      message.error("Error al cargar las alertas de stock");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const token = authHelpers.getToken() || "";
      const params = new URLSearchParams({
        aprobado_por_nombre: aprobadoPor,
        aprobado_por_cargo: cargoAprobador,
      });

      const response = await fetch(
        `http://localhost:8000/api/v1/reportes/alertas-reposicion/pdf?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Error generating report");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "alertas_reposicion_stock.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success("Reporte en PDF generado exitosamente");
    } catch (error) {
      console.error(error);
      message.error("Hubo un error al descargar el PDF");
    } finally {
      setDownloading(false);
    }
  };

  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
      item.codigo.toLowerCase().includes(searchText.toLowerCase());
    const matchesClasificacion =
      clasificacionFilter === "all" || item.clasificacion_abc === clasificacionFilter;

    return matchesSearch && matchesClasificacion;
  });

  const columns = [
    { title: "Código", dataIndex: "codigo", key: "codigo", width: 100 },
    { title: "Producto", dataIndex: "nombre", key: "nombre", width: 250 },
    { title: "Categoría", dataIndex: "subcategoria", key: "subcategoria", width: 150 },
    { title: "ABC", dataIndex: "clasificacion_abc", key: "clasificacion_abc", width: 80, align: "center" as const },
    {
      title: "Stock Actual",
      dataIndex: "stock_actual",
      key: "stock_actual",
      width: 120,
      align: "right" as const,
      render: (text: number) => <Text type="danger" strong>{text}</Text>,
    },
    { title: "Pto. Pedido", dataIndex: "punto_pedido", key: "punto_pedido", width: 120, align: "right" as const },
    { title: "Stock Mín.", dataIndex: "stock_minimo", key: "stock_minimo", width: 100, align: "right" as const },
    { title: "Lead Time (días)", dataIndex: "lead_time_dias", key: "lead_time_dias", width: 120, align: "center" as const },
    {
      title: "Diferencia",
      dataIndex: "diferencia",
      key: "diferencia",
      width: 100,
      align: "right" as const,
      render: (text: number) => <Text type="danger">-{text}</Text>,
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      <Card
        title={
          <Space>
            <AlertOutlined style={{ color: "#faad14" }} />
            <Title level={4} style={{ margin: 0 }}>Alertas de Reposición de Stock</Title>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={handleDownloadPDF}
            loading={downloading}
          >
            Exportar a PDF
          </Button>
        }
      >
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <Space size="large">
            <Input
              placeholder="Buscar por código o nombre..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
            <Select
              value={clasificacionFilter}
              onChange={setClasificacionFilter}
              style={{ width: 150 }}
            >
              <Option value="all">Todas las Clasificaciones</Option>
              <Option value="A">Clasificación A</Option>
              <Option value="B">Clasificación B</Option>
              <Option value="C">Clasificación C</Option>
            </Select>
          </Space>

          <Space>
            <Input
              placeholder="Firma (Nombre)"
              value={aprobadoPor}
              onChange={(e) => setAprobadoPor(e.target.value)}
              style={{ width: 150 }}
            />
            <Input
              placeholder="Firma (Cargo)"
              value={cargoAprobador}
              onChange={(e) => setCargoAprobador(e.target.value)}
              style={{ width: 150 }}
            />
          </Space>
        </div>

        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="codigo"
          loading={loading}
          pagination={{ pageSize: 15 }}
          size="middle"
          bordered
        />
      </Card>
    </div>
  );
}
