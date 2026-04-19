'use client';

import Image from 'next/image';
import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import './login.css';

type Status = 'idle' | 'sending' | 'sent' | 'error';

function LoginScreen() {
  const searchParams = useSearchParams();
  // Only forward `next` if middleware set it from a deep-link intent.
  // Without it, /auth/callback routes first-timers to the intro and
  // returning users to the lobby.
  const nextPath = searchParams.get('next');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus('sending');
    setErrorMsg(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL ?? '';
      const emailRedirectTo = nextPath
        ? `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
        : `${origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo, shouldCreateUser: true },
      });

      if (error) {
        setStatus('error');
        setErrorMsg(error.message);
        return;
      }
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : '알 수 없는 오류');
    }
  };

  const isBusy = status === 'sending';

  return (
    <section className="login-screen" data-testid="login-screen">
      <div className="login-screen__bg" aria-hidden>
        <Image
          src="/assets/images/bg-intro.png"
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover' }}
        />
      </div>
      <div className="login-screen__scrim" aria-hidden />

      <div className="login-screen__content">
        <div className="login-card">
          <div className="login-card__header">
            <div className="login-card__seal" aria-hidden>
              ❖
            </div>
            <span className="login-card__eyebrow">Professor Credential</span>
            <h1 className="login-card__title">임명장 수락</h1>
            <p className="login-card__desc">
              이메일로 매직 링크를 보내드려요.
              <br />
              링크를 눌러 강의실로 입장하세요.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="login-form__label" htmlFor="login-email">
                교수 이메일
              </label>
              <input
                id="login-email"
                className="login-form__input"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isBusy || status === 'sent'}
                aria-invalid={status === 'error'}
                required
              />
            </div>

            <button
              type="submit"
              className="login-form__button"
              disabled={isBusy || status === 'sent' || !email.trim()}
            >
              {status === 'sending'
                ? '보내는 중…'
                : status === 'sent'
                  ? '메일 확인'
                  : '매직 링크 받기'}
            </button>

            {status === 'sent' && (
              <div className="login-notice login-notice--success" role="status">
                <strong>{email}</strong> 로 링크를 보냈습니다. 메일함을
                확인하고 링크를 눌러주세요.
              </div>
            )}
            {status === 'error' && errorMsg && (
              <div className="login-notice login-notice--error" role="alert">
                {errorMsg}
              </div>
            )}
          </form>

          <div className="login-footer">
            <p>
              역튜터링 미연시 <strong>페르마의 인연</strong>
            </p>
            <p>
              링크를 받지 못했다면 스팸 폴더를 확인하거나 다시 시도해 주세요.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}
