import pandas as pd, joblib, os
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression

# Adjust path if CSV is elsewhere
CSV_PATH = os.environ.get("TRAIN_CSV", "interns_training.csv")

df = pd.read_csv(CSV_PATH, encoding="utf-8")

FEAT_CAT = ["institut", "specialite", "objet_stage"]
FEAT_NUM = ["duree_jours"]
TARGET = "bon_stagiaire"

X = df[FEAT_CAT + FEAT_NUM].copy()
y = df[TARGET].copy()

prep = ColumnTransformer([
    ("cat", OneHotEncoder(handle_unknown="ignore"), FEAT_CAT),
    ("num", "passthrough", FEAT_NUM),
])

model = Pipeline([
    ("prep", prep),
    ("clf", LogisticRegression(max_iter=1000))
])

model.fit(X, y)
joblib.dump({"pipeline": model, "features": FEAT_CAT + FEAT_NUM}, "intern_model.joblib")
print("saved: ml/intern_model.joblib")
