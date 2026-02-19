export interface Categoria {
  id_categoria: number;
  nombre: string;
  descripcion?: string;
}

export interface CategoriasCreate {
  nombre: string;
  descripcion?: string;
}

export interface CategoriasUpdate {
  nombre?: string;
  descripcion?: string;
}

export interface Subcategoria {
  id_subcategoria: number;
  nombre: string;
  descripcion?: string;
  id_categoria: number;
  categoria?: Categoria;
}

export interface SubcategoriasCreate {
  nombre: string;
  descripcion?: string;
  id_categoria: number;
}

export interface SubcategoriasUpdate {
  nombre?: string;
  descripcion?: string;
  id_categoria?: number;
}
