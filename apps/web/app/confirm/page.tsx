'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

const bgPattern = '/assets/images/bg-pattern.png'
const pickButton = '/assets/images/pick-button.png'

const characterMap: Record<string, {
  name: string
  subject: string
  colorful: string
  resume: string
}> = {
  fermat: {
    name: '페르마',
    subject: '수학',
    colorful: '/assets/images/fermat-png-colorful.png',
    resume: '/assets/images/cv-fermat-nopostit.png'
  },
  hawking: {
    name: '호킹',
    subject: '과학',
    colorful: '/assets/images/hawking-png-colorful.png',
    resume: '/assets/images/cv-hawking-nopostit.png'
  }
}

function CharacterConfirmScreen() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  const characterId = searchParams.get('character') || 'fermat'
  const character = characterMap[characterId] || characterMap.fermat

  useEffect(() => {
    document.body.style.overflow = 'hidden'

    const timeout = requestAnimationFrame(() => setIsMounted(true))

    return () => {
      document.body.style.overflow = 'auto'
      cancelAnimationFrame(timeout)
    }
  }, [])

  const handlePickClick = () => {
    setIsConfirmOpen(true)
  }

  const handleConfirm = () => {
    setIsConfirmOpen(false)
    router.push('/lobby')
  }

  const handleCancel = () => {
    setIsConfirmOpen(false)
  }

  return (
    <section className="screen confirm-screen">
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

      <div
        className="confirm-layout"
        style={{
          padding: '100px'
        }}
      >
        <article
          className={`confirm-resume-card confirm-resume-card--large enter-left ${
            isMounted ? 'enter-active' : ''
          }`}
          style={{
            position: 'absolute',
            top: '24px',
            bottom: '24px',
            left: '15%',
            border: '4px solid #FFA500',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}
        >
          <img
            src={character.resume}
            alt="이력서"
            style={{
              display: 'block',
              height: '100%',
              width: 'auto',
              objectFit: 'contain'
            }}
          />

          <button
            type="button"
            onClick={handlePickClick}
            style={{
              position: 'absolute',
              right: '16px',
              bottom: '16px',
              width: '220px',
              height: '220px',
              backgroundImage: `url(${pickButton})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer'
            }}
          />
        </article>

        <div
          className={`confirm-preview-panel enter-right ${
            isMounted ? 'enter-active' : ''
          }`}
          style={{
            position: 'absolute',
            right: '100px',
            bottom: 0,
            width: 'min(38vw, 560px)',
            height: 'calc(100vh - 48px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            overflow: 'hidden'
          }}
        >
          <img
            src={character.colorful}
            alt="캐릭터 일러스트"
            style={{
              display: 'block',
              width: 'auto',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </div>

        <Link href="/select" className="character-detail__back-button">
          ←
        </Link>
      </div>

      {isConfirmOpen && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <div className="confirm-dialog__header">
              <h2 className="confirm-dialog__title">캐릭터 선택 안내</h2>
            </div>

            <p className="confirm-dialog__description">
              <strong>[{character.subject}] 과목을 담당하여 학습하고 수업하게 됩니다.</strong>
              {character.name}을(를) 선발하겠습니까? 캐릭터는 설정에서 추후 바꿀 수 있습니다.
            </p>

            <div className="confirm-dialog__actions">
              <button
                type="button"
                className="confirm-dialog__button confirm-dialog__button--cancel"
                onClick={handleCancel}
              >
                아니요
              </button>

              <button
                type="button"
                className="confirm-dialog__button confirm-dialog__button--confirm"
                onClick={handleConfirm}
              >
                네
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CharacterConfirmScreen />
    </Suspense>
  )
}