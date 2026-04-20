import { Suspense } from 'react';
import QuizClient from './quizclients';
import Link from 'next/link';

const bgPattern = '/assets/images/bg-pattern.png'

export const metadata = {
  title: 'Quiz',
}

export default function QuizPage() {
  return (
    <main
      style={{

        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}
    >
      <Link href="/lobby" className="character-detail__back-button">
        ←
      </Link>
      <img
        src={bgPattern}
        alt=""
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: -1
        }}
      />
      <Suspense
        fallback={
          <div style={{ color: '#fff', fontSize: 18 }}>퀴즈 불러오는 중…</div>
        }
      >
        <QuizClient />
      </Suspense>
    </main>
  )
}