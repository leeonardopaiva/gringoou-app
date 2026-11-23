export const PASSWORD_MIN_LENGTH = 8;

export const getPasswordValidationIssues = (password: string) => {
  const issues: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    issues.push(`Use no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`);
  }

  if (!/[a-z]/.test(password)) {
    issues.push('Inclua ao menos uma letra minuscula.');
  }

  if (!/[A-Z]/.test(password)) {
    issues.push('Inclua ao menos uma letra maiuscula.');
  }

  if (!/\d/.test(password)) {
    issues.push('Inclua ao menos um número.');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    issues.push('Inclua ao menos um caractere especial.');
  }

  return issues;
};

export const isStrongPassword = (password: string) =>
  getPasswordValidationIssues(password).length === 0;
