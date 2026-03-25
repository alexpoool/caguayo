-- Migration: Add id_moneda column to cuenta table
-- Created: 2026-03-18

ALTER TABLE cuenta ADD COLUMN id_moneda INTEGER REFERENCES moneda(id_moneda) ON DELETE SET NULL;
