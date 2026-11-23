export const getImmigrationHelp = async (query: string): Promise<string> => {
  try {
    const response = await fetch('/api/ai/immigration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return payload?.error ?? 'Assistente IA indisponível no momento.';
    }

    return payload?.answer ?? 'Não foi possível gerar uma resposta agora.';
  } catch (error) {
    console.error('Gemini API error:', error);
    return 'Desculpe, tive um problema ao processar sua duvida. Tente novamente mais tarde.';
  }
};
