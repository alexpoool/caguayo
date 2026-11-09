import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { BackButton } from './BackButton';
import { CreateButton } from './CreateButton';
import { PageHeader } from './PageHeader';

describe('CreateButton', () => {
  it('usa el estilo brand y dispara la acción', async () => {
    const onClick = vi.fn();
    render(<CreateButton label="Nuevo cliente" onClick={onClick} />);

    const button = screen.getByRole('button', { name: 'Nuevo cliente' });
    expect(button.className).toContain('from-brand-500');
    expect(button.className).toContain('to-brand-600');

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('deshabilita mientras carga', () => {
    render(<CreateButton label="Nueva factura" isLoading />);
    expect(screen.getByRole('button', { name: 'Nueva factura' })).toBeDisabled();
  });
});

describe('BackButton', () => {
  it('navega al destino explícito', async () => {
    render(
      <MemoryRouter initialEntries={['/origen']}>
        <Routes>
          <Route path="/origen" element={<BackButton to="/clientes" />} />
          <Route path="/clientes" element={<p>Destino clientes</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByText('Destino clientes')).toBeInTheDocument();
  });

  it('usa una etiqueta contextual', () => {
    render(
      <MemoryRouter>
        <BackButton to="/clientes" label="Volver a clientes" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Volver a clientes' })).toBeInTheDocument();
  });
});

describe('PageHeader', () => {
  it('muestra volver, título, subtítulo y acciones', () => {
    render(
      <MemoryRouter>
        <PageHeader
          back={<BackButton to="/clientes" />}
          title="Clientes"
          subtitle="Gestión de clientes"
          actions={<CreateButton label="Nuevo cliente" />}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Clientes' })).toBeInTheDocument();
    expect(screen.getByText('Gestión de clientes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo cliente' })).toBeInTheDocument();
  });
});
