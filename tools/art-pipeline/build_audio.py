"""Build a self-contained 64-slot sound object and three licensed music styles.
Original replacements are deterministic synthesized textures, not sampled voices.
OpenSoundEffects v1.0.6 supplies 26 slots; 38 are authored below. No RCT data.
"""
import io
import json
import os
import re
import wave
import zipfile
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/generated/objects'
MUSIC = ('dodgems', 'mystic', 'rock4')
RATE = 22050


def synth(index, name):
    loop = name.startswith(('lift', 'trackFriction', 'friction')) or name in ('goKartEngine', 'tram')
    duration = 2.0 if loop else .22 if name in ('placeItem', 'windowOpen') else .7
    n = int(RATE * duration)
    t = np.arange(n) / RATE
    rng = np.random.default_rng(8700 + index)
    noise = rng.normal(0, 1, n)
    # Circular filtering makes mechanical textures continuous across a loop boundary.
    texture = sum(np.roll(noise, k) for k in range(8)) / 8
    if loop:
        pulse = (.3 + .7 * (np.sin(2*np.pi*(8+index%5)*t)**12))
        sound = texture * pulse + .12 * np.sin(2*np.pi*90*t)
        sound[-1] = sound[0]
    elif name.startswith(('scream', 'hauntedHouse', 'laugh', 'cough')):
        # Stylized non-verbal voices from harmonics/formants; no human recordings.
        pitch = 170 + index * 9 + 90*np.sin(np.pi*t/duration)
        phase = 2*np.pi*np.cumsum(pitch)/RATE
        sound = sum(np.sin(h*phase) / h for h in range(1, 9)) * .2
        if name.startswith(('laugh', 'cough')):
            sound *= np.maximum(0, np.sin(2*np.pi*(5+index%3)*t))**2
        if name.startswith('cough'):
            sound = .6*texture + .2*sound
        sound *= np.sin(np.pi*np.arange(n)/(n-1))**2
    elif name in ('placeItem', 'windowOpen'):
        sound = (.5*texture + .18*np.sin(2*np.pi*(440 if index==40 else 330)*t))*np.exp(-t*28)
        sound[:110] *= np.linspace(0,1,110)
        sound[-110:] *= np.linspace(1,0,110)
    else:
        sound = texture * np.exp(-t*(4 + index%7))
        if name in ('doorOpen', 'doorClose', 'portcullis'):
            sound += .13*np.sin(2*np.pi*(120+60*t)*t)*np.sin(np.pi*t/duration)
        if name == 'applause':
            sound *= .3 + .7*np.sin(2*np.pi*13*t)**8
        sound *= np.minimum(1,t*100)*np.minimum(1,(duration-t)*100)
    sound -= sound.mean()
    sound *= .35/max(float(np.max(np.abs(sound))), .001)
    if loop:
        sound[-1] = sound[0]
    data = io.BytesIO()
    with wave.open(data, 'wb') as wav:
        wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(RATE)
        wav.writeframes((sound*32767).astype('<i2').tobytes())
    return data.getvalue()


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    header=(ROOT/'engine/openrct2/src/openrct2/audio/Audio.h').read_text()
    enum=header.rsplit('enum class SoundId : uint8_t',1)[1].split('noScream')[0]
    names=re.findall(r'^\s*(\w+),', enum, re.M)[:64]
    assert len(names)==64
    with zipfile.ZipFile(ROOT/'.cache/assets/opensfx.zip') as pack:
        open_samples={}
        with zipfile.ZipFile(io.BytesIO(pack.read('assetpack/openrct2.sound.parkap'))) as sources:
            slots=json.loads(sources.read('manifest.json'))['objects'][0]['samples']
            index=0
            for source in slots:
                if source.startswith('$'):
                    a,b=map(int,re.search(r'(\d+)\.\.(\d+)',source).groups());index+=b-a+1
                else:
                    open_samples[index]=sources.read(source);index+=1
            assert index==64 and len(open_samples)==26
        samples=[]
        with zipfile.ZipFile(OUT/'sunrise.audio.base.parkobj','w',zipfile.ZIP_DEFLATED) as target:
            for index,name in enumerate(names):
                path=f'samples/{name}.wav'
                target.writestr(path,open_samples.get(index) or synth(index,name))
                samples.append({'source':path,'modifier':-700 if name in ('crowdAmbience','applause') else -350})
            target.writestr('object.json',json.dumps({'id':'sunrise.audio.base','authors':['Project Sunrise','OpenSoundEffects contributors'],'version':'1.0','sourceGame':'custom','objectType':'audio','samples':samples,'strings':{'name':{'en-GB':'Ridemere sound effects'}}}))
        (OUT/'openrct2.audio.additional.parkobj').write_bytes(pack.read('object/official/audio/openrct2.audio.additional.parkobj'))
    with zipfile.ZipFile(ROOT/'.cache/assets/openmusic.zip') as pack:
        for key in MUSIC:
            name=f'openrct2.music.{key}.parkobj'
            (OUT/name).write_bytes(pack.read('object/official/music/'+name))
    print('Audio: 64 base samples (38 original, 26 open), 3 additional ride sounds, 3 music tracks')

if __name__=='__main__':main()
