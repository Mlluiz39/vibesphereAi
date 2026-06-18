/**
 * Converte um array de números no literal aceito pelo pgvector: "[0.1,0.2,...]".
 * Usado em INSERT/SELECT com cast `::vector`, já que o Prisma Client não
 * manipula o tipo `vector` diretamente (campo Unsupported).
 */
export function toSqlVector(values: number[]): string {
  return `[${values.join(',')}]`;
}
