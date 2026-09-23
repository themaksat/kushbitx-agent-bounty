#!/usr/bin/env python3
import argparse,json,math,sys,time,urllib.request,urllib.parse,urllib.error
from datetime import datetime,timezone
from pathlib import Path

API="https://1f916.ai/api"; DAY=86400000
START="2026-08-12T21:33:32Z"; CUTOFF="2026-09-08T00:00:00Z"
ms=lambda x:int(datetime.fromisoformat(x.replace("Z","+00:00")).timestamp()*1000)
START_MS,CUT_MS=ms(START),ms(CUTOFF)

def get(path):
    u=API+path
    for i in range(9):
        try:
            q=urllib.request.Request(u,headers={"User-Agent":"listing39-independent-replication/1.0","Accept":"application/json","Cache-Control":"no-cache"})
            with urllib.request.urlopen(q,timeout=45) as r:return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code!=429 and not 500<=e.code<600: raise
            w=float(e.headers.get("Retry-After") or min(30,1.5*2**i))
        except (urllib.error.URLError,TimeoutError):
            w=min(30,1.5*2**i)
        print("retry",i+1,u,"sleep",w,file=sys.stderr); time.sleep(w)
    raise RuntimeError("fetch failed "+u)

def citizens():
    for attempt in range(3):
        out=[]; cur=0; pages=0
        while True:
            d=get("/citizens?"+urllib.parse.urlencode({"since":cur})); pages+=1
            out+=d["citizens"]
            if not d["has_more"]: total=d["total"]; break
            cur=d["next_since"]
        if len(out)==len({x["citizen_id"] for x in out})==total:
            return out,{"pages":pages,"enumerated":len(out),"endpoint_total":total,"reconciled":True,"restarts":attempt}
    raise RuntimeError("citizen census did not reconcile")

def binds():
    for attempt in range(3):
        out=[]; cur=0; pages=0
        while True:
            d=get("/events?"+urllib.parse.urlencode({"kind":"key-bind","since":cur})); pages+=1
            out+=d["events"]
            if not d["has_more"]: total=d["total"]; break
            cur=d["next_since"]
        if len(out)==len({x["id"] for x in out})==total:
            return out,{"pages":pages,"enumerated":len(out),"endpoint_total":total,"reconciled":True,"restarts":attempt}
    raise RuntimeError("key-bind log did not reconcile")

def first_binds(events):
    z={}
    for e in events:
        h=e.get("citizen"); t=e.get("created_at")
        if h and isinstance(t,int): z[h]=min(z.get(h,t),t)
    return z

def boundary(rows,fb):
    ds=[]
    for c in rows:
        h=c["handle"]
        if h in fb:
            d=fb[h]-c["created_at"]
            if d>=0: ds.append((d,h))
    ds.sort()
    gaps=[]
    for i in range(1,len(ds)):
        a,b=ds[i-1][0],ds[i][0]
        if a>0 and b>a:gaps.append((b/a,a,b,ds[i-1][1],ds[i][1]))
    gaps.sort(reverse=True)
    r,a,b,ha,hb=gaps[0]
    rr=None if len(gaps)<2 else {"ratio":gaps[1][0],"low_ms":gaps[1][1],"high_ms":gaps[1][2]}
    return {"n":len(ds),"threshold_ms":a,"low_ms":a,"high_ms":b,"ratio":r,"low_handle":ha,"high_handle":hb,"runner_up":rr}

def snapmax(tok):
    if tok and tok.startswith("snapi:"):return int(tok.split(":")[1])
    if tok and tok.startswith("id:"):return int(tok.split(":")[1])

def done(tok,m):
    if tok=="done":return True
    if not tok or m is None:return False
    if tok.startswith("id:"):return int(tok.split(":")[1])>=m
    if tok.startswith("snapi:"):
        _,sm,a=tok.split(":"); return int(sm)==m and int(a)>=m
    return False

def changes(cohort,active,active2):
    since=START_MS+7*DAY-1; latest=CUT_MS+15*DAY
    pt=ct="init"; pm=cm=None; pages=ps=cs=0; snap_now=None
    while True:
        q=urllib.parse.urlencode({"since":since,"posts_since":pt,"comments_since":ct,"nulls_since":"done"})
        d=get("/changes?"+q); pages+=1
        if snap_now is None:snap_now=d.get("now_utc")
        np,nc=d.get("next_posts_since",pt),d.get("next_comments_since",ct)
        if pm is None:pm=snapmax(np)
        if cm is None:cm=snapmax(nc)
        posts,comms=d.get("posts",[]),d.get("comments",[]); ps+=len(posts); cs+=len(comms)
        for row in posts+comms:
            h,t=row.get("author"),row.get("created_at"); c=cohort.get(h)
            if not c or not isinstance(t,int) or t>=latest:continue
            reg=c["created_at"]
            if reg+7*DAY<=t<reg+14*DAY:active.add(h)
            if reg+8*DAY<=t<reg+15*DAY:active2.add(h)
        pd,cd=done(np,pm),done(nc,cm)
        pt="done" if pd else np; ct="done" if cd else nc
        if pages%10==0:print("changes",pages,ps,cs,pd,cd,file=sys.stderr)
        if pd and cd:break
        if pages>500:raise RuntimeError("unbounded changes walk")
    return {"mode":"lossless ID snapshot","pages":pages,"rows_streamed":{"posts":ps,"comments":cs},"snapshot_max_ids":{"posts":pm,"comments":cm},"snapshot_started_utc":snap_now,"drained":True}

def wilson(k,n,z=1.959963984540054):
    p=k/n; zz=z*z; den=1+zz/n; c=(p+zz/(2*n))/den
    h=z*math.sqrt((p*(1-p)+zz/(4*n))/n)/den
    return max(0,c-h),min(1,c+h)

def diff(k1,n1,k2,n2):
    p1,p2=k1/n1,k2/n2; l1,u1=wilson(k1,n1); l2,u2=wilson(k2,n2); d=p1-p2
    return {"diff":d,"low":max(-1,d-math.sqrt((p1-l1)**2+(u2-p2)**2)),"high":min(1,d+math.sqrt((u1-p1)**2+(p2-l2)**2))}

def arm(c,fb,t):
    h=c["handle"]
    if h not in fb:return "none"
    d=fb[h]-c["created_at"]
    return "door" if 0<=d<=t else "sought"

def table(rows,fb,t,active):
    a={x:{"n":0,"active":0} for x in ("door","sought","none")}
    for c in rows:
        x=arm(c,fb,t); a[x]["n"]+=1; a[x]["active"]+=int(c["handle"] in active)
    for x in a:
        d=a[x]; d["rate"]=d["active"]/d["n"]; d["wilson95"]=wilson(d["active"],d["n"])
    return {"arms":a,"pairs":{
        "door-sought":diff(a["door"]["active"],a["door"]["n"],a["sought"]["active"],a["sought"]["n"]),
        "door-none":diff(a["door"]["active"],a["door"]["n"],a["none"]["active"],a["none"]["n"]),
        "sought-none":diff(a["sought"]["active"],a["sought"]["n"],a["none"]["active"],a["none"]["n"])}}

def pc(x):return f"{100*x:.2f}%"
def pp(x):return f"{100*x:+.2f} pp"

def mdtable(t):
    z=["| arm | n | retained | rate | Wilson 95% |","|---|---:|---:|---:|---:|"]
    for x in ("door","sought","none"):
        d=t["arms"][x]; lo,hi=d["wilson95"]; z.append(f"| {x} | {d['n']} | {d['active']} | {pc(d['rate'])} | [{pc(lo)}, {pc(hi)}] |")
    z+=["","| contrast | difference | Newcombe 95% |","|---|---:|---:|"]
    for x,d in t["pairs"].items():z.append(f"| {x} | {pp(d['diff'])} | [{pp(d['low'])}, {pp(d['high'])}] |")
    return "\n".join(z)

def main():
    p=argparse.ArgumentParser(); p.add_argument("--output-dir",default="out"); a=p.parse_args()
    out=Path(a.output_dir); out.mkdir(parents=True,exist_ok=True)
    now=datetime.now(timezone.utc)
    if int(now.timestamp()*1000)-CUT_MS<15*DAY:raise RuntimeError("cutoff too recent for sensitivity")
    falsifier=("Endpoint reconciliation failure invalidates the numbers. A door-vs-none 95% Newcombe interval containing zero means no detectable difference at 95%. "
               "If the primary interval excludes zero but the predeclared +1-day window includes zero or reverses sign, the reading is window-sensitive. "
               "If global and cohort-derived arm thresholds differ, both classifications are reported.")
    print("citizens",file=sys.stderr); cs,ca=citizens()
    print("key binds",file=sys.stderr); ev,ea=binds(); fb=first_binds(ev)
    cohort=[c for c in cs if START_MS<=c["created_at"]<CUT_MS]; cmap={c["handle"]:c for c in cohort}
    gb,cb=boundary(cs,fb),boundary(cohort,fb)
    act,act2=set(),set(); print("changes",file=sys.stderr); cha=changes(cmap,act,act2)
    t1,t2=table(cohort,fb,gb["threshold_ms"],act),table(cohort,fb,gb["threshold_ms"],act2)
    alt=None
    if cb["threshold_ms"]!=gb["threshold_ms"]:alt={"threshold_ms":cb["threshold_ms"],"primary":table(cohort,fb,cb["threshold_ms"],act),"sensitivity":table(cohort,fb,cb["threshold_ms"],act2)}
    p0=t1["pairs"]["door-none"]; p1=t2["pairs"]["door-none"]
    ex0=p0["low"]>0 or p0["high"]<0; ex1=p1["low"]>0 or p1["high"]<0; same=(p0["diff"]>=0)==(p1["diff"]>=0)
    conclusion=("door-vs-none differs from zero at 95% in both windows; descriptive association only" if ex0 and ex1 and same else
                "primary door-vs-none result is window-sensitive" if ex0 else
                "primary door-vs-none interval includes zero; no detectable difference at 95%")
    stats=get("/stats").get("society",{})
    res={"listing":39,"run_utc":now.isoformat().replace("+00:00","Z"),"population":{"start":START,"cutoff_exclusive":CUTOFF,"n":len(cohort)},
         "windows":{"primary":"[reg+7d,reg+14d)","sensitivity":"[reg+8d,reg+15d)"},
         "boundary":{"primary_scope":"global public first-bind delays","global":gb,"cohort":cb},
         "primary":t1,"sensitivity":t2,"alternate_cohort_boundary":alt,
         "completeness":{"citizens":ca,"key_binds":ea,"changes":cha,"stats_end":stats},
         "falsifier_predeclared":falsifier,"conclusion":conclusion,
         "limits":["association not causation","sought is defined by a post-registration event"]}
    (out/"results.json").write_text(json.dumps(res,indent=2,sort_keys=True)+"\n")
    report=f"""# OpenWitness Listing 39 independent replication

Run: {res['run_utc']}
Population: [{START}, {CUTOFF}), n={len(cohort)}
Primary outcome: authored post/comment in [registration+7d, registration+14d).
Sensitivity: [registration+8d, registration+15d).

## Derived arm boundary
Global: {gb['low_ms']} ms -> {gb['high_ms']} ms ({gb['ratio']:.4f}x), n={gb['n']}. Door threshold <= {gb['threshold_ms']} ms.
Cohort diagnostic: {cb['low_ms']} ms -> {cb['high_ms']} ms ({cb['ratio']:.4f}x), n={cb['n']}.

## Primary
{mdtable(t1)}

## +1-day sensitivity
{mdtable(t2)}

## Conclusion
{conclusion}. Registration path is not randomized, so this is association, not causation.

## Completeness
citizens: {ca['enumerated']}/{ca['endpoint_total']} in {ca['pages']} pages, reconciled={ca['reconciled']}
key-bind events: {ea['enumerated']}/{ea['endpoint_total']} in {ea['pages']} pages, reconciled={ea['reconciled']}
changes: lossless ID snapshot, {cha['pages']} pages, posts={cha['rows_streamed']['posts']}, comments={cha['rows_streamed']['comments']}, max IDs={cha['snapshot_max_ids']}, drained={cha['drained']}
stats at end: citizens={stats.get('citizens')}, posts={stats.get('posts')}, comments={stats.get('comments')}

## Predeclared falsifier
{falsifier}
"""
    if alt: report+=f"\n## Boundary divergence\nGlobal and cohort thresholds differ. Cohort-threshold primary:\n{mdtable(alt['primary'])}\n\nCohort-threshold sensitivity:\n{mdtable(alt['sensitivity'])}\n"
    (out/"REPORT.md").write_text(report); print(report)

if __name__=="__main__":main()
