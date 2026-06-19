import { useState, useCallback } from 'react';

export type ValidationResult = string | null;

export function required(value: any, label: string): ValidationResult {
  if (value === null || value === undefined) return `${label} es requerido`;
  if (typeof value === 'string' && value.trim().length === 0) return `${label} es requerido`;
  if (typeof value === 'number' && value <= 0) return `${label} es requerido`;
  return null;
}

export function esNumeroPositivo(value: any, label: string, allowZero = false): ValidationResult {
  const num = Number(value);
  if (isNaN(num)) return `${label} debe ser un número válido`;
  if (allowZero ? num < 0 : num <= 0) return `${label} debe ser ${allowZero ? 'mayor o igual a 0' : 'mayor que 0'}`;
  return null;
}

export function esPorcentaje(value: any, label: string): ValidationResult {
  const num = Number(value);
  if (isNaN(num)) return `${label} debe ser un número válido`;
  if (num < 0 || num > 100) return `${label} debe estar entre 0 y 100`;
  return null;
}

export function esFechaValida(value: any, label: string): ValidationResult {
  if (!value) return `${label} es requerido`;
  const date = new Date(value);
  if (isNaN(date.getTime())) return `${label} no es una fecha válida`;
  return null;
}

export function fechaNoAnterior(fecha: any, fechaMinima: any, label: string): ValidationResult {
  if (!fecha || !fechaMinima) return null;
  const d1 = new Date(fecha);
  const d2 = new Date(fechaMinima);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  if (d1 < d2) return `${label} no puede ser anterior a la fecha de inicio`;
  return null;
}

export function seleccionValida(value: any, label: string): ValidationResult {
  const num = Number(value);
  if (!value || isNaN(num) || num <= 0) return `Seleccione un ${label.toLowerCase()}`;
  return null;
}

interface ValidationRule {
  field: string;
  label: string;
  validate: (value: any) => ValidationResult;
}

export function useFormValidation(rules: ValidationRule[]) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((field: string, value: any) => {
    const rule = rules.find(r => r.field === field);
    if (!rule) return null;
    const error = rule.validate(value);
    setErrors(prev => ({ ...prev, [field]: error || '' }));
    return error;
  }, [rules]);

  const handleBlur = useCallback((field: string, value: any) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, value);
  }, [validateField]);

  const validateAll = useCallback((formData: Record<string, any>): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    for (const rule of rules) {
      const error = rule.validate(formData[rule.field]);
      if (error) {
        newErrors[rule.field] = error;
        isValid = false;
      }
    }
    setErrors(newErrors);
    setTouched(Object.fromEntries(rules.map(r => [r.field, true])));
    return isValid;
  }, [rules]);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const getError = useCallback((field: string): string | undefined => {
    return touched[field] ? errors[field] : undefined;
  }, [touched, errors]);

  return { errors, touched, validateField, handleBlur, validateAll, clearErrors, getError };
}

export function mostrarErrores(
  errors: string[],
  toastFn: (msg: string) => void
): void {
  if (errors.length === 1) {
    toastFn(errors[0]);
  } else if (errors.length > 1) {
    toastFn(`Complete correctamente los campos:\n• ${errors.join('\n• ')}`);
  }
}
