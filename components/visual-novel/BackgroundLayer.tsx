import Image from 'next/image';

const images: Record<string, string> = {
  'bg-lobby.png': '/assets/bg-lobby.webp',
  'bg-intro.png': '/assets/bg-intro.webp',
  'bg-mem-1.png': '/assets/images/bg-mem-1.png',
  'bg-mem-2.png': '/assets/images/bg-mem-2.png',
  'bg-mem-3.png': '/assets/images/bg-mem-3.png',
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
          <Image
            src={images[characterImage]}
            alt="페르마 캐릭터 스프라이트"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="character-image"
          />
        )}
      </div>
    </>
  );
}
