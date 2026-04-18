'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const bgPattern = '/assets/images/bg-pattern.png'
const fermatColorful = '/assets/images/fermat-png-colorful.png'
const cvFermat = '/assets/images/cv-fermat-nopostit.png'
const pickButton = '/assets/images/pick-button.png'

function CharacterConfirmScreen () {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const timeout = window.requestAnimationFrame(() => setIsMounted(true))
    return () => window.cancelAnimationFrame(timeout)
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
    <section
      className='screen confirm-screen'
      style={{
        backgroundImage: `url(${bgPattern})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        width: '100%',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      <div
        className='confirm-layout'
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        <article
          className={`confirm-resume-card confirm-resume-card--large enter-left ${isMounted ? 'enter-active' : ''}`}
          style={{
            position: 'absolute',
            top: '24px',
            bottom: '24px',
            left: '10%',
            border: '4px solid #FFA500',
            borderRadius: 0,
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cvFermat}
            alt='이력서'
            style={{
              display: 'block',
              height: '100%',
              width: 'auto',
              objectFit: 'contain',
              margin: 0,
              padding: 0
            }}
          />

          <button
            type='button'
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
          className={`confirm-preview-panel enter-right ${isMounted ? 'enter-active' : ''}`}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 'min(38vw, 560px)',
            height: 'calc(100vh - 48px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            overflow: 'hidden',
            margin: 0,
            padding: 0
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fermatColorful}
            alt='캐릭터 일러스트'
            style={{
              display: 'block',
              width: 'auto',
              height: '100%',
              objectFit: 'contain',
              margin: 0,
              padding: 0
            }}
          />
        </div>

        <Link href='/' className='character-detail__back-button'>
          ←
        </Link>
      </div>
      {isConfirmOpen && (
        <div className='confirm-dialog-overlay'>
          <div className='confirm-dialog'>
            <div className='confirm-dialog__header'>
              <h2 className='confirm-dialog__title'>캐릭터 선택 안내</h2>
            </div>
            <p className='confirm-dialog__description'>
              <strong>[수학] 과목을 담당하여 학습하고 수업하게 됩니다.</strong>
              페르마를 선발하겠습니까? 캐릭터는 설정에서 추후 바꿀 수 있습니다.
            </p>
            <div className='confirm-dialog__actions'>
              <button type='button' className='confirm-dialog__button confirm-dialog__button--cancel' onClick={handleCancel}>
                아니요
              </button>
              <button type='button' className='confirm-dialog__button confirm-dialog__button--confirm' onClick={handleConfirm}>
                네
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default CharacterConfirmScreen
