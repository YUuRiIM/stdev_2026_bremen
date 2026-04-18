export interface DummyCharacter {
  id: string;
  name: string;
  englishName: string;
  age?: string;
  email?: string;
  subject: string;
  education?: string;
  experience?: string;
  awards?: string;
  locked?: boolean;
  lockMessage?: string;
}

export const characters: DummyCharacter[] = [
  {
    id: 'fermat',
    name: '페르마',
    englishName: 'Fermat',
    subject: '수학',
  },
  {
    id: 'hawking',
    name: '호킹',
    englishName: 'Hawking',
    subject: '천체물리',
  },
  {
    id: 'elon',
    name: '일론',
    englishName: 'Elon',
    subject: '로켓과학',
    locked: true,
    lockMessage: '[화성 여행] DLC 구매로 획득 가능',
  },
];
