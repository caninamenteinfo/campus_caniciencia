import { customAlphabet } from "nanoid";

// Sin caracteres ambiguos (0/O, 1/I/L) para que sea fácil de transcribir a mano.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generate = customAlphabet(ALPHABET, 8);

export function generateAccessCode(): string {
  return generate();
}

export function normalizeAccessCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}
