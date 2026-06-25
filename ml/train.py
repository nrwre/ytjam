# trains the genre classifier on dataset.csv, prints accuracy/confusion matrix,
# dumps vocab+idf+weights to json so the server can do inference without python

import json
import os

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

HERE = os.path.dirname(__file__)
DATA_PATH = os.path.join(HERE, "data", "dataset.csv")
MODEL_PATH = os.path.join(HERE, "..", "server", "ml", "genre_model.json")


def main():
    df = pd.read_csv(DATA_PATH)
    df["text"] = (df["title"].fillna("") + " " + df["channel"].fillna("")).str.lower()

    x_train, x_test, y_train, y_test = train_test_split(
        df["text"], df["genre"], test_size=0.2, random_state=42, stratify=df["genre"]
    )

    vectorizer = TfidfVectorizer(max_features=3000, min_df=2)
    x_train_vec = vectorizer.fit_transform(x_train)
    x_test_vec = vectorizer.transform(x_test)

    clf = LogisticRegression(max_iter=2000)
    clf.fit(x_train_vec, y_train)

    y_pred = clf.predict(x_test_vec)
    acc = accuracy_score(y_test, y_pred)
    print(f"Held-out accuracy: {acc:.3f}\n")
    print(classification_report(y_test, y_pred))
    print("Confusion matrix (rows=true, cols=pred):")
    labels = sorted(df["genre"].unique())
    cm = confusion_matrix(y_test, y_pred, labels=labels)
    print(pd.DataFrame(cm, index=labels, columns=labels))

    # Export vocabulary + IDF + classifier weights for JS reimplementation.
    vocab = {term: int(idx) for term, idx in vectorizer.vocabulary_.items()}
    idf = vectorizer.idf_.tolist()  # aligned to index
    classes = clf.classes_.tolist()
    coef = clf.coef_.tolist()  # (n_classes, n_features)
    intercept = clf.intercept_.tolist()

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, "w", encoding="utf-8") as f:
        json.dump(
            {
                "vocab": vocab,
                "idf": idf,
                "classes": classes,
                "coef": coef,
                "intercept": intercept,
                "heldOutAccuracy": round(acc, 4),
            },
            f,
        )

    print(f"\nExported model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
