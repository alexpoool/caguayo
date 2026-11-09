import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReportPreviewTable } from './ReportPreviewTable';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'nombre', label: 'Nombre' },
];

function filas(cantidad: number) {
  return Array.from({ length: cantidad }, (_, index) => ({
    id: index + 1,
    nombre: `Fila ${index + 1}`,
  }));
}

describe('ReportPreviewTable', () => {
  it('muestra solo 100 filas por página y permite avanzar', () => {
    render(<ReportPreviewTable columns={columns} data={filas(250)} />);

    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByText('Fila 1')).toBeInTheDocument();
    expect(screen.getByText('Fila 100')).toBeInTheDocument();
    expect(screen.queryByText('Fila 101')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    expect(screen.getByText('Fila 101')).toBeInTheDocument();
    expect(screen.queryByText('Fila 1')).not.toBeInTheDocument();
  });

  it('deshabilita Anterior en la primera página y mantiene el total real', () => {
    render(
      <ReportPreviewTable columns={columns} data={filas(101)} totalItems={500} />,
    );

    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  });

  it('vuelve a la primera página cuando cambia el tamaño de los datos', () => {
    const { rerender } = render(
      <ReportPreviewTable columns={columns} data={filas(150)} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();

    rerender(<ReportPreviewTable columns={columns} data={filas(80)} />);

    expect(screen.getByText('Fila 1')).toBeInTheDocument();
    expect(screen.queryByText('Página 2 de 1')).not.toBeInTheDocument();
  });

  it('muestra el total y no pagina cuando hay 100 filas o menos', () => {
    render(
      <ReportPreviewTable
        columns={columns}
        data={filas(100)}
        totals={{ total: { label: 'Total', value: 1234 } }}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument();
    expect(screen.getByText('Total:')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });
});
