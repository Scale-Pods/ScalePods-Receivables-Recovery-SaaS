import React from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { InfoHint } from '@/components/ui/info-hint';

// Define the type for the card data
export interface CardData {
  id: number;
  colorClass: string;
  date: string;
  title: string;
  description: string;
  progressPercent: string;
  progressValue: string;
  imgSrc1?: string;
  imgAlt1?: string;
  imgSrc2?: string;
  imgAlt2?: string;
  countdownText: string;
  avatarInitials1?: string;
  avatarInitials2?: string;
  /** Optional source note rendered as a small `i` tooltip in the card body. */
  infoText?: string;
}

// Define the props for the Card component
export interface CardProps {
  data: CardData;
}

function normalizeProgress(value: string): string {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return '0%';
  return `${Math.max(0, Math.min(100, parsed))}%`;
}

function initialsFor(value: string | undefined): string {
  if (!value) return '?';
  const initials = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return initials || '?';
}

function Avatar({
  src,
  alt,
  initials,
}: {
  src?: string;
  alt: string;
  initials?: string;
}) {
  if (src) {
    return <img src={src} alt={alt} loading="lazy" />;
  }

  return (
    <span className="avatar-fallback" aria-label={alt} title={alt}>
      {initialsFor(initials ?? alt)}
    </span>
  );
}

const Card: React.FC<CardProps> = ({ data }) => {
  const {
    colorClass,
    date,
    title,
    description,
    progressPercent,
    progressValue,
    imgSrc1,
    imgAlt1,
    imgSrc2,
    imgAlt2,
    countdownText,
    avatarInitials1,
    avatarInitials2,
    infoText,
  } = data;

  return (
    <article
      className={`card ${colorClass}`}
      style={{ '--progress-percent': normalizeProgress(progressPercent) } as React.CSSProperties}
    >
      <div className="card-header">
        <div className="date">{date}</div>
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="card-body">
        <div className="card-title-row">
          <h3>{title}</h3>
          {infoText && <InfoHint text={infoText} />}
        </div>
        <p>{description}</p>
        <div className="progress" title={`${title}: ${progressPercent} complete`}>
          <span>Progress</span>
          <div className="progress-bar" role="progressbar" aria-valuenow={Number.parseFloat(progressPercent) || 0} aria-valuemin={0} aria-valuemax={100} />
          <span>{progressValue}</span>
        </div>
      </div>
      <div className="card-footer">
        <ul>
          {(imgSrc1 || imgAlt1 || avatarInitials1) && (
            <li>
              <Avatar src={imgSrc1} alt={imgAlt1 || 'Team member'} initials={avatarInitials1} />
            </li>
          )}
          {(imgSrc2 || imgAlt2 || avatarInitials2) && (
            <li>
              <Avatar src={imgSrc2} alt={imgAlt2 || 'Team member'} initials={avatarInitials2} />
            </li>
          )}
          <li>
            <button type="button" className="btn-add" aria-label={`Add work to ${title}`}>
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        </ul>
        <span className="btn-countdown">{countdownText}</span>
      </div>
    </article>
  );
};

export default Card;
