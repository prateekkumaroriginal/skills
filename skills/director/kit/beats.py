"""Write beat-sheet.md from beat-sheet.template.md, replacing {p:word} and {p:word#n} with that word's start time.

{3:call} is the start (seconds) of the first "call" in passage 3; {3:call#2} its second occurrence.
Words are as normalised in audio/timing.json (lower case, digits for numbers).
usage: python src/beats.py
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, 'audio/timing.json')))


def k(m):
    p, w, n = int(m.group(1)), m.group(2), int(m.group(3) or 1)
    ws = [x for x in T['words'] if x['p'] == p and x['w'] == w]
    return f"{ws[n - 1]['s']:.2f}" if len(ws) >= n else f"??{p}:{w}"


out = re.sub(r"\{(\d+):([^}#]+)(?:#(\d+))?\}", k, open(os.path.join(ROOT, 'beat-sheet.template.md')).read())
open(os.path.join(ROOT, 'beat-sheet.md'), 'w').write(out)
print('unresolved:', re.findall(r'\?\?\S+', out))
