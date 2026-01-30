export type OSModuleKey = 'nexus' | 'system' | 'social' | 'finance' | 'client' | 'operations';

export type OSThemeTokens = {
  accent: string;
  background: string;
  gradient?: string;
};

export type OSModuleDefinition = {
  key: OSModuleKey;
  label: string;
  labelHe: string;
  theme: OSThemeTokens;
  iconName: string;
};
