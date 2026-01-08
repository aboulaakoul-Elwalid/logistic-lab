// =====================================================
// LABO INTERACTIF - DISTRIBUTION LOGISTIQUE
// =====================================================

// Configuration par defaut
const CONFIG = {
    mu: 5,
    s: 2,
    n: 1000,
    seed: 42,
    muTest: 5,
    sTest: 2,
    mcSims: 200
};

// Etat global
let state = { ...CONFIG };
let data = [];
let estimates = { mom: {}, mle: {} };

// =====================================================
// UTILITAIRES MATHEMATIQUES
// =====================================================

// Generateur de nombres pseudo-aleatoires (Mulberry32)
function mulberry32(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

let rng = mulberry32(CONFIG.seed);

// PDF de la distribution logistique
function logisticPDF(x, mu, s) {
    const z = (x - mu) / s;
    const ez = Math.exp(-z);
    return ez / (s * Math.pow(1 + ez, 2));
}

// CDF de la distribution logistique
function logisticCDF(x, mu, s) {
    return 1 / (1 + Math.exp(-(x - mu) / s));
}

// Inverse CDF (quantile) pour simulation
function logisticQuantile(p, mu, s) {
    return mu + s * Math.log(p / (1 - p));
}

// Simulation d'echantillon logistique
function simulateLogistic(n, mu, s, seed) {
    rng = mulberry32(seed);
    const samples = [];
    for (let i = 0; i < n; i++) {
        const u = rng();
        // Eviter les extremes
        const uClamped = Math.max(0.0001, Math.min(0.9999, u));
        samples.push(logisticQuantile(uClamped, mu, s));
    }
    return samples;
}

// Statistiques descriptives
function computeStats(arr) {
    const n = arr.length;
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const sorted = [...arr].sort((a, b) => a - b);
    const median = n % 2 === 0 
        ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
        : sorted[Math.floor(n/2)];
    const min = sorted[0];
    const max = sorted[n - 1];
    return { n, mean, variance, std: Math.sqrt(variance), median, min, max };
}

// =====================================================
// ESTIMATEURS
// =====================================================

// Methode des Moments (MoM)
function estimateMoM(data) {
    const stats = computeStats(data);
    const muHat = stats.mean;
    const sHat = stats.std * Math.sqrt(3) / Math.PI;
    return { mu: muHat, s: sHat, method: 'MoM' };
}

// Log-vraisemblance
function logLikelihood(data, mu, s) {
    if (s <= 0) return -Infinity;
    let ll = 0;
    const n = data.length;
    ll -= n * Math.log(s);
    for (let i = 0; i < n; i++) {
        const z = (data[i] - mu) / s;
        ll -= z;
        ll -= 2 * Math.log(1 + Math.exp(-z));
    }
    return ll;
}

// Gradient de la log-vraisemblance
function logLikelihoodGradient(data, mu, s) {
    const n = data.length;
    let dMu = 0;
    let dS = 0;
    
    for (let i = 0; i < n; i++) {
        const z = (data[i] - mu) / s;
        const ez = Math.exp(-z);
        const p = 1 / (1 + ez);
        
        dMu += (2 * p - 1) / s;
        dS += (z * (2 * p - 1) - 1) / s;
    }
    
    return [dMu, dS];
}

// Optimisation Nelder-Mead simplifiee
function nelderMead(f, x0, options = {}) {
    const maxIter = options.maxIter || 500;
    const tol = options.tol || 1e-8;
    const alpha = 1;   // reflection
    const gamma = 2;   // expansion
    const rho = 0.5;   // contraction
    const sigma = 0.5; // shrink
    
    const n = x0.length;
    
    // Initialiser le simplexe
    let simplex = [x0.slice()];
    for (let i = 0; i < n; i++) {
        const point = x0.slice();
        point[i] += point[i] !== 0 ? 0.05 * Math.abs(point[i]) : 0.00025;
        simplex.push(point);
    }
    
    // Evaluer les points
    let values = simplex.map(p => f(p));
    let iterations = 0;
    
    while (iterations < maxIter) {
        // Trier par valeur
        const indices = values.map((v, i) => i).sort((a, b) => values[a] - values[b]);
        simplex = indices.map(i => simplex[i]);
        values = indices.map(i => values[i]);
        
        // Verifier convergence
        const range = values[n] - values[0];
        if (range < tol) break;
        
        // Centroide (sans le pire point)
        const centroid = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                centroid[j] += simplex[i][j];
            }
        }
        for (let j = 0; j < n; j++) centroid[j] /= n;
        
        // Reflexion
        const reflected = centroid.map((c, j) => c + alpha * (c - simplex[n][j]));
        const fReflected = f(reflected);
        
        if (fReflected >= values[0] && fReflected < values[n - 1]) {
            simplex[n] = reflected;
            values[n] = fReflected;
        } else if (fReflected < values[0]) {
            // Expansion
            const expanded = centroid.map((c, j) => c + gamma * (reflected[j] - c));
            const fExpanded = f(expanded);
            if (fExpanded < fReflected) {
                simplex[n] = expanded;
                values[n] = fExpanded;
            } else {
                simplex[n] = reflected;
                values[n] = fReflected;
            }
        } else {
            // Contraction
            const contracted = centroid.map((c, j) => c + rho * (simplex[n][j] - c));
            const fContracted = f(contracted);
            if (fContracted < values[n]) {
                simplex[n] = contracted;
                values[n] = fContracted;
            } else {
                // Shrink
                for (let i = 1; i <= n; i++) {
                    simplex[i] = simplex[0].map((x, j) => x + sigma * (simplex[i][j] - x));
                    values[i] = f(simplex[i]);
                }
            }
        }
        
        iterations++;
    }
    
    return {
        x: simplex[0],
        value: values[0],
        iterations
    };
}

// Maximum de Vraisemblance (MLE)
function estimateMLE(data, initWithMoM = true) {
    const start = performance.now();
    
    // Initialisation
    let x0;
    if (initWithMoM) {
        const mom = estimateMoM(data);
        x0 = [mom.mu, Math.max(0.1, mom.s)];
    } else {
        const stats = computeStats(data);
        x0 = [stats.mean, Math.max(0.1, stats.std)];
    }
    
    // Fonction objectif (a minimiser)
    const objective = (params) => {
        const [mu, s] = params;
        if (s <= 0.01) return 1e10;
        return -logLikelihood(data, mu, s);
    };
    
    const result = nelderMead(objective, x0);
    const elapsed = performance.now() - start;
    
    return {
        mu: result.x[0],
        s: Math.max(0.01, result.x[1]),
        logLik: -result.value,
        iterations: result.iterations,
        converged: result.iterations < 500,
        time: elapsed,
        method: 'MLE'
    };
}

// =====================================================
// INFORMATION DE FISHER ET TESTS
// =====================================================

// Information de Fisher (matrice pour n observations)
function fisherInformation(n, s) {
    const I11 = n / (3 * s * s);           // Var(mu)^-1
    const I22 = n * (Math.PI * Math.PI + 3) / (9 * s * s);  // Var(s)^-1
    return {
        matrix: [[I11, 0], [0, I22]],
        varMu: 3 * s * s / n,
        varS: 9 * s * s / (n * (Math.PI * Math.PI + 3))
    };
}

// Test de Wald
function waldTest(estimate, theta0, variance, alpha = 0.05) {
    const se = Math.sqrt(variance);
    const z = (estimate - theta0) / se;
    const pValue = 2 * (1 - normalCDF(Math.abs(z)));
    const critical = 1.96; // pour alpha = 0.05
    const rejected = Math.abs(z) > critical;
    
    return {
        estimate,
        theta0,
        se,
        z,
        pValue,
        rejected,
        decision: rejected ? 'Rejeté' : 'Accepté'
    };
}

// CDF normale standard (approximation)
function normalCDF(x) {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return 0.5 * (1.0 + sign * y);
}

// Intervalle de confiance
function confidenceInterval(estimate, variance, alpha = 0.05) {
    const z = 1.96; // pour 95%
    const se = Math.sqrt(variance);
    return {
        lower: estimate - z * se,
        upper: estimate + z * se,
        level: 1 - alpha
    };
}

// =====================================================
// SIMULATION MONTE CARLO
// =====================================================

async function runMonteCarlo(nSims, mu, s, n, progressCallback) {
    const results = {
        mom: { muHat: [], sHat: [] },
        mle: { muHat: [], sHat: [], times: [] }
    };
    
    for (let i = 0; i < nSims; i++) {
        const seed = 1000 + i;
        const sample = simulateLogistic(n, mu, s, seed);
        
        const mom = estimateMoM(sample);
        results.mom.muHat.push(mom.mu);
        results.mom.sHat.push(mom.s);
        
        const mle = estimateMLE(sample, true);
        results.mle.muHat.push(mle.mu);
        results.mle.sHat.push(mle.s);
        results.mle.times.push(mle.time);
        
        if (progressCallback && i % 10 === 0) {
            progressCallback((i + 1) / nSims * 100);
            await new Promise(r => setTimeout(r, 0));
        }
    }
    
    // Calculer biais et MSE
    const calcBiasMSE = (arr, trueVal) => {
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        const bias = mean - trueVal;
        const mse = arr.reduce((a, b) => a + Math.pow(b - trueVal, 2), 0) / arr.length;
        return { mean, bias, mse, std: Math.sqrt(mse - bias * bias) };
    };
    
    return {
        mom: {
            mu: calcBiasMSE(results.mom.muHat, mu),
            s: calcBiasMSE(results.mom.sHat, s),
            muHat: results.mom.muHat,
            sHat: results.mom.sHat
        },
        mle: {
            mu: calcBiasMSE(results.mle.muHat, mu),
            s: calcBiasMSE(results.mle.sHat, s),
            muHat: results.mle.muHat,
            sHat: results.mle.sHat,
            avgTime: results.mle.times.reduce((a, b) => a + b, 0) / nSims
        }
    };
}

// =====================================================
// GENERATION DE L'INTERFACE HTML
// =====================================================

function generateHTML() {
    return `
    <header>
        <h1>Labo Interactif - Distribution Logistique</h1>
        <p>Estimation, Tests et Visualisation</p>
    </header>
    
    <div class="main-container">
        <aside class="sidebar">
            <h2>Generateur de Donnees</h2>
            
            <div class="control-group">
                <label>mu (location)</label>
                <div class="control-row">
                    <input type="range" id="mu-slider" min="-20" max="20" step="0.1" value="${state.mu}">
                    <input type="number" id="mu-input" value="${state.mu}" step="0.1">
                </div>
            </div>
            
            <div class="control-group">
                <label>s (scale)</label>
                <div class="control-row">
                    <input type="range" id="s-slider" min="0.1" max="10" step="0.1" value="${state.s}">
                    <input type="number" id="s-input" value="${state.s}" step="0.1" min="0.1">
                </div>
            </div>
            
            <div class="control-group">
                <label>n (taille echantillon)</label>
                <div class="control-row">
                    <input type="range" id="n-slider" min="30" max="5000" step="10" value="${state.n}">
                    <input type="number" id="n-input" value="${state.n}" step="10" min="30">
                </div>
            </div>
            
            <div class="control-group">
                <label>Seed (reproductibilite)</label>
                <div class="control-row">
                    <input type="number" id="seed-input" value="${state.seed}" min="1" max="99999">
                </div>
            </div>
            
            <button class="btn" id="generate-btn">Generer les donnees</button>
            
            <div class="stats-box">
                <h3>Statistiques descriptives</h3>
                <div class="stats-grid" id="desc-stats">
                    <span>n:</span><strong>-</strong>
                    <span>Moyenne:</span><strong>-</strong>
                    <span>Variance:</span><strong>-</strong>
                    <span>Mediane:</span><strong>-</strong>
                </div>
                <div id="mini-hist" class="mini-hist"></div>
            </div>
            
            <div class="control-group" style="margin-top: 1rem;">
                <label>Importer CSV</label>
                <input type="file" id="csv-upload" accept=".csv" style="font-size: 0.8rem;">
            </div>
        </aside>
        
        <main class="content">
            <div class="tabs">
                <button class="tab active" data-tab="estimation">Estimation</button>
                <button class="tab" data-tab="visualisation">Visualisation</button>
                <button class="tab" data-tab="validation">Validation</button>
                <button class="tab" data-tab="montecarlo">Monte Carlo</button>
            </div>
            
            <!-- Onglet Estimation -->
            <div class="tab-content active" id="tab-estimation">
                <div class="cards-row">
                    <div class="card mom">
                        <h3>Methode des Moments (MoM)</h3>
                        <div class="estimate-row">
                            <span class="estimate-label">mu chapeau</span>
                            <span class="estimate-value" id="mom-mu">-</span>
                        </div>
                        <div class="estimate-row">
                            <span class="estimate-label">s chapeau</span>
                            <span class="estimate-value" id="mom-s">-</span>
                        </div>
                        <div class="formula">
                            mu = x-barre, s = sqrt(Var) * sqrt(3)/pi
                        </div>
                        <div class="estimate-row">
                            <span class="estimate-label">Temps</span>
                            <span class="estimate-value" id="mom-time">&lt;1ms</span>
                        </div>
                    </div>
                    
                    <div class="card mle">
                        <h3>Maximum de Vraisemblance (MLE)</h3>
                        <div class="estimate-row">
                            <span class="estimate-label">mu chapeau</span>
                            <span class="estimate-value" id="mle-mu">-</span>
                        </div>
                        <div class="estimate-row">
                            <span class="estimate-label">s chapeau</span>
                            <span class="estimate-value" id="mle-s">-</span>
                        </div>
                        <div class="estimate-row">
                            <span class="estimate-label">Log-vraisemblance</span>
                            <span class="estimate-value" id="mle-loglik">-</span>
                        </div>
                        <div class="estimate-row">
                            <span class="estimate-label">Iterations</span>
                            <span class="estimate-value" id="mle-iter">-</span>
                        </div>
                        <div class="estimate-row">
                            <span class="estimate-label">Convergence</span>
                            <span class="estimate-value" id="mle-conv">-</span>
                        </div>
                        <div class="estimate-row">
                            <span class="estimate-label">Temps</span>
                            <span class="estimate-value" id="mle-time">-</span>
                        </div>
                    </div>
                </div>
                
                <div class="checkbox-row">
                    <input type="checkbox" id="init-mom" checked>
                    <label for="init-mom">Initialiser MLE avec MoM</label>
                </div>
            </div>
            
            <!-- Onglet Visualisation -->
            <div class="tab-content" id="tab-visualisation">
                <div class="checkbox-row">
                    <input type="checkbox" id="show-theoretical" checked>
                    <label for="show-theoretical">PDF theorique (vrais parametres)</label>
                </div>
                <div class="checkbox-row">
                    <input type="checkbox" id="show-mom" checked>
                    <label for="show-mom">PDF estimee (MoM)</label>
                </div>
                <div class="checkbox-row">
                    <input type="checkbox" id="show-mle" checked>
                    <label for="show-mle">PDF estimee (MLE)</label>
                </div>
                <div id="main-plot" class="plot-container"></div>
            </div>
            
            <!-- Onglet Validation -->
            <div class="tab-content" id="tab-validation">
                <h3 style="margin-bottom: 1rem;">Information de Fisher</h3>
                <div class="info-grid">
                    <div class="info-box">
                        <h4>Var(mu chapeau)</h4>
                        <div class="value" id="fisher-var-mu">-</div>
                    </div>
                    <div class="info-box">
                        <h4>Var(s chapeau)</h4>
                        <div class="value" id="fisher-var-s">-</div>
                    </div>
                </div>
                
                <h3 style="margin: 1.5rem 0 1rem;">Tests de Wald</h3>
                <div class="control-group" style="margin-bottom: 1rem;">
                    <div class="control-row">
                        <label style="width: 80px;">H0: mu =</label>
                        <input type="number" id="test-mu" value="${state.muTest}" step="0.1">
                        <label style="width: 80px; margin-left: 1rem;">H0: s =</label>
                        <input type="number" id="test-s" value="${state.sTest}" step="0.1" min="0.1">
                        <button class="btn btn-small" id="run-tests" style="width: auto; margin-left: 1rem;">Executer les tests</button>
                    </div>
                </div>
                
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Hypothese</th>
                                <th>Estimateur</th>
                                <th>Erreur std</th>
                                <th>Z-score</th>
                                <th>p-value</th>
                                <th>Decision (alpha=0.05)</th>
                            </tr>
                        </thead>
                        <tbody id="wald-results">
                            <tr><td colspan="6" style="text-align: center; color: #999;">Generez des donnees puis executez les tests</td></tr>
                        </tbody>
                    </table>
                </div>
                
                <h3 style="margin: 1.5rem 0 1rem;">Intervalles de confiance (95%)</h3>
                <div class="info-grid" id="ci-results">
                    <div class="info-box">
                        <h4>IC pour mu</h4>
                        <div class="value" id="ci-mu">-</div>
                    </div>
                    <div class="info-box">
                        <h4>IC pour s</h4>
                        <div class="value" id="ci-s">-</div>
                    </div>
                </div>
            </div>
            
            <!-- Onglet Monte Carlo -->
            <div class="tab-content" id="tab-montecarlo">
                <div class="monte-carlo-controls">
                    <div class="control-group">
                        <label>Nombre de simulations</label>
                        <div class="control-row">
                            <input type="range" id="mc-sims-slider" min="50" max="1000" step="50" value="${state.mcSims}">
                            <input type="number" id="mc-sims-input" value="${state.mcSims}" min="50" max="1000">
                        </div>
                    </div>
                    <button class="btn btn-secondary" id="run-mc" style="width: auto;">Lancer les simulations</button>
                </div>
                
                <div class="progress-bar" id="mc-progress">
                    <div class="fill" id="mc-progress-fill"></div>
                </div>
                
                <div class="mc-results">
                    <div id="mc-plot-mu" class="mc-plot"></div>
                    <div id="mc-plot-s" class="mc-plot"></div>
                </div>
                
                <h3 style="margin: 1.5rem 0 1rem;">Comparaison MoM vs MLE</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Estimateur</th>
                                <th>Biais</th>
                                <th>MSE</th>
                                <th>Ecart-type</th>
                                <th>Temps moyen</th>
                            </tr>
                        </thead>
                        <tbody id="mc-results-table">
                            <tr><td colspan="5" style="text-align: center; color: #999;">Lancez les simulations pour voir les resultats</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    </div>
    
    <footer>
        <div class="share-url">
            <span>Partager:</span>
            <input type="text" id="share-url" readonly value="${window.location.href}">
            <button class="btn btn-small" id="copy-url">Copier</button>
        </div>
        <div>
            <button class="btn btn-small btn-secondary" id="export-png">Exporter PNG</button>
        </div>
    </footer>
    `;
}

// =====================================================
// MISE A JOUR DE L'INTERFACE
// =====================================================

function updateDescriptiveStats() {
    if (data.length === 0) return;
    
    const stats = computeStats(data);
    const statsHtml = `
        <span>n:</span><strong>${stats.n}</strong>
        <span>Moyenne:</span><strong>${stats.mean.toFixed(4)}</strong>
        <span>Variance:</span><strong>${stats.variance.toFixed(4)}</strong>
        <span>Mediane:</span><strong>${stats.median.toFixed(4)}</strong>
    `;
    document.getElementById('desc-stats').innerHTML = statsHtml;
    
    // Mini histogramme
    Plotly.newPlot('mini-hist', [{
        x: data,
        type: 'histogram',
        marker: { color: '#2980b9' },
        nbinsx: 20
    }], {
        margin: { l: 20, r: 10, t: 5, b: 20 },
        xaxis: { showticklabels: false },
        yaxis: { showticklabels: false },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent'
    }, { displayModeBar: false, responsive: true });
}

function updateEstimation() {
    if (data.length === 0) return;
    
    // MoM
    estimates.mom = estimateMoM(data);
    document.getElementById('mom-mu').textContent = estimates.mom.mu.toFixed(6);
    document.getElementById('mom-s').textContent = estimates.mom.s.toFixed(6);
    
    // MLE
    const initWithMoM = document.getElementById('init-mom').checked;
    estimates.mle = estimateMLE(data, initWithMoM);
    document.getElementById('mle-mu').textContent = estimates.mle.mu.toFixed(6);
    document.getElementById('mle-s').textContent = estimates.mle.s.toFixed(6);
    document.getElementById('mle-loglik').textContent = estimates.mle.logLik.toFixed(2);
    document.getElementById('mle-iter').textContent = estimates.mle.iterations;
    document.getElementById('mle-conv').textContent = estimates.mle.converged ? 'Oui' : 'Non';
    document.getElementById('mle-time').textContent = estimates.mle.time.toFixed(2) + ' ms';
}

function updateVisualization() {
    if (data.length === 0) return;
    
    const stats = computeStats(data);
    const xMin = stats.min - 0.1 * (stats.max - stats.min);
    const xMax = stats.max + 0.1 * (stats.max - stats.min);
    const xRange = [];
    for (let x = xMin; x <= xMax; x += (xMax - xMin) / 200) {
        xRange.push(x);
    }
    
    const traces = [];
    
    // Histogramme normalise
    traces.push({
        x: data,
        type: 'histogram',
        histnorm: 'probability density',
        name: 'Donnees',
        marker: { color: 'rgba(41, 128, 185, 0.5)' },
        nbinsx: Math.min(50, Math.ceil(Math.sqrt(data.length)))
    });
    
    // PDF theorique
    if (document.getElementById('show-theoretical').checked) {
        traces.push({
            x: xRange,
            y: xRange.map(x => logisticPDF(x, state.mu, state.s)),
            type: 'scatter',
            mode: 'lines',
            name: `Theorique (mu=${state.mu}, s=${state.s})`,
            line: { color: '#2c3e50', width: 2 }
        });
    }
    
    // PDF MoM
    if (document.getElementById('show-mom').checked && estimates.mom.mu !== undefined) {
        traces.push({
            x: xRange,
            y: xRange.map(x => logisticPDF(x, estimates.mom.mu, estimates.mom.s)),
            type: 'scatter',
            mode: 'lines',
            name: `MoM (mu=${estimates.mom.mu.toFixed(3)}, s=${estimates.mom.s.toFixed(3)})`,
            line: { color: '#27ae60', width: 2, dash: 'dash' }
        });
    }
    
    // PDF MLE
    if (document.getElementById('show-mle').checked && estimates.mle.mu !== undefined) {
        traces.push({
            x: xRange,
            y: xRange.map(x => logisticPDF(x, estimates.mle.mu, estimates.mle.s)),
            type: 'scatter',
            mode: 'lines',
            name: `MLE (mu=${estimates.mle.mu.toFixed(3)}, s=${estimates.mle.s.toFixed(3)})`,
            line: { color: '#e74c3c', width: 2, dash: 'dot' }
        });
    }
    
    Plotly.newPlot('main-plot', traces, {
        title: 'Histogramme et densites estimees',
        xaxis: { title: 'x' },
        yaxis: { title: 'Densite' },
        legend: { x: 0.02, y: 0.98 },
        margin: { l: 60, r: 30, t: 50, b: 50 }
    }, { responsive: true });
}

function updateValidation() {
    if (data.length === 0 || !estimates.mle.s) return;
    
    const n = data.length;
    const fisher = fisherInformation(n, estimates.mle.s);
    
    document.getElementById('fisher-var-mu').textContent = fisher.varMu.toFixed(6);
    document.getElementById('fisher-var-s').textContent = fisher.varS.toFixed(6);
    
    // Intervalles de confiance
    const ciMu = confidenceInterval(estimates.mle.mu, fisher.varMu);
    const ciS = confidenceInterval(estimates.mle.s, fisher.varS);
    
    document.getElementById('ci-mu').textContent = `[${ciMu.lower.toFixed(4)}, ${ciMu.upper.toFixed(4)}]`;
    document.getElementById('ci-s').textContent = `[${ciS.lower.toFixed(4)}, ${ciS.upper.toFixed(4)}]`;
}

function runWaldTests() {
    if (data.length === 0 || !estimates.mle.s) return;
    
    const n = data.length;
    const muTest = parseFloat(document.getElementById('test-mu').value);
    const sTest = parseFloat(document.getElementById('test-s').value);
    
    const fisher = fisherInformation(n, estimates.mle.s);
    
    const testMu = waldTest(estimates.mle.mu, muTest, fisher.varMu);
    const testS = waldTest(estimates.mle.s, sTest, fisher.varS);
    
    const resultsHtml = `
        <tr>
            <td>H0: mu = ${muTest}</td>
            <td>${testMu.estimate.toFixed(4)}</td>
            <td>${testMu.se.toFixed(4)}</td>
            <td>${testMu.z.toFixed(4)}</td>
            <td>${testMu.pValue.toFixed(4)}</td>
            <td class="${testMu.rejected ? 'status-rejected' : 'status-accepted'}">${testMu.decision}</td>
        </tr>
        <tr>
            <td>H0: s = ${sTest}</td>
            <td>${testS.estimate.toFixed(4)}</td>
            <td>${testS.se.toFixed(4)}</td>
            <td>${testS.z.toFixed(4)}</td>
            <td>${testS.pValue.toFixed(4)}</td>
            <td class="${testS.rejected ? 'status-rejected' : 'status-accepted'}">${testS.decision}</td>
        </tr>
    `;
    document.getElementById('wald-results').innerHTML = resultsHtml;
}

async function runMonteCarloUI() {
    const nSims = parseInt(document.getElementById('mc-sims-input').value);
    const progressBar = document.getElementById('mc-progress');
    const progressFill = document.getElementById('mc-progress-fill');
    
    progressBar.classList.add('active');
    document.getElementById('run-mc').disabled = true;
    document.getElementById('run-mc').textContent = 'En cours...';
    
    const results = await runMonteCarlo(nSims, state.mu, state.s, state.n, (pct) => {
        progressFill.style.width = pct + '%';
    });
    
    progressBar.classList.remove('active');
    document.getElementById('run-mc').disabled = false;
    document.getElementById('run-mc').textContent = 'Lancer les simulations';
    
    // Afficher les plots
    Plotly.newPlot('mc-plot-mu', [
        { x: results.mom.muHat, type: 'histogram', name: 'MoM', opacity: 0.7, marker: { color: '#27ae60' } },
        { x: results.mle.muHat, type: 'histogram', name: 'MLE', opacity: 0.7, marker: { color: '#e74c3c' } }
    ], {
        title: 'Distribution de mu chapeau',
        barmode: 'overlay',
        xaxis: { title: 'mu chapeau' },
        shapes: [{
            type: 'line',
            x0: state.mu, x1: state.mu,
            y0: 0, y1: 1,
            yref: 'paper',
            line: { color: '#2c3e50', width: 2, dash: 'dash' }
        }],
        margin: { l: 50, r: 20, t: 40, b: 40 }
    }, { responsive: true });
    
    Plotly.newPlot('mc-plot-s', [
        { x: results.mom.sHat, type: 'histogram', name: 'MoM', opacity: 0.7, marker: { color: '#27ae60' } },
        { x: results.mle.sHat, type: 'histogram', name: 'MLE', opacity: 0.7, marker: { color: '#e74c3c' } }
    ], {
        title: 'Distribution de s chapeau',
        barmode: 'overlay',
        xaxis: { title: 's chapeau' },
        shapes: [{
            type: 'line',
            x0: state.s, x1: state.s,
            y0: 0, y1: 1,
            yref: 'paper',
            line: { color: '#2c3e50', width: 2, dash: 'dash' }
        }],
        margin: { l: 50, r: 20, t: 40, b: 40 }
    }, { responsive: true });
    
    // Tableau des resultats
    const tableHtml = `
        <tr>
            <td>mu (MoM)</td>
            <td>${results.mom.mu.bias.toFixed(6)}</td>
            <td>${results.mom.mu.mse.toFixed(6)}</td>
            <td>${results.mom.mu.std.toFixed(6)}</td>
            <td>&lt;1ms</td>
        </tr>
        <tr>
            <td>mu (MLE)</td>
            <td>${results.mle.mu.bias.toFixed(6)}</td>
            <td>${results.mle.mu.mse.toFixed(6)}</td>
            <td>${results.mle.mu.std.toFixed(6)}</td>
            <td>${results.mle.avgTime.toFixed(2)}ms</td>
        </tr>
        <tr>
            <td>s (MoM)</td>
            <td>${results.mom.s.bias.toFixed(6)}</td>
            <td>${results.mom.s.mse.toFixed(6)}</td>
            <td>${results.mom.s.std.toFixed(6)}</td>
            <td>-</td>
        </tr>
        <tr>
            <td>s (MLE)</td>
            <td>${results.mle.s.bias.toFixed(6)}</td>
            <td>${results.mle.s.mse.toFixed(6)}</td>
            <td>${results.mle.s.std.toFixed(6)}</td>
            <td>-</td>
        </tr>
    `;
    document.getElementById('mc-results-table').innerHTML = tableHtml;
}

// =====================================================
// URL STATE MANAGEMENT
// =====================================================

function updateURL() {
    const params = new URLSearchParams();
    params.set('mu', state.mu);
    params.set('s', state.s);
    params.set('n', state.n);
    params.set('seed', state.seed);
    
    const newURL = window.location.pathname + '?' + params.toString();
    window.history.replaceState({}, '', newURL);
    document.getElementById('share-url').value = window.location.href;
}

function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('mu')) state.mu = parseFloat(params.get('mu'));
    if (params.has('s')) state.s = parseFloat(params.get('s'));
    if (params.has('n')) state.n = parseInt(params.get('n'));
    if (params.has('seed')) state.seed = parseInt(params.get('seed'));
}

// =====================================================
// EVENT HANDLERS
// =====================================================

function setupEventListeners() {
    // Sliders et inputs synchronises
    const syncInputs = [
        ['mu-slider', 'mu-input', 'mu'],
        ['s-slider', 's-input', 's'],
        ['n-slider', 'n-input', 'n']
    ];
    
    syncInputs.forEach(([sliderId, inputId, key]) => {
        const slider = document.getElementById(sliderId);
        const input = document.getElementById(inputId);
        
        slider.addEventListener('input', () => {
            input.value = slider.value;
            state[key] = parseFloat(slider.value);
        });
        
        input.addEventListener('change', () => {
            slider.value = input.value;
            state[key] = parseFloat(input.value);
        });
    });
    
    // Seed
    document.getElementById('seed-input').addEventListener('change', (e) => {
        state.seed = parseInt(e.target.value);
    });
    
    // Bouton generer
    document.getElementById('generate-btn').addEventListener('click', () => {
        data = simulateLogistic(state.n, state.mu, state.s, state.seed);
        updateDescriptiveStats();
        updateEstimation();
        updateVisualization();
        updateValidation();
        updateURL();
    });
    
    // Onglets
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
            
            // Redessiner les plots si necessaire
            if (tab.dataset.tab === 'visualisation') {
                updateVisualization();
            }
        });
    });
    
    // Checkboxes visualisation
    ['show-theoretical', 'show-mom', 'show-mle'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateVisualization);
    });
    
    // Init MoM checkbox
    document.getElementById('init-mom').addEventListener('change', () => {
        if (data.length > 0) updateEstimation();
    });
    
    // Tests de Wald
    document.getElementById('run-tests').addEventListener('click', runWaldTests);
    
    // Monte Carlo
    const mcSlider = document.getElementById('mc-sims-slider');
    const mcInput = document.getElementById('mc-sims-input');
    mcSlider.addEventListener('input', () => {
        mcInput.value = mcSlider.value;
        state.mcSims = parseInt(mcSlider.value);
    });
    mcInput.addEventListener('change', () => {
        mcSlider.value = mcInput.value;
        state.mcSims = parseInt(mcInput.value);
    });
    document.getElementById('run-mc').addEventListener('click', runMonteCarloUI);
    
    // Copier URL
    document.getElementById('copy-url').addEventListener('click', () => {
        const urlInput = document.getElementById('share-url');
        urlInput.select();
        document.execCommand('copy');
        document.getElementById('copy-url').textContent = 'Copie!';
        setTimeout(() => {
            document.getElementById('copy-url').textContent = 'Copier';
        }, 2000);
    });
    
    // Export PNG
    document.getElementById('export-png').addEventListener('click', () => {
        const plotDiv = document.getElementById('main-plot');
        if (plotDiv && plotDiv.data) {
            Plotly.downloadImage(plotDiv, {
                format: 'png',
                filename: 'logistic_distribution_plot',
                width: 1200,
                height: 600
            });
        }
    });
    
    // CSV Upload
    document.getElementById('csv-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const values = text.split(/[\n,;\s]+/)
                .map(v => parseFloat(v.trim()))
                .filter(v => !isNaN(v));
            
            if (values.length > 0) {
                data = values;
                state.n = values.length;
                document.getElementById('n-slider').value = state.n;
                document.getElementById('n-input').value = state.n;
                updateDescriptiveStats();
                updateEstimation();
                updateVisualization();
                updateValidation();
            }
        };
        reader.readAsText(file);
    });
}

// =====================================================
// INITIALISATION
// =====================================================

function init() {
    loadFromURL();
    document.getElementById('app').innerHTML = generateHTML();
    setupEventListeners();
    
    // Generer les donnees initiales
    data = simulateLogistic(state.n, state.mu, state.s, state.seed);
    updateDescriptiveStats();
    updateEstimation();
    updateVisualization();
    updateValidation();
    updateURL();
}

// Lancer l'application
document.addEventListener('DOMContentLoaded', init);
