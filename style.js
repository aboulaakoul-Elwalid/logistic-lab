// Inject CSS styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #f5f7fa;
    color: #333;
    min-height: 100vh;
}

#app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

header {
    background: linear-gradient(135deg, #1a5276 0%, #2980b9 100%);
    color: white;
    padding: 1rem 2rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

header h1 {
    font-size: 1.5rem;
    font-weight: 600;
}

header p {
    font-size: 0.9rem;
    opacity: 0.9;
}

.main-container {
    display: flex;
    flex: 1;
    gap: 1rem;
    padding: 1rem;
}

.sidebar {
    width: 280px;
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    height: fit-content;
}

.sidebar h2 {
    font-size: 1.1rem;
    color: #1a5276;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e8f4f8;
}

.control-group {
    margin-bottom: 1.2rem;
}

.control-group label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.4rem;
    color: #444;
    font-size: 0.9rem;
}

.control-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.control-row input[type="range"] {
    flex: 1;
    height: 6px;
    -webkit-appearance: none;
    background: #e0e0e0;
    border-radius: 3px;
    outline: none;
}

.control-row input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: #2980b9;
    border-radius: 50%;
    cursor: pointer;
}

.control-row input[type="number"] {
    width: 70px;
    padding: 0.4rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    text-align: center;
    font-size: 0.9rem;
}

.btn {
    display: inline-block;
    padding: 0.7rem 1.2rem;
    background: #2980b9;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.2s;
    width: 100%;
    margin-top: 0.5rem;
}

.btn:hover {
    background: #1a5276;
    transform: translateY(-1px);
}

.btn-secondary {
    background: #27ae60;
}

.btn-secondary:hover {
    background: #1e8449;
}

.stats-box {
    background: #f8fafc;
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1rem;
}

.stats-box h3 {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 0.5rem;
}

.stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    font-size: 0.85rem;
}

.stats-grid span {
    color: #555;
}

.stats-grid strong {
    color: #1a5276;
}

.content {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.tab {
    padding: 0.7rem 1.2rem;
    background: white;
    border: none;
    border-radius: 8px 8px 0 0;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    color: #666;
    transition: all 0.2s;
    border-bottom: 3px solid transparent;
}

.tab:hover {
    color: #2980b9;
}

.tab.active {
    color: #1a5276;
    border-bottom-color: #2980b9;
    background: white;
}

.tab-content {
    background: white;
    border-radius: 0 12px 12px 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    flex: 1;
    display: none;
}

.tab-content.active {
    display: block;
}

.cards-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
}

.card {
    background: #f8fafc;
    border-radius: 10px;
    padding: 1.5rem;
    border-left: 4px solid #2980b9;
}

.card.mom {
    border-left-color: #27ae60;
}

.card.mle {
    border-left-color: #e74c3c;
}

.card h3 {
    font-size: 1rem;
    color: #333;
    margin-bottom: 1rem;
}

.estimate-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #e8e8e8;
}

.estimate-row:last-child {
    border-bottom: none;
}

.estimate-label {
    color: #666;
}

.estimate-value {
    font-weight: 600;
    font-family: 'Courier New', monospace;
    color: #1a5276;
}

.plot-container {
    width: 100%;
    height: 450px;
    border-radius: 8px;
    overflow: hidden;
}

.table-container {
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
}

th, td {
    padding: 0.8rem 1rem;
    text-align: left;
    border-bottom: 1px solid #e8e8e8;
}

th {
    background: #f8fafc;
    font-weight: 600;
    color: #444;
}

tr:hover {
    background: #fafbfc;
}

.status-accepted {
    color: #27ae60;
    font-weight: 600;
}

.status-rejected {
    color: #e74c3c;
    font-weight: 600;
}

.info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
}

.info-box {
    background: #f8fafc;
    padding: 1.2rem;
    border-radius: 8px;
}

.info-box h4 {
    font-size: 0.85rem;
    color: #666;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
}

.info-box .value {
    font-size: 1.3rem;
    font-weight: 600;
    color: #1a5276;
    font-family: 'Courier New', monospace;
}

.monte-carlo-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
}

.monte-carlo-controls .control-group {
    margin-bottom: 0;
}

.progress-bar {
    width: 100%;
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
    margin: 1rem 0;
    display: none;
}

.progress-bar.active {
    display: block;
}

.progress-bar .fill {
    height: 100%;
    background: linear-gradient(90deg, #27ae60, #2ecc71);
    width: 0%;
    transition: width 0.1s;
}

.mc-results {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.mc-plot {
    height: 250px;
}

footer {
    background: #f8fafc;
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #e8e8e8;
}

.share-url {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.share-url input {
    width: 400px;
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.85rem;
    color: #666;
}

.btn-small {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
}

.formula {
    background: #f0f4f8;
    padding: 0.8rem;
    border-radius: 6px;
    margin: 0.5rem 0;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    overflow-x: auto;
}

.checkbox-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.5rem 0;
}

.checkbox-row input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.mini-hist {
    height: 60px;
    margin-top: 0.5rem;
}

@media (max-width: 900px) {
    .main-container {
        flex-direction: column;
    }
    
    .sidebar {
        width: 100%;
    }
    
    .cards-row, .info-grid, .mc-results {
        grid-template-columns: 1fr;
    }
    
    .share-url input {
        width: 200px;
    }
}
`;
document.head.appendChild(styleSheet);
