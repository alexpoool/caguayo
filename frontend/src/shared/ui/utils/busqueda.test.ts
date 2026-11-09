import { describe, expect, it } from "vitest";
import { coincideBusqueda, normalizarBusqueda } from "./busqueda";

describe("normalizarBusqueda", () => {
  it("convierte a minúsculas", () => {
    expect(normalizarBusqueda("Cliente Ávila")).toBe("cliente ávila");
  });

  it("trata nulos y undefined como cadena vacía", () => {
    expect(normalizarBusqueda(null)).toBe("");
    expect(normalizarBusqueda(undefined)).toBe("");
  });

  it("convierte números a texto", () => {
    expect(normalizarBusqueda(123)).toBe("123");
  });
});

describe("coincideBusqueda", () => {
  it("encuentra el término en mayúsculas o minúsculas", () => {
    expect(coincideBusqueda("Factura Servicio", "servicio")).toBe(true);
    expect(coincideBusqueda("Factura Servicio", "factura")).toBe(true);
  });

  it("devuelve verdadero con término vacío", () => {
    expect(coincideBusqueda("cualquiera", "")).toBe(true);
  });

  it("devuelve falso si no contiene el término", () => {
    expect(coincideBusqueda("Factura", "pago")).toBe(false);
  });

  it("no revienta con valores nulos", () => {
    expect(coincideBusqueda(null, "x")).toBe(false);
    expect(coincideBusqueda(undefined, "x")).toBe(false);
  });
});
