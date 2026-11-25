import React from 'react';
import { Info } from 'lucide-react';

export interface InfoHintProps {
  /** Short explanation of where the card value comes from and how it is calculated. */
  text: string;
  className?: string;
}

/** Small inline `i` button with a native tooltip. Clicking it never triggers a parent card action. */
export function InfoHint({ text, className = '' }: InfoHintProps) {
  return (
    <button
      type="button"
      title={text}
      aria-label={text}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      className={`info-hint ${className}`.trim()}
    >
      <Info aria-hidden="true" />
    </button>
  );
}

export default InfoHint;
