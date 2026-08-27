'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import FbCareHeart from '@/components/ui/FbCareHeart';
import {
  REACTION_META,
  REACTION_TYPES,
  emptyReactionCounts,
  type ReactionType,
} from '@/lib/reactions';

function iconOf(t: ReactionType, size: number): ReactNode {
  const meta = REACTION_META[t];
  if (meta.care) return <FbCareHeart size={size} />;
  return meta.emoji;
}

export default function ReactionBar({
  target,
  extra,
  compact = false,
}: {
  target: string;
  extra?: ReactNode;
  compact?: boolean;
}) {
  const [counts, setCounts] = useState<Record<string, number>>(emptyReactionCounts);
  const [mine, setMine] = useState<Record<string, number>>(emptyReactionCounts);
  const busy = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    fetch(`/api/react?target=${encodeURIComponent(target)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.ok) return;
        setCounts({ ...emptyReactionCounts(), ...(d.counts || {}) });
        setMine({ ...emptyReactionCounts(), ...(d.mine || {}) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [target]);

  const react = useCallback(
    async (type: ReactionType) => {
      if (!target) return;
      setCounts((c) => ({ ...c, [type]: (c[type] || 0) + 1 }));
      setMine((m) => ({ ...m, [type]: (m[type] || 0) + 1 }));
      busy.current[type] = (busy.current[type] || 0) + 1;
      try {
        const r = await fetch('/api/react', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, type }),
        });
        const d = await r.json().catch(() => ({}));
        if (r.status === 403) {
          setCounts((c) => ({ ...c, [type]: Math.max(0, (c[type] || 1) - 1) }));
          setMine((m) => ({ ...m, [type]: Math.max(0, (m[type] || 1) - 1) }));
          alert(d.error || 'Bạn cần đăng nhập để thả cảm xúc.');
          return;
        }
        if (!d.ok) {
          setCounts((c) => ({ ...c, [type]: Math.max(0, (c[type] || 1) - 1) }));
          setMine((m) => ({ ...m, [type]: Math.max(0, (m[type] || 1) - 1) }));
          alert(d.error || 'Không thả được cảm xúc.');
          return;
        }
        if (d.counts) {
          setCounts((prev) => {
            const next = { ...emptyReactionCounts(), ...prev };
            for (const k of REACTION_TYPES) next[k] = Math.max(next[k] || 0, d.counts[k] || 0);
            return next;
          });
        }
        if (d.mine) {
          setMine((prev) => {
            const next = { ...emptyReactionCounts(), ...prev };
            for (const k of REACTION_TYPES) next[k] = Math.max(next[k] || 0, d.mine[k] || 0);
            return next;
          });
        }
      } catch {
        setCounts((c) => ({ ...c, [type]: Math.max(0, (c[type] || 1) - 1) }));
        setMine((m) => ({ ...m, [type]: Math.max(0, (m[type] || 1) - 1) }));
      } finally {
        busy.current[type] = Math.max(0, (busy.current[type] || 1) - 1);
      }
    },
    [target],
  );

  if (!target) return extra ? <div className="nl-reactbar">{extra}</div> : null;
  const ico = compact ? 20 : 24;

  return (
    <div className={`nl-reactbar${compact ? ' compact' : ''}`} role="group" aria-label="Cảm xúc">
      {REACTION_TYPES.map((t) => {
        const meta = REACTION_META[t];
        const n = counts[t] || 0;
        const mineN = mine[t] || 0;
        return (
          <button
            key={t}
            type="button"
            className={`nl-react${mineN > 0 ? ' on' : ''}`}
            title={`${meta.label} — bấm nhiều lần sẽ cộng dồn`}
            aria-label={`${meta.label}${n ? `, ${n}` : ''}`}
            onClick={() => react(t)}
          >
            <span className="nl-react-ico">{iconOf(t, ico)}</span>
            <span className="nl-react-lab">{meta.label}</span>
            {n > 0 ? <b>{n}</b> : null}
          </button>
        );
      })}
      {extra}
    </div>
  );
}
