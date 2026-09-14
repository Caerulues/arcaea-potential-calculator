"""Read-only AFF note counter. Counting rules adapted from
https://github.com/Lolitania/ArcaeaChartNoteCounterLibrary (BSD-3-Clause).
See arcaea-note-counter-LICENSE.txt. No chart data is copied.
"""
import re, struct, bisect
def f32(x):
    return struct.unpack('f',struct.pack('f',float(x)))[0]
def count_notes(text, special_green=False):
    groups=[dict(timings={},longs=[],notes=0,enabled=True)]
    current=groups[0]; arcs=[]; density=1.; header=True
    for raw in text.splitlines():
        line=raw.strip().replace(' ','')
        if not line: continue
        if header:
            if line=='-':header=False
            elif line.startswith('TimingPointDensityFactor:'):density=f32(line.split(':')[1])
            elif not line.startswith('AudioOffset:'):raise ValueError('Unknown header '+line)
            continue
        if line.startswith('timinggroup('):
            assert current is groups[0]
            current=dict(timings={},longs=[],notes=0,enabled='noinput' not in line)
            groups.append(current);continue
        if line=='};':current=groups[0];continue
        args=line[line.index('(')+1:line.index(')')].split(',')
        if line.startswith('timing('):
            t=int(args[0]) if current['timings'] else 0
            current['timings'][t]=abs(f32(args[1]))
        elif line.startswith('('):current['notes']+=1
        elif line.startswith('hold('):
            current['longs'].append(dict(start=int(args[0]),end=int(args[1]),head=True))
        elif line.startswith('arc('):
            mode=args[9]; taps=re.findall(r'arctap\(\d+\)',line)
            if mode=='designant':continue
            if mode not in ('true','false'):raise ValueError('Unknown arc '+mode)
            if taps:current['notes']+=len(taps);continue
            if mode=='true':continue
            start,end=int(args[0]),int(args[1]);color=int(args[7])
            if color==2 and special_green:continue
            if color==3 and start==end:current['notes']+=1;continue
            a=dict(start=start,end=end,head=True,sx=f32(args[2]),ex=f32(args[3]),sy=f32(args[5]),ey=f32(args[6]))
            arcs.append(a);current['longs'].append(a)
        elif not line.startswith(('scenecontrol(','camera(')):
            raise ValueError('Unknown event '+line[:80])
    assert current is groups[0] and not header
    arcs.sort(key=lambda a:(a['start'],a['end']))
    for i,a in enumerate(arcs):
        for b in arcs[i+1:]:
            if b['start']>=a['end']+10:break
            if b['start']<=a['end']-10:continue
            if b['head'] and a['ey']==b['sy'] and abs(f32(b['sx']-a['ex']))<0.1:b['head']=False
    count=0
    for g in groups:
        if not g['enabled']:continue
        count+=g['notes'];keys=sorted(g['timings'])
        for a in g['longs']:
            if a['start']>=a['end']:continue
            bpm=g['timings'][keys[bisect.bisect_right(keys,a['start'])-1]]
            unit=f32(f32((60000 if bpm>=255 else 30000)/bpm)/density) if bpm else float('inf')
            ci=int(f32(f32(a['end']-a['start'])/unit))
            count+=1 if ci<=1 else ci-1 if a['head'] else ci
    return count
