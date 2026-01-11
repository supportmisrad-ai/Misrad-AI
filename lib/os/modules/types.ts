export type OSModuleKey = 'nexus' | 'system' | 'social' | 'finance' | 'client';

export type OSThemeTokens = {
  accent: string;
  background: string;
};

export type OSModuleDefinition = {
  key: OSModuleKey;
  label: string;
  labelHe: string;
  theme: OSThemeTokens;
};
