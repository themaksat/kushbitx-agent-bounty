import json, ssl, time, urllib.request, urllib.error, collections, os, datetime

ENDPOINT = "https://rustchain.org/attest/submit"
OUTDIR = "artifacts"
os.makedirs(OUTDIR, exist_ok=True)
cases = []

def add(category, payload, content_type="application/json", raw=None):
    cases.append({"category": category, "payload": payload, "content_type": content_type, "raw": raw})

for p in [{}, {"miner":"u4350637864-stack"}, {"nonce":"x"}, {"signature":"x"}, {"device":{}},
          {"fingerprint":{}}, {"report":{}}, {"miner":None}, {"miner":""}, {"miner":" "}]:
    add("missing_fields", p)

wrong_values=[None, True, False, 0, -1, 1.5]
for field in ["miner","nonce","signature","public_key","device","fingerprint","report"]:
    for v in wrong_values:
        base={"miner":"u4350637864-stack","nonce":"not-a-live-challenge"}
        base[field]=v
        add("wrong_types", base)

for n in [129,256,1024,4096,16384,32768]:
    add("oversized", {"miner":"A"*n,"nonce":"x"})
for n in [1024,4096,16384,32768]:
    add("oversized", {"miner":"u4350637864-stack","nonce":"x","extra":"Z"*n})

strings=[
    "' OR '1'='1",
    "\"><script>alert(1)</script>",
    "../../etc/passwd",
    "{{7*7}}",
    "%00",
    "admin\\nX-Test: injected",
    "u4350637864-stack; DROP TABLE nope;",
    "<svg onload=alert(1)>",
    "../../../../",
    "\\\\..\\\\..\\\\",
    "%2e%2e%2f",
    "null-byte-marker",
]
for s in strings:
    add("injection_style", {"miner":s,"nonce":"x"})
    add("injection_style", {"miner":"u4350637864-stack","nonce":s})

for s in ["é","😀","Ω","汉字","a"*127,"a"*128,"a"*129,"\\t","\\r\\n","0","-1","1e309"]:
    add("special_boundary", {"miner":s,"nonce":"x"})

for cat, raw in [
    ("malformed_json","{"),
    ("malformed_json",'{"miner":'),
    ("malformed_json","null"),
    ("malformed_json","[]"),
    ("malformed_json","true"),
    ("malformed_json","123"),
    ("content_type","miner=x&nonce=y"),
    ("content_type","<xml/>"),
    ("content_type","plain text"),
]:
    add(cat, None, "application/json" if cat=="malformed_json" else "text/plain", raw)

i=0
while len(cases)<110:
    add("unknown_fields", {
        "miner":"u4350637864-stack",
        "nonce":"not-a-live-challenge",
        "unknown_"+str(i): {"nested":[i, str(i), {"ok":False}]}
    })
    i+=1

ctx=ssl.create_default_context()
results=[]
for idx, case in enumerate(cases[:110], 1):
    body=(case["raw"].encode("utf-8","replace") if case["raw"] is not None
          else json.dumps(case["payload"], ensure_ascii=False).encode("utf-8"))
    req=urllib.request.Request(
        ENDPOINT, data=body, method="POST",
        headers={"Content-Type":case["content_type"],"User-Agent":"RevenueSwarm-RustChain-Fuzz/1.0"}
    )
    started=time.time()
    status=None; response=""; error=None
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
            status=r.status
            response=r.read(4096).decode("utf-8","replace")
    except urllib.error.HTTPError as e:
        status=e.code
        response=e.read(4096).decode("utf-8","replace")
    except Exception as e:
        error=type(e).__name__+": "+str(e)
    elapsed=round(time.time()-started,3)
    api_code=None
    try:
        obj=json.loads(response) if response else {}
        api_code=obj.get("code") or obj.get("error")
    except Exception:
        pass
    results.append({
        "n":idx,"category":case["category"],"status":status,"api_code":api_code,
        "elapsed_s":elapsed,"error":error,
        "response_preview":response[:1000]
    })
    time.sleep(0.35)

status_counts=collections.Counter("ERROR" if r["status"] is None else str(r["status"]) for r in results)
category_counts=collections.Counter(r["category"] for r in results)
api_counts=collections.Counter(str(r["api_code"]) for r in results if r["api_code"])
server_errors=[r for r in results if isinstance(r["status"],int) and r["status"]>=500]
stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()

summary={
    "timestamp_utc":stamp,
    "endpoint":ENDPOINT,
    "total":len(results),
    "status_counts":dict(status_counts),
    "category_counts":dict(category_counts),
    "api_code_counts":dict(api_counts),
    "server_error_count":len(server_errors)
}
with open(f"{OUTDIR}/summary.json","w",encoding="utf-8") as f:
    json.dump(summary,f,indent=2)
with open(f"{OUTDIR}/results.json","w",encoding="utf-8") as f:
    json.dump({"summary":summary,"results":results},f,indent=2)

print("FUZZ_SUMMARY_START")
print(json.dumps(summary, indent=2))
print("FUZZ_SUMMARY_END")
