import sys, json, joblib, pandas as pd

bundle = joblib.load("ml/intern_model.joblib")
pipe = bundle["pipeline"]
FEATURES = bundle["features"]

def clean(s): 
    return (s or "").strip().lower()

try:
    raw = sys.stdin.read() or "{}"
    req = json.loads(raw)
except Exception as e:
    req = {}

row = {
    "institut":  clean(req.get("institut", "")),
    "specialite": clean(req.get("specialite", "")),
    "objet_stage": clean(req.get("objet_stage", "")),
    "duree_jours": float(req.get("duree_jours") or 0)
}
X = pd.DataFrame([row], columns=FEATURES)
proba = float(pipe.predict_proba(X)[0, 1])
print(json.dumps({"proba": proba}))
