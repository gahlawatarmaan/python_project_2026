# python_project_2026 — House Price Predictor

A house price prediction model built from scratch with linear regression and
batch gradient descent, plus a static website that runs the trained model
entirely in the browser.

**Team:** Armaan Gahlawat · Ananyo Sarkar

**Website:** _add the live link here_

---

## How it fits together

```
model.py  →  weights.json  →  app.js  →  index.html + styles.css
 training      parameters       inference       interface
```

`model.py` learns the parameters from 100,000 house sales. Those parameters and
the scaling constants are stored in `weights.json`. The website loads that file
and applies the same formula in JavaScript, so predictions are instant and need
no server.

---

## Repository layout

| File | Purpose |
|---|---|
| `model.py` | Multivariate linear regression trained with batch gradient descent |
| `house_price_prediction_dataset.csv` | 100,000 house sales, 7 features + `price` |
| `weights.json` | Exported parameters and metadata used by the website |
| `index.html` | Page structure: hero, sliders, RUN IT, result |
| `styles.css` | Monochrome glass design, dark/light themes, responsive layout |
| `app.js` | Loads `weights.json`, runs inference, animations, price meter |
| `README.md` | This file |

---

## The model

| | |
|---|---|
| Task | Supervised regression |
| Algorithm | Multivariate linear regression, `ŷ = w·x + b` |
| Training | Batch gradient descent, 10,000 iterations, α = 0.1 |
| Data | 100,000 rows × 7 numeric features |
| Scaling | Min-max normalisation to [0, 1] for features and target |
| Loss | Mean squared error, halved |
| Metric | R² = 0.9728 on the training data |

Features: `sqft_living`, `bedrooms`, `bathrooms`, `year_built`, `lot_size`,
`condition_score`, `distance_to_center_miles`.

No scikit-learn: the training loop and the cost function are implemented by hand
with NumPy and pandas.

Learned weights (normalised scale):

| Feature | Weight | Effect |
|---|---|---|
| `sqft_living` | +0.599 | dominant driver |
| `lot_size` | +0.243 | strong |
| `distance_to_center_miles` | −0.093 | farther = cheaper |
| `condition_score` | +0.071 | better condition = pricier |
| `year_built` | +0.052 | newer = pricier |
| `bedrooms` | +0.043 | mild |
| `bathrooms` | +0.039 | mild |

Bias: 0.0953 (normalised).

Because features are min-max normalised, a weight is the price change across the
full min→max range of that feature, not per unit.

---

## How a prediction is made

1. Read the seven slider values.
2. Normalise each value with the **training** min/max stored in `weights.json`:

   ```
   x' = (x − min) / (max − min)
   ```

3. Score it:

   ```
   ŷ' = w₁x₁' + w₂x₂' + … + w₇x₇' + b
   ```

4. Convert back to dollars:

   ```
   price = ŷ' × (y_max − y_min) + y_min
   ```

5. Show the price and place it on the LOW–HIGH meter.

With the default sliders the model returns **$617,013**.

---

## How the maths works

**Normalise** every feature and the price to [0, 1]:

```
x' = (x − min) / (max − min)
```

**Predict** with a weighted sum:

```
ŷ' = w₁x₁' + w₂x₂' + … + w₇x₇' + b
```

**Learn** by batch gradient descent — repeatedly step every weight downhill
against the squared error:

```
w ← w − (α / m) · Σ (ŷ' − y') · x
b ← b − (α / m) · Σ (ŷ' − y')
```

**Denormalise** the result back to dollars:

```
price = ŷ' · (y_max − y_min) + y_min
```

Normalisation is why α = 0.1 converges; on raw unnormalised data that step size
would diverge.

---

## Notes

- R² = 0.9728 is measured on the training data. No train/test split is used, so
  it is not a generalisation score.
- The model is linear: it captures the main effect of each feature, not
  interactions between them.
- `weights.json` is the exported output of the training in `model.py`; the
  website itself does not run Python.
- `model.py` is the original training script and references the dataset location
  used during development.
