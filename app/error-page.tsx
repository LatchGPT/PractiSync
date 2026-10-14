'use client';

import { useEffect, useId, useRef, type MouseEvent } from 'react';
import Link from 'next/link';
import styles from './error-page.module.css';

const statusLabels: Record<number, string> = {
  403: 'FORBIDDEN',
  404: 'NOT FOUND',
  500: 'SERVER ERROR',
  503: 'UNAVAILABLE',
};

type ErrorPageProps = {
  status: number;
  title: string;
  description: string;
  retry?: () => void;
};

function ErrorIllustration({ status, label }: { status: number; label: string }) {
  const stripesId = useId();

  return (
    <svg className={styles.illustration} viewBox="0 0 640 540" role="img" aria-label={String(status) + ' ' + label.toLowerCase() + ': a campus security officer beside a blue and gold barrier'}>
      <defs>
        <pattern id={stripesId} y="357" width="68" height="34" patternUnits="userSpaceOnUse">
          <path className={styles.stripe} d="M18 0h30L30 34H0z" />
        </pattern>
      </defs>

      <path className={styles.backdrop} d="M174 69c63-51 160-42 229 1 60 38 91 108 113 175 20 60 72 108 64 169-10 71-91 82-170 79-98-4-213 17-272-55-57-70-48-125-47-204 1-64 31-123 83-165Z" />
      <circle className={styles.orbit} cx="299" cy="259" r="211" />
      <circle className={styles.goldDetail} cx="115" cy="110" r="7" />
      <circle className={styles.blueDetail} cx="554" cy="306" r="5" />
      <path className={styles.spark} d="M472 41v14m-7-7h14M64 339v12m-6-6h12" />
      <path className={styles.campus} d="M166 347V189a81 81 0 0 1 162 0v158m-145 0V190a64 64 0 0 1 128 0v157" />

      <g transform="rotate(-8 119 224)">
        <rect className={styles.lockCard} x="66" y="165" width="110" height="123" rx="19" />
        <path className={styles.lockShackle} d="M101 213v-17a20 20 0 0 1 40 0v17" />
        <rect className={styles.lockBody} x="91" y="208" width="60" height="51" rx="10" />
        <circle className={styles.lockKey} cx="121" cy="229" r="5" />
        <path className={styles.lockKeyLine} d="M121 231v10" />
      </g>

      <ellipse className={styles.groundShadow} cx="315" cy="495" rx="238" ry="13" />

      <g className={styles.officer}>
        <path className={styles.trousers} d="M255 337h87l-8 69 20 72h-32l-26-91-17 91h-34l7-84Z" />
        <path className={styles.trouserSeam} d="m295 354 1 33m-34 21-5 55m69-57 17 56" />
        <path className={styles.boots} d="M246 470h33l-1 22h-57q-5-14 10-17Zm76 0h33l11 7q18 3 18 15h-59Z" />
        <path className={styles.bootSole} d="M220 493h59m45 0h61" />

        <path className={styles.uniform} d="M267 215q-21-9-33 14l-26 47q-7 12 4 24l22 24 21-17-23-25 22-30Z" />
        <path className={styles.skin} d="m233 305 15-8 21 16q6 4 2 10-4 5-11 3l-7-3q5 8-2 10-6 1-11-5l-14-13Z" />

        <path className={styles.uniform} d="M326 216q16-7 26 10l21 27 7-29 1-35h24l-2 47q-1 19-18 35-14 12-28-2l-29-30Z" />
        <path className={styles.cuff} d="m377 191 29 1-1 16-27-1Z" />
        <path className={styles.skin} d="M381 192q-10-4-14-16l-8-16q-2-5 2-7 5-2 8 3l7 10v-31q0-6 4-6t4 6v18-29q0-6 5-6t5 6v29-23q0-6 5-6t5 6v24-15q0-5 4-5t5 5v35q0 15-13 22Z" />
        <path className={styles.skinLine} d="M384 153v18m10-18v18m10-17v16m-29 1q12-9 25 0" />

        <path className={styles.neck} d="M285 183h28v35l-14 14-14-14Z" />
        <path className={styles.uniform} d="M271 213h12l16 15 16-15h12q13 2 16 22l-3 103h-85l-2-100q0-21 18-25Z" />
        <path className={styles.collar} d="m281 211 18 17-12 17-15-28Zm36 0-18 17 12 17 14-28Z" />
        <path className={styles.tie} d="m299 228 7 12-4 8 5 49-8 11-8-11 5-49-4-8Z" />
        <path className={styles.epaulet} d="m258 223 18-7 4 9-20 7Zm63-7 19 7-2 9-20-7Z" />
        <path className={styles.pocket} d="M265 267h20v21h-20Z" />
        <rect className={styles.radio} x="266" y="253" width="17" height="26" rx="3" />
        <path className={styles.radioAntenna} d="M270 253v-14" />
        <path className={styles.radioLines} d="M270 260h9m-9 5h9" />
        <path className={styles.badge} d="M317 253h14v10q-1 8-7 12-6-4-7-12Z" />
        <path className={styles.badgeMark} d="m320 261 3 3 5-6" />
        <rect className={styles.nameTag} x="314" y="284" width="21" height="5" rx="2" />
        <path className={styles.shirtSeam} d="M299 309v26m-40-16h22m32 0h23" />
        <rect className={styles.belt} x="252" y="332" width="92" height="15" rx="4" />
        <rect className={styles.buckle} x="290" y="333" width="17" height="13" rx="2" />

        <ellipse className={styles.skin} cx="274" cy="157" rx="6" ry="10" />
        <ellipse className={styles.skin} cx="325" cy="157" rx="6" ry="10" />
        <path className={styles.skin} d="M276 137q0-27 24-27t24 27v25q-1 22-24 35-24-13-24-35Z" />
        <path className={styles.hair} d="M276 149v-16q-2-29 24-29 25 1 24 29v16l-7-21q-17 9-34 0Z" />
        <path className={styles.features} d="M285 150h5m20 0h5m-15 7-2 9h4m-11 9q9 7 18 0" />
        <path className={styles.brows} d="m282 144 9-1m18 0 9 1" />
        <path className={styles.cap} d="M263 123q0-31 37-35 37 4 38 35l-12 10h-54Z" />
        <path className={styles.capBand} d="M267 117q32-9 65 0v12h-65Z" />
        <path className={styles.capBrim} d="M267 128q32-12 65 0-8 13-33 13t-32-13Z" />
        <path className={styles.capBadge} d="M294 102h12v8q-1 5-6 8-5-3-6-8Z" />
      </g>

      <g>
        <path className={styles.barrierFeet} d="m103 385-13 108h21l19-108Zm355 0 15 108h-22l-18-108Z" />
        <rect className={styles.barrierRail} x="70" y="354" width="448" height="34" rx="5" />
        <path className={styles.barrierStripes} fill={'url(#' + stripesId + ')'} d="M76 357h436v28H76Z" />
        <circle className={styles.barrierBolt} cx="83" cy="370" r="3" />
        <circle className={styles.barrierBolt} cx="505" cy="370" r="3" />
      </g>

      <g>
        <path className={styles.cone} d="m538 487 19-83h17l19 83Z" />
        <path className={styles.coneBand} d="m548 444 4-18h27l4 18Z" />
        <rect className={styles.coneBase} x="531" y="484" width="70" height="9" rx="4" />
      </g>
      <path className={styles.ground} d="M45 495h561" />

      <g className={styles.statusText}>
        <text x="509" y="90" className={styles.errorWord}>ERROR</text>
        <text x="509" y="184" className={styles.errorCode}>{status}</text>
        <text x="509" y="216" className={styles.errorLabel}>{label}</text>
      </g>
    </svg>
  );
}

export default function ErrorPage({ status, title, description, retry }: ErrorPageProps) {
  const label = statusLabels[status] ?? 'ERROR';
  const titleId = useId();
  const pageRef = useRef<HTMLElement>(null);

  // Error routes can mount without SettingsView, including the standalone root fallback.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    function applyTheme() {
      let preference: unknown;
      try {
        const saved = window.localStorage.getItem('practisync_settings');
        preference = saved ? JSON.parse(saved)?.theme : undefined;
      } catch {
        // Use the active document theme if browser storage is unavailable.
      }
      const dark = preference === 'dark' || (preference === 'system' && media.matches)
        || (preference !== 'light' && preference !== 'dark' && preference !== 'system'
          && document.documentElement.classList.contains('dark'));
      pageRef.current?.setAttribute('data-theme', dark ? 'dark' : 'light');
    }
    function onStorage(event: StorageEvent) {
      if (event.key === null || event.key === 'practisync_settings') applyTheme();
    }
    applyTheme();
    media.addEventListener('change', applyTheme);
    window.addEventListener('storage', onStorage);
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      media.removeEventListener('change', applyTheme);
      window.removeEventListener('storage', onStorage);
      observer.disconnect();
    };
  }, []);

  function goBack(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (window.history.length > 1) {
      event.preventDefault();
      window.history.back();
    }
  }

  return (
    <main ref={pageRef} className={styles.page} role="alert" aria-labelledby={titleId}>
      <div className={styles.layout}>
        <section className={styles.copy}>
          <p className={styles.eyebrow}>Ooops...</p>
          <h1 className={styles.title} id={titleId}>{title}</h1>
          <p className={styles.description}>{description}</p>
          <div className={styles.actions}>
            <Link className={styles.backButton} href="/" prefetch={false} onClick={goBack}>Go Back</Link>
            {retry && <button className={styles.retryButton} type="button" onClick={retry}>Try again</button>}
          </div>
        </section>
        <div className={styles.art}>
          <ErrorIllustration status={status} label={label} />
        </div>
      </div>
    </main>
  );
}
