import { LLMProvider } from '@vibesphere/llm';

/**
 * Gera embeddings para uma lista de textos usando o provider de LLM informado.
 * Centraliza o modelo de embedding para manter consistência de dimensão (1536).
 */
export async function embedTexts(
  provider: LLMProvider,
  model: string,
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }
  return provider.embeddings({ model, input: texts });
}

export async function embedQuery(
  provider: LLMProvider,
  model: string,
  query: string,
): Promise<number[]> {
  const [vector] = await provider.embeddings({ model, input: [query] });
  return vector ?? [];
}
