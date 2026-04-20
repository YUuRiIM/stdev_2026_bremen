import { Suspense } from 'react';
import LectureClient from './LectureClient';

/**
 * Server wrapper — LectureClient uses `useSearchParams()` which triggers
 * the CSR bail-out during static generation. Wrapping in Suspense lets
 * Next prerender the shell while the client bit reads the search params
 * at mount.
 */
export default function LecturePage() {
  return (
    <Suspense fallback={null}>
      <LectureClient />
    </Suspense>
  );
}
