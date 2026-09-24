import type { ReactNode } from 'react';
import { speak } from '../lib/speech';
import { useAppState } from '../lib/store';
import { Icon } from './Icon';

type Size = 'xl' | 'lg' | 'md' | 'sm';

export function He({ children, size, className = '' }: { children: string; size?: Size; className?: string }) {
  return (
    <span className={`he ${size ? `he-${size}` : ''} ${className}`} lang="he" dir="rtl">{children}</span>
  );
}

/** Testo italiano con eventuali parti in ebraico evidenziate. */
export function Rich({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const re = /[֐-׿][֐-׿\s]*[֐-׿]|[֐-׿]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<bdi key={i++} className="he-inline" lang="he">{m[0]}</bdi>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function SpeakButton({ text, label, className = 'btn btn-sm' }: { text: string; label?: string; className?: string }) {
  const { settings } = useAppState();
  if (!settings.audio) return null;
  return (
    <button type="button" className={className} onClick={(e) => { e.stopPropagation(); speak(text, settings.speechRate); }}
      aria-label={label ?? 'Ascolta'} title={label ?? 'Ascolta'}>
      <Icon name="speaker" size={18} className="" />
      {label && <span>{label}</span>}
    </button>
  );
}
