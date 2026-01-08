# Labo Interactif - Distribution Logistique

[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://aboulaakoul-elwalid.github.io/logistic-lab/)

Application web interactive pour l'estimation et la validation statistique de la distribution logistique.

[![Preview](preview.png)](https://aboulaakoul-elwalid.github.io/logistic-lab/)

**[Ouvrir l'application](https://aboulaakoul-elwalid.github.io/logistic-lab/)**

## Fonctionnalites

### Generateur de Donnees
- Parametres ajustables: mu (location), s (scale), n (taille)
- Seed pour reproductibilite
- Import CSV

### Estimation
- **Methode des Moments (MoM)**: mu = x-barre, s = sqrt(Var) * sqrt(3)/pi
- **Maximum de Vraisemblance (MLE)**: Optimisation Nelder-Mead

### Visualisation
- Histogramme des donnees
- PDF theorique vs estimees (MoM, MLE)
- Export PNG/SVG

### Validation Statistique
- Information de Fisher
- Tests de Wald (H0: mu = mu0, H0: s = s0)
- Intervalles de confiance 95%

### Monte Carlo
- Simulation multiple (50-1000 repetitions)
- Comparaison biais/MSE entre MoM et MLE

## Utilisation

### Lien direct
```
https://aboulaakoul-elwalid.github.io/logistic-lab/
```

### Partager avec parametres
```
https://aboulaakoul-elwalid.github.io/logistic-lab/?mu=5&s=2&n=1000&seed=42
```

## Technologies
- Vanilla JavaScript
- Plotly.js (graphiques)
- KaTeX (formules)
- 100% client-side (pas de serveur)

## Auteur
Projet realise dans le cadre du cours de Statistique Decisionnelle - ENSA
