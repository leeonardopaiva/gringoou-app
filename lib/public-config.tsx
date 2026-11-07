'use client';

import React, { createContext, useContext } from 'react';

/**
 * Configuração pública calculada no servidor e repassada às telas.
 *
 * Existe para que a tela nunca divirja do servidor: antes, o servidor exigia convite quando a
 * variável não estava definida, enquanto a tela só mostrava o campo com uma variável pública
 * separada. Resultado: o servidor pedia o código e a tela não tinha onde digitá-lo.
 */
export type PublicConfig = {
  /** O cadastro exige código de convite (mesma regra usada pelo servidor). */
  inviteRequired: boolean;
};

const PublicConfigContext = createContext<PublicConfig>({ inviteRequired: false });

export const PublicConfigProvider: React.FC<{ value: PublicConfig; children: React.ReactNode }> = ({ value, children }) => (
  <PublicConfigContext.Provider value={value}>{children}</PublicConfigContext.Provider>
);

export const usePublicConfig = () => useContext(PublicConfigContext);
