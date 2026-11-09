import { dj08ApiRepositorio } from "../../features/dj08/infrastructure/dj08-api-repositorio";
import { DJ08Page } from "../../features/dj08/ui/DJ08Page";

/** Composition root de DJ08: une el puerto con el adaptador HTTP. */
export function DJ08PageContainer() {
  return <DJ08Page repositorio={dj08ApiRepositorio} />;
}
