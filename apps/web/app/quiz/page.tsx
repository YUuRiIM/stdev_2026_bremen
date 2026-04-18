import QuizClient from './quizclients'

const bgPattern = '/assets/images/bg-pattern.png'
 
export const metadata = {
  title: 'Quiz',
}

export default function QuizPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `url(${bgPattern})`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        padding: '48px',
      }}
    >
      <QuizClient />
    </main>
  )
}