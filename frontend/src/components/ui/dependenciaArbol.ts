import type { Dependencia } from "../../types/dependencia";

export interface TreeNode {
  dep: Dependencia;
  children: TreeNode[];
}

export interface BosqueDependencias {
  roots: TreeNode[];
  byId: Map<number, TreeNode>;
}

/**
 * Construye el bosque a partir de `codigo_padre`.
 * Los padres ausentes crean raíces y los nodos se ordenan por nombre.
 */
export function construirBosque(
  dependencias: Dependencia[],
): BosqueDependencias {
  const byId = new Map<number, TreeNode>();
  dependencias.forEach((d) =>
    byId.set(d.id_dependencia, { dep: d, children: [] }),
  );

  const roots: TreeNode[] = [];
  dependencias.forEach((d) => {
    const node = byId.get(d.id_dependencia)!;
    const parent = d.codigo_padre != null ? byId.get(d.codigo_padre) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.dep.nombre.localeCompare(b.dep.nombre, "es"));
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);

  return { roots, byId };
}

/** Ids de un subárbol en preorden. */
export function collectIds(nodes: TreeNode[], out: number[] = []): number[] {
  nodes.forEach((n) => {
    out.push(n.dep.id_dependencia);
    collectIds(n.children, out);
  });
  return out;
}
