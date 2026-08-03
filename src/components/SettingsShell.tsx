import { type ReactNode } from 'react';
import { useTheme, SETTINGS_SHELL } from '../theme/ThemeContext';
import { BottomSheet } from './BottomSheet.tsx';
import { SettingsFullPage } from './SettingsFullPage.tsx';

interface SettingsShellProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function SettingsShell({ title, onClose, children, footer }: SettingsShellProps) {
  const { theme } = useTheme();
  const kind = SETTINGS_SHELL[theme];

  return kind === 'sheet'
    ? <BottomSheet title={title} onClose={onClose} footer={footer}>{children}</BottomSheet>
    : <SettingsFullPage title={title} onClose={onClose} footer={footer}>{children}</SettingsFullPage>;
}