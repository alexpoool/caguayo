/**
 * Ejecuta `mapper` sobre cada elemento con un máximo de promesas en vuelo.
 * Mantiene el orden de los resultados y evita lanzar cientos de requests a la vez.
 */
export async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    async () => {
      let index = nextIndex;
      nextIndex += 1;
      while (index < items.length) {
        results[index] = await mapper(items[index], index);
        index = nextIndex;
        nextIndex += 1;
      }
    },
  );

  await Promise.all(workers);
  return results;
}
