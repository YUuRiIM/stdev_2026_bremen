import json
import re

def parse_script(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 빈 줄로 블록 분리 (2개 이상의 줄바꿈)
    blocks = re.split(r'\n\s*\n', content.strip())

    script = []

    for block in blocks:
        lines = block.strip().split('\n')
        if not lines:
            continue

        first_line = lines[0].strip()
        name=""
        speaking=True

        if first_line.startswith('[') and first_line.endswith(']'):
            # 나레이션
            speaker = 'narrative'
            speaking=False
            text = block.strip()
        elif first_line.startswith('페르마:'):
            # 페르마 대사 제외, 텍스트만
            text = block.strip().replace('페르마:', '').strip()
            speaker = 'character'
            name ='페르마'
            speaking=True
        
        elif first_line.startswith('페르마 (속마음):'):
            # 페르마 대사 제외, 텍스트만
            text = block.strip().replace('페르마 (속마음):', '').strip()
            speaker = 'character'
            name = '페르마 (속마음)'
            speaking=True
        else:
            # 다른 캐릭터나 나레이션
            text = block.strip().replace('나:', '').replace('페르마 (속마음):', '').strip()
            speaker = 'narrative'
            speaking=False
        cimage="" 
        if speaking:
            cimage = 'fermat-png.png'
        else:
            cimage = 'fermat-png-dark.png'


        entry = {
            'speaker': speaker,
            'name': name,
            'text': text,
            'characterImage': cimage,
            'backgroundImage': 'bg-lobby.png'
        }

        script.append(entry)

    return script

import os
import json

script = parse_script('script-fermat-4.txt') 
with open('script-fermat-4.json', 'w', encoding='utf-8') as f: json.dump(script, f, ensure_ascii=False, indent=2) 
print('JSON 변환 완료')

# for i in range(1, 1):
#     txt_file = f"script-fermat-{i}.txt"
#     json_file = f"script-fermat-{i}.json"

#     # 파일 없으면 스킵
#     if not os.path.exists(txt_file):
#         continue

#     script = parse_script(txt_file)

#     with open(json_file, 'w', encoding='utf-8') as f:
#         json.dump(script, f, ensure_ascii=False, indent=2)

#     print(f"{json_file} 변환 완료")