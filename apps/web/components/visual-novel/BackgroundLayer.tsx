import Image from 'next/image';

const images: Record<string, string> = {
  'bg-lobby.png': '/assets/images/bg-lobby.webp',
  'bg-lobby-night.png': '/assets/images/bg-lobby-night.png',
  'bg-intro.png': '/assets/images/bg-intro.webp',
  'bg-mem-1.png': '/assets/images/bg-mem-1.png',
  'bg-mem-2.png': '/assets/images/bg-mem-2.png',
  'bg-mem-3.png': '/assets/images/bg-mem-3.png',
  'bg-fermat-ball.png': '/assets/images/bg-fermat-ball.png',
  'fermat-png.png': '/assets/images/fermat-png.png',
  'fermat-png-dark.png': '/assets/images/fermat-png-dark.png',
};

type Props = {
  backgroundImage?: string;
  characterImage?: string;
};

export default function BackgroundLayer({ backgroundImage, characterImage }: Props) {
  return (
    <>
      <div className="background-layer">
        {backgroundImage && images[backgroundImage] && (
          <Image
            src={images[backgroundImage]}
            alt="장면 배경"
            fill
            sizes="100vw"
            className="background-image"
            priority
          />
        )}
      </div>
      <div className="character-layer">
        {characterImage && images[characterImage] && (
          // next/image `fill` requires a sized parent; character-layer has
          // `height: 85%; width: auto` (content-driven) so `fill` would collapse.
          // Keep as <img> for natural aspect-ratio sizing (same as legacy CRA).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[characterImage]}
            alt="페르마 캐릭터 스프라이트"
            className="character-image"
          />
        )}
      </div>
    </>
  );
}
