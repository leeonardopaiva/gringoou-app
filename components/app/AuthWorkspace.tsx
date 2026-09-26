'use client';

import React from 'react';
import Registration from '@/views/Registration';

type RegistrationValues = {
  name: string;
  username: string;
  email: string;
  phone: string;
  regionKey: string;
  gender: string;
  age: string;
  timeAbroad: string;
  birthCity: string;
  referralUsername?: string | null;
};

type AuthWorkspaceProps = {
  referralUsername: string | null;
  mode: 'signin' | 'complete-profile';
  googleEnabled: boolean;
  emailEnabled: boolean;
  passwordEnabled: boolean;
  submitting: boolean;
  savingProfile?: boolean;
  error: string | null;
  notice: string | null;
  defaultValues?: RegistrationValues;
  onGoogleLogin: () => void;
  onGoogleSelectAccount: () => void;
  mockLoginEnabled?: boolean;
  onMockLogin?: () => void;
  onEmailLogin?: (email: string) => Promise<void>;
  onPasswordLogin?: (values: { email: string; password: string }) => Promise<void>;
  onPasswordRegister?: (values: {
    email: string;
    password: string;
    captchaToken: string;
    captchaAnswer: string;
  }) => Promise<void>;
  onCompleteProfile?: (values: RegistrationValues) => Promise<void>;
};

const AuthWorkspace: React.FC<AuthWorkspaceProps> = ({
  referralUsername,
  mode,
  googleEnabled,
  emailEnabled,
  passwordEnabled,
  submitting,
  error,
  notice,
  defaultValues,
  onGoogleLogin,
  onGoogleSelectAccount,
  mockLoginEnabled,
  onMockLogin,
  onEmailLogin,
  onPasswordLogin,
  onPasswordRegister,
  onCompleteProfile,
}) => (
  <Registration
    mode={mode}
    googleEnabled={googleEnabled}
    emailEnabled={emailEnabled}
    passwordEnabled={passwordEnabled}
    onGoogleLogin={onGoogleLogin}
    onGoogleSelectAccount={onGoogleSelectAccount}
    mockLoginEnabled={mockLoginEnabled}
    onMockLogin={onMockLogin}
    onEmailLogin={onEmailLogin}
    onPasswordLogin={onPasswordLogin}
    onPasswordRegister={onPasswordRegister}
    onCompleteProfile={onCompleteProfile}
    submitting={submitting}
    error={error}
    notice={notice}
    referralUsername={referralUsername}
    defaultValues={defaultValues}
  />
);

export default AuthWorkspace;
