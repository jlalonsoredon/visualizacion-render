import os
import numpy as np
import asyncio
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.datasets import make_moons, make_circles, make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier

app = FastAPI()

_executor = ThreadPoolExecutor(max_workers=2)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ModelRequest(BaseModel):
    algorithm: str
    noise: float
    dataset: str = "moons"  # "linear", "circles", "spirals"
    # Parámetros específicos por algoritmo (opcionales)
    n_neighbors: int | None = None
    C: float | None = None
    max_iter: int | None = None
    max_depth: int | None = None
    min_samples_split: int | None = None
    n_estimators: int | None = None
    # Parámetros para MLP
    hidden_layer_sizes: int | None = None
    n_hidden_layers: int | None = None
    alpha: float | None = None
    learning_rate_init: float | None = None
    # Parámetros para XGBoost
    learning_rate: float | None = None
    subsample: float | None = None


def generate_linear_data(n_samples=300, noise=0.1):
    """
    Dataset LINEALMENTE SEPARABLE
    Ideal para: Regresión Logística, SVM
    Los datos se pueden separar con una línea recta
    """
    X, y = make_classification(
        n_samples=n_samples,
        n_features=2,
        n_redundant=0,
        n_informative=2,
        n_clusters_per_class=1,
        flip_y=noise * 0.5,
        class_sep=2.0,
        random_state=42,
    )
    return X, y


def generate_circles_data(n_samples=300, noise=0.1):
    """
    Dataset NO LINEAL (Círculos concéntricos / XOR)
    Ideal para: Árboles de Decisión, Random Forest, KNN
    Fronteras geométricas que los árboles capturan bien con splits rectangulares
    """
    X, y = make_circles(n_samples=n_samples, noise=noise, factor=0.5, random_state=42)
    return X, y


def generate_spirals_data(n_samples=300, noise=0.1):
    """
    Dataset COMPLEJO (Espirales entrelazadas)
    Ideal para: Redes Neuronales, XGBoost
    Patrones continuos y complejos que requieren transformaciones no lineales
    """
    n = n_samples // 2
    theta = np.sqrt(np.random.rand(n)) * 2 * np.pi

    r_a = 2 * theta + np.pi
    data_a = np.array([np.cos(theta) * r_a, np.sin(theta) * r_a]).T
    x_a = data_a + np.random.randn(n, 2) * noise * 2

    r_b = -2 * theta - np.pi
    data_b = np.array([np.cos(theta) * r_b, np.sin(theta) * r_b]).T
    x_b = data_b + np.random.randn(n, 2) * noise * 2

    X = np.vstack([x_a, x_b])
    y = np.hstack([np.zeros(n), np.ones(n)])

    return X, y


@app.post("/predict")
async def predict_boundary(req: ModelRequest):
    def _compute():
        # Generar datos sintéticos según el dataset seleccionado
        if req.dataset == "linear":
            X, y = generate_linear_data(n_samples=300, noise=req.noise)
        elif req.dataset == "circles":
            X, y = generate_circles_data(n_samples=300, noise=req.noise)
        elif req.dataset == "spirals":
            X, y = generate_spirals_data(n_samples=300, noise=req.noise)
        else:  # "moons" por defecto
            X, y = make_moons(n_samples=300, noise=req.noise, random_state=42)

        # Seleccionar Modelo
        if req.algorithm == "Logistic Regression":
            clf = LogisticRegression(C=req.C or 1.0, max_iter=req.max_iter or 100)
        elif req.algorithm == "KNN":
            k = req.n_neighbors or 5
            clf = KNeighborsClassifier(n_neighbors=k)
        elif req.algorithm == "Neural Network":
            hidden_size = min(req.hidden_layer_sizes or 10, 64)
            n_layers = min(req.n_hidden_layers or 2, 5)
            hidden_layers = tuple([hidden_size] * n_layers)
            clf = MLPClassifier(
                hidden_layer_sizes=hidden_layers,
                max_iter=min(req.max_iter or 200, 500),
                alpha=req.alpha or 0.0001,
                learning_rate_init=req.learning_rate_init or 0.001,
                random_state=42,
            )
        elif req.algorithm == "Decision Tree":
            clf = DecisionTreeClassifier(
                max_depth=req.max_depth or 5, min_samples_split=req.min_samples_split or 2
            )
        elif req.algorithm == "Random Forest":
            clf = RandomForestClassifier(
                n_estimators=min(req.n_estimators or 20, 200),
                max_depth=req.max_depth or 5,
                min_samples_split=req.min_samples_split or 2,
            )
        elif req.algorithm == "XGBoost":
            clf = XGBClassifier(
                n_estimators=min(req.n_estimators or 100, 300),
                max_depth=req.max_depth or 3,
                learning_rate=req.learning_rate or 0.1,
                subsample=req.subsample or 0.8,
                random_state=42,
            )
        else:
            clf = LogisticRegression()

        clf.fit(X, y)

        # Predicciones para métricas
        y_pred = clf.predict(X)

        # Matriz de confusión
        from sklearn.metrics import (
            confusion_matrix,
            precision_score,
            recall_score,
            roc_auc_score,
        )

        cm = confusion_matrix(y, y_pred)
        cm_list = cm.tolist()

        precision = precision_score(y, y_pred, zero_division=0)
        recall = recall_score(y, y_pred, zero_division=0)
        try:
            auc = roc_auc_score(y, y_pred)
        except Exception:
            auc = 0.0

        # Crear Malla (Grid)
        x_min, x_max = X[:, 0].min() - 0.5, X[:, 0].max() + 0.5
        y_min, y_max = X[:, 1].min() - 0.5, X[:, 1].max() + 0.5
        h = 0.15
        xx, yy = np.meshgrid(np.arange(x_min, x_max, h), np.arange(y_min, y_max, h))

        Z = clf.predict(np.c_[xx.ravel(), yy.ravel()])
        Z = Z.reshape(xx.shape)

        return {
            "points": [
                {"x": float(x[0]), "y": float(x[1]), "label": int(label)}
                for x, label in zip(X, y)
            ],
            "boundary": Z.tolist(),
            "grid_dims": {
                "x_min": x_min,
                "x_max": x_max,
                "y_min": y_min,
                "y_max": y_max,
                "width": xx.shape[1],
                "height": xx.shape[0],
            },
            "confusion_matrix": cm_list,
            "metrics": {"precision": precision, "recall": recall, "auc": auc},
        }

    # Ejecutar en thread con timeout de 30 segundos
    loop = asyncio.get_event_loop()
    try:
        result = await asyncio.wait_for(
            loop.run_in_executor(_executor, _compute),
            timeout=30.0
        )
        return result
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Cálculo demasiado lento. Prueba con parámetros menos exigentes.")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
