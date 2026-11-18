import { describe, it, expect } from "vitest";
import { componerNombre, nombreMostrado } from "./nombre";

describe("componerNombre", () => {
  it("une nombre y apellidos y descarta vacíos", () => {
    expect(componerNombre("Juan", "Pérez", null)).toBe("Juan Pérez");
    expect(componerNombre("  ", "Pérez", "Gómez")).toBe("Pérez Gómez");
    expect(componerNombre()).toBe("");
  });
});

describe("nombreMostrado", () => {
  it("usa nombre_completo cuando viene del backend", () => {
    expect(
      nombreMostrado({ nombre: "Juan", nombre_completo: "Juan Pérez Gómez" }),
    ).toBe("Juan Pérez Gómez");
  });

  it("compone nombre y apellidos de una persona natural", () => {
    expect(
      nombreMostrado({
        nombre: "Juan",
        cliente_natural: {
          nombre: "Juan",
          primer_apellido: "Pérez",
          segundo_apellido: "Gómez",
        },
      }),
    ).toBe("Juan Pérez Gómez");
  });

  it("compone TCP y omite el segundo apellido vacío", () => {
    expect(
      nombreMostrado({
        nombre: "Ana",
        cliente_tcp: {
          nombre: "Ana",
          primer_apellido: "Ruiz",
          segundo_apellido: null,
        },
      }),
    ).toBe("Ana Ruiz");
  });

  it("deja el nombre comercial en personas jurídicas", () => {
    expect(nombreMostrado({ nombre: "Comercial La Habana S.A." })).toBe(
      "Comercial La Habana S.A.",
    );
  });

  it("devuelve vacío sin cliente", () => {
    expect(nombreMostrado(null)).toBe("");
    expect(nombreMostrado(undefined)).toBe("");
  });
});
