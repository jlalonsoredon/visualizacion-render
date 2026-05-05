"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import Image from "next/image";
import tpsImage from "./tps.png";

export default function MLVisualizer() {
  const [algorithm, setAlgorithm] = useState("KNN");
  const [dataset, setDataset] = useState("moons");
  const [noise, setNoise] = useState(0.2);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  console.log("API_URL:", API_URL);

  // Valores por defecto recomendados (mejores prácticas)
  const DEFAULTS = {
    KNN: { n_neighbors: 5 },
    'Logistic Regression': { C: 1.0, max_iter: 200 },
    'Decision Tree': { max_depth: 6, min_samples_split: 4 },
    'Random Forest': { n_estimators: 100, max_depth: 8, min_samples_split: 4 },
    'Neural Network': { hidden_layer_sizes: 32, n_hidden_layers: 2, max_iter: 300, alpha: 0.001, learning_rate_init: 0.01 },
    XGBoost: { n_estimators: 100, max_depth: 6, learning_rate: 0.1, subsample: 0.8 },
  };
  const [knnNeighbors, setKnnNeighbors] = useState(DEFAULTS.KNN.n_neighbors);
  const [logregC, setLogregC] = useState(DEFAULTS['Logistic Regression'].C);
  const [logregMaxIter, setLogregMaxIter] = useState(DEFAULTS['Logistic Regression'].max_iter);
  const [treeMaxDepth, setTreeMaxDepth] = useState(DEFAULTS['Decision Tree'].max_depth);
  const [treeMinSamples, setTreeMinSamples] = useState(DEFAULTS['Decision Tree'].min_samples_split);
  const [rfEstimators, setRfEstimators] = useState(DEFAULTS['Random Forest'].n_estimators);
  const [rfMaxDepth, setRfMaxDepth] = useState(DEFAULTS['Random Forest'].max_depth);
  const [rfMinSamples, setRfMinSamples] = useState(DEFAULTS['Random Forest'].min_samples_split);
  const [mlpHiddenSize, setMlpHiddenSize] = useState(DEFAULTS['Neural Network'].hidden_layer_sizes);
  const [mlpNLayers, setMlpNLayers] = useState(DEFAULTS['Neural Network'].n_hidden_layers);
  const [mlpMaxIter, setMlpMaxIter] = useState(DEFAULTS['Neural Network'].max_iter);
  const [mlpAlpha, setMlpAlpha] = useState(DEFAULTS['Neural Network'].alpha);
  const [mlpLearningRate, setMlpLearningRate] = useState(DEFAULTS['Neural Network'].learning_rate_init);
  const [xgbEstimators, setXgbEstimators] = useState(DEFAULTS.XGBoost.n_estimators);
  const [xgbMaxDepth, setXgbMaxDepth] = useState(DEFAULTS.XGBoost.max_depth);
  const [xgbLearningRate, setXgbLearningRate] = useState(DEFAULTS.XGBoost.learning_rate);
  const [xgbSubsample, setXgbSubsample] = useState(DEFAULTS.XGBoost.subsample);

  // Función para resetear parámetros
  const resetParams = () => {
    if (algorithm === "KNN") setKnnNeighbors(DEFAULTS.KNN.n_neighbors);
    else if (algorithm === "Logistic Regression") {
      setLogregC(DEFAULTS['Logistic Regression'].C);
      setLogregMaxIter(DEFAULTS['Logistic Regression'].max_iter);
    } else if (algorithm === "Decision Tree") {
      setTreeMaxDepth(DEFAULTS['Decision Tree'].max_depth);
      setTreeMinSamples(DEFAULTS['Decision Tree'].min_samples_split);
    } else if (algorithm === "Random Forest") {
      setRfEstimators(DEFAULTS['Random Forest'].n_estimators);
      setRfMaxDepth(DEFAULTS['Random Forest'].max_depth);
      setRfMinSamples(DEFAULTS['Random Forest'].min_samples_split);
    } else if (algorithm === "Neural Network") {
      setMlpHiddenSize(DEFAULTS['Neural Network'].hidden_layer_sizes);
      setMlpNLayers(DEFAULTS['Neural Network'].n_hidden_layers);
      setMlpMaxIter(DEFAULTS['Neural Network'].max_iter);
      setMlpAlpha(DEFAULTS['Neural Network'].alpha);
      setMlpLearningRate(DEFAULTS['Neural Network'].learning_rate_init);
    } else if (algorithm === "XGBoost") {
      setXgbEstimators(DEFAULTS.XGBoost.n_estimators);
      setXgbMaxDepth(DEFAULTS.XGBoost.max_depth);
      setXgbLearningRate(DEFAULTS.XGBoost.learning_rate);
      setXgbSubsample(DEFAULTS.XGBoost.subsample);
    }
  };

  // Paleta de colores ciberpunk
  const COLORS = {
    class0: "#2563eb", // Azul (Tailwind blue-600)
    class1: "#ef4444", // Rojo (Tailwind red-500)
    boundary0: "rgba(37, 99, 235, 0.13)", // Azul translúcido
    boundary1: "rgba(239, 68, 68, 0.13)", // Rojo translúcido
  };

  const fetchData = async () => {
    // Cancelar petición anterior si existe
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      let params: any = { algorithm, dataset, noise };
      
      // Añadir parámetros específicos según el algoritmo
      if (algorithm === "KNN") {
        params.n_neighbors = knnNeighbors;
      } else if (algorithm === "Logistic Regression") {
        params.C = logregC;
        params.max_iter = logregMaxIter;
      } else if (algorithm === "Decision Tree") {
        params.max_depth = treeMaxDepth;
        params.min_samples_split = treeMinSamples;
      } else if (algorithm === "Random Forest") {
        params.n_estimators = rfEstimators;
        params.max_depth = rfMaxDepth;
        params.min_samples_split = rfMinSamples;
      } else if (algorithm === "Neural Network") {
        params.hidden_layer_sizes = mlpHiddenSize;
        params.n_hidden_layers = mlpNLayers;
        params.max_iter = mlpMaxIter;
        params.alpha = mlpAlpha;
        params.learning_rate_init = mlpLearningRate;
      } else if (algorithm === "XGBoost") {
        params.n_estimators = xgbEstimators;
        params.max_depth = xgbMaxDepth;
        params.learning_rate = xgbLearningRate;
        params.subsample = xgbSubsample;
      }
      
      const res = await axios.post(`${API_URL}/predict`, params, { signal: controller.signal });
      setData(res.data);
    } catch (error: any) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
      setError(error.message || "Error de conexión");
      console.error("Error conectando al backend:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 500);
    return () => clearTimeout(timer);
  }, [algorithm, dataset, noise, knnNeighbors, logregC, logregMaxIter, treeMaxDepth, treeMinSamples, rfEstimators, rfMaxDepth, rfMinSamples, mlpHiddenSize, mlpNLayers, mlpMaxIter, mlpAlpha, mlpLearningRate, xgbEstimators, xgbMaxDepth, xgbLearningRate, xgbSubsample]);

  useEffect(() => {
    if (!data || !canvasRef.current || !containerRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const { boundary, grid_dims } = data;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    canvasRef.current.width = width;
    canvasRef.current.height = height;

    ctx.clearRect(0, 0, width, height);

    const cellW = width / grid_dims.width;
    const cellH = height / grid_dims.height;

    boundary.forEach((row: number[], i: number) => {
      row.forEach((val: number, j: number) => {
        const y = height - (i * cellH); 
        const x = j * cellW;
        ctx.fillStyle = val === 0 ? COLORS.boundary0 : COLORS.boundary1;
        ctx.fillRect(x, y - cellH, cellW + 1, cellH + 1); 
      });
    });
  }, [data]);

  const mapX = (x: number) => {
    if (!data || !containerRef.current) return 0;
    const { x_min, x_max } = data.grid_dims;
    const width = containerRef.current.clientWidth;
    return ((x - x_min) / (x_max - x_min)) * width;
  };
  const mapY = (y: number) => {
    if (!data || !containerRef.current) return 0;
    const { y_min, y_max } = data.grid_dims;
    const height = containerRef.current.clientHeight;
    return height - ((y - y_min) / (y_max - y_min)) * height;
  };

  return (
    <div className="min-h-screen bg-[#10131a] text-gray-200 flex font-mono selection:bg-blue-900">
      
      {/* SIDEBAR DE CONTROL */}
      <div className="w-96 p-8 border-r border-blue-700 flex flex-col gap-8 bg-[#181c24] z-20 shadow-2xl shadow-blue-700/20">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-600 to-red-500">
            ML<span className="text-blue-400">.viz</span>
          </h1>
          <p className="text-xs text-blue-300 mt-2">Visualizador Geométrico de Algoritmos</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Algoritmo</label>
            <select 
              value={algorithm} 
              onChange={(e) => setAlgorithm(e.target.value)}
              className="w-full bg-[#181c24] border border-blue-700/50 rounded p-3 text-sm focus:border-blue-400 focus:outline-none transition-colors focus:shadow-lg focus:shadow-blue-700/40"
            >
              <option value="KNN">K-Nearest Neighbors</option>
              <option value="Logistic Regression">Regresión Logística</option>
              <option value="Neural Network">Red Neuronal (MLP)</option>
              <option value="Decision Tree">Árbol de Decisión</option>
              <option value="Random Forest">Random Forest</option>
              <option value="XGBoost">XGBoost</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-red-400 uppercase tracking-widest">Dataset</label>
            <select 
              value={dataset} 
              onChange={(e) => setDataset(e.target.value)}
              className="w-full bg-[#181c24] border border-red-500/50 rounded p-3 text-sm focus:border-red-400 focus:outline-none transition-colors focus:shadow-lg focus:shadow-red-500/40"
            >
              <option value="moons">🌙 Moons (No Lineal)</option>
              <option value="linear">📏 Lineal Separable</option>
              <option value="circles">⭕ Círculos (XOR)</option>
              <option value="spirals">🌀 Espirales Complejas</option>
            </select>
            <div className="text-[10px] text-blue-200 leading-relaxed mt-2 p-2 bg-[#151922] rounded border border-blue-700/20">
              {dataset === "linear" && "✓ Ideal para modelos lineales (Regresión Logística)"}
              {dataset === "moons" && "✓ Retos no lineales suaves (KNN, Neural Network)"}
              {dataset === "circles" && "✓ Fronteras geométricas (Árboles, Random Forest)"}
              {dataset === "spirals" && "✓ Patrones complejos (Redes Neuronales, XGBoost)"}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-blue-700/20">
            {/* Parámetros específicos por algoritmo */}
            {algorithm === "KNN" && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>K Vecinos</span>
                    <span className="text-cyan-300 font-bold">{knnNeighbors}</span>
                  </div>
                  <input 
                    type="range" min="1" max="30" step="1" 
                    value={knnNeighbors} 
                    onChange={(e) => setKnnNeighbors(parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
                <button onClick={resetParams} className="mt-2 w-full bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-2 px-4 rounded transition">Resetear parámetros</button>
              </>
            )}
            
            {algorithm === "Logistic Regression" && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>C (Regularización)</span>
                    <span className="text-cyan-300 font-bold">{logregC.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" min="0.01" max="10" step="0.1" 
                    value={logregC} 
                    onChange={(e) => setLogregC(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>Max Iteraciones</span>
                    <span className="text-cyan-300 font-bold">{logregMaxIter}</span>
                  </div>
                  <input 
                    type="range" min="50" max="500" step="50" 
                    value={logregMaxIter} 
                    onChange={(e) => setLogregMaxIter(parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
                <button onClick={resetParams} className="mt-2 w-full bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-2 px-4 rounded transition">Resetear parámetros</button>
              </>
            )}
            
            {algorithm === "Decision Tree" && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>Max Profundidad</span>
                    <span className="text-cyan-300 font-bold">{treeMaxDepth}</span>
                  </div>
                  <input 
                    type="range" min="1" max="20" step="1" 
                    value={treeMaxDepth} 
                    onChange={(e) => setTreeMaxDepth(parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>Min Muestras Split</span>
                    <span className="text-cyan-300 font-bold">{treeMinSamples}</span>
                  </div>
                  <input 
                    type="range" min="2" max="20" step="1" 
                    value={treeMinSamples} 
                    onChange={(e) => setTreeMinSamples(parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
                <button onClick={resetParams} className="mt-2 w-full bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-2 px-4 rounded transition">Resetear parámetros</button>
              </>
            )}
            
            {algorithm === "Random Forest" && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>N° Árboles</span>
                    <span className="text-cyan-300 font-bold">{rfEstimators}</span>
                  </div>
                  <input 
                    type="range" min="5" max="100" step="5" 
                    value={rfEstimators} 
                    onChange={(e) => setRfEstimators(parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>Max Profundidad</span>
                    <span className="text-cyan-300 font-bold">{rfMaxDepth}</span>
                  </div>
                  <input 
                    type="range" min="1" max="20" step="1" 
                    value={rfMaxDepth} 
                    onChange={(e) => setRfMaxDepth(parseInt(e.target.value))}
                    className="w-full h-1 bg-purple-900/50 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>Min Muestras Split</span>
                    <span className="text-cyan-300 font-bold">{rfMinSamples}</span>
                  </div>
                  <input 
                    type="range" min="2" max="20" step="1" 
                    value={rfMinSamples} 
                    onChange={(e) => setRfMinSamples(parseInt(e.target.value))}
                    className="w-full h-1 bg-purple-900/50 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
                <button onClick={resetParams} className="mt-2 w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-2 px-4 rounded transition shadow-lg shadow-cyan-500/30">Resetear parámetros</button>
              </>
            )}
            
            {algorithm === "Neural Network" && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>Neuronas (por Capa)</span>
                    <span className="text-cyan-300 font-bold">{mlpHiddenSize}</span>
                  </div>
                  <input 
                    type="range" min="5" max="64" step="5" 
                    value={mlpHiddenSize} 
                    onChange={(e) => setMlpHiddenSize(parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>Nº Capas Ocultas</span>
                    <span className="text-cyan-300 font-bold">{mlpNLayers}</span>
                  </div>
                  <input 
                    type="range" min="1" max="5" step="1" 
                    value={mlpNLayers} 
                    onChange={(e) => setMlpNLayers(parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>Max Iteraciones</span>
                    <span className="text-cyan-300 font-bold">{mlpMaxIter}</span>
                  </div>
                  <input 
                    type="range" min="100" max="500" step="50" 
                    value={mlpMaxIter} 
                    onChange={(e) => setMlpMaxIter(parseInt(e.target.value))}
                    className="w-full h-1 bg-purple-900/50 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>Alpha (L2)</span>
                    <span className="text-cyan-300 font-bold">{mlpAlpha.toFixed(4)}</span>
                  </div>
                  <input 
                    type="range" min="0.0001" max="0.01" step="0.0001" 
                    value={mlpAlpha} 
                    onChange={(e) => setMlpAlpha(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>Learning Rate</span>
                    <span className="text-cyan-300 font-bold">{mlpLearningRate.toFixed(4)}</span>
                  </div>
                  <input 
                    type="range" min="0.0001" max="0.01" step="0.0001" 
                    value={mlpLearningRate} 
                    onChange={(e) => setMlpLearningRate(parseFloat(e.target.value))}
                    className="w-full h-1 bg-purple-900/50 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
                <button onClick={resetParams} className="mt-2 w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-2 px-4 rounded transition shadow-lg shadow-cyan-500/30">Resetear parámetros</button>
              </>
            )}
            
            {algorithm === "XGBoost" && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>Nº Estimadores</span>
                    <span className="text-cyan-300 font-bold">{xgbEstimators}</span>
                  </div>
                  <input 
                    type="range" min="10" max="300" step="10" 
                    value={xgbEstimators} 
                    onChange={(e) => setXgbEstimators(parseInt(e.target.value))}
                    className="w-full h-1 bg-purple-900/50 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>Max Profundidad</span>
                    <span className="text-cyan-300 font-bold">{xgbMaxDepth}</span>
                  </div>
                  <input 
                    type="range" min="1" max="10" step="1" 
                    value={xgbMaxDepth} 
                    onChange={(e) => setXgbMaxDepth(parseInt(e.target.value))}
                    className="w-full h-1 bg-purple-900/50 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>Learning Rate</span>
                    <span className="text-cyan-300 font-bold">{xgbLearningRate.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" min="0.01" max="0.5" step="0.01" 
                    value={xgbLearningRate} 
                    onChange={(e) => setXgbLearningRate(parseFloat(e.target.value))}
                    className="w-full h-1 bg-purple-900/50 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-purple-300 uppercase">
                    <span>Subsample</span>
                    <span className="text-cyan-300 font-bold">{xgbSubsample.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="1.0" step="0.05" 
                    value={xgbSubsample} 
                    onChange={(e) => setXgbSubsample(parseFloat(e.target.value))}
                    className="w-full h-1 bg-purple-900/50 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
                <button onClick={resetParams} className="mt-2 w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-2 px-4 rounded transition shadow-lg shadow-cyan-500/30">Resetear parámetros</button>
              </>
            )}

            <div className="space-y-2 pt-2 border-t border-red-500/20">
               <div className="flex justify-between text-xs text-blue-300 uppercase">
                <span>Ruido en Datos</span>
                <span className="text-red-400 font-bold">{noise.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0" max="0.5" step="0.05" 
                value={noise} 
                onChange={(e) => setNoise(parseFloat(e.target.value))}
                className="w-full h-1 bg-blue-900/50 rounded-lg appearance-none cursor-pointer accent-red-400"
              />
            </div>
          </div>
        </div>

        <div className="mt-auto p-5 flex flex-col items-center gap-3">
          <p className="text-sm font-bold text-center text-white">Curso gratuito de 6h de introducción a Data Science</p>
          <Image src={tpsImage} alt="Curso Data Science" className="w-full rounded-lg" />
          <span className="w-full text-center text-cyan-300 font-mono text-base whitespace-nowrap overflow-hidden text-ellipsis" style={{letterSpacing: '0.04em'}}>
            www.tuprimerasemana.com
          </span>
          <a
            href="https://datascience4business.com/pdsm2-tps2-01-optin/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-extrabold py-3 px-4 rounded-lg transition shadow-lg shadow-cyan-500/40 tracking-widest text-base"
          >
            APUNTARME
          </a>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-[#0a0d14] relative overflow-hidden p-8">
           <div className="absolute inset-0 opacity-10" 
             style={{backgroundImage: 'radial-gradient(#2563eb 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
           </div>

        {/* Matriz de confusión y métricas */}
        {data && data.confusion_matrix && data.metrics && (
          <div className="absolute left-8 top-8 bg-[#181c24] border-2 border-blue-700 rounded-lg p-6 shadow-2xl shadow-blue-700/40 z-30 min-w-[320px]">
            <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-red-400 mb-2">Matriz de Confusión</h3>
            <table className="w-full text-center text-sm mb-4">
              <thead>
                <tr>
                  <th></th>
                  <th className="text-blue-400 font-bold">Predicho 0</th>
                  <th className="text-red-400 font-bold">Predicho 1</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-blue-400 font-bold">Real 0</td>
                  <td>{data.confusion_matrix[0][0]}</td>
                  <td>{data.confusion_matrix[0][1]}</td>
                </tr>
                <tr>
                  <td className="text-red-400 font-bold">Real 1</td>
                  <td>{data.confusion_matrix[1][0]}</td>
                  <td>{data.confusion_matrix[1][1]}</td>
                </tr>
              </tbody>
            </table>
            <div className="space-y-1">
              <div>Precisión: <span className="text-blue-400">{(data.metrics.precision * 100).toFixed(1)}%</span></div>
              <div>Recall: <span className="text-blue-400">{(data.metrics.recall * 100).toFixed(1)}%</span></div>
              <div>AUC: <span className="text-blue-400">{(data.metrics.auc * 100).toFixed(1)}%</span></div>
            </div>
          </div>
        )}
        <div ref={containerRef} className="relative w-full h-full border-2 border-blue-700/30 bg-[#10131a] shadow-2xl shadow-blue-700/20 rounded-lg">
          {!data && !loading && (
            <div className="absolute inset-0 flex items-center justify-center text-center p-8">
              {error ? (
                <div className="text-red-400">
                  <p className="font-bold mb-2">Error de conexión</p>
                  <p className="text-sm text-red-300">{error}</p>
                  <p className="text-xs text-red-500 mt-2">API_URL: {API_URL}</p>
                </div>
              ) : (
                <div className="text-blue-400">
                  <p className="text-lg">Cargando datos...</p>
                  <p className="text-sm text-blue-300 mt-2">API: {API_URL}</p>
                </div>
              )}
            </div>
          )}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60 blur-[2px]"/>
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {/* Líneas de separación verticales */}
            {Array.from({length: data?.grid_dims?.width || 0}).map((_, j) => (
              <line
                key={"vsep-"+j}
                x1={(j/(data.grid_dims.width-1))*100+"%"}
                y1="0%"
                x2={(j/(data.grid_dims.width-1))*100+"%"}
                y2="100%"
                stroke="#2563eb"
                strokeWidth="0.5"
                opacity="0.10"
              />
            ))}
            {/* Líneas de separación horizontales */}
            {Array.from({length: data?.grid_dims?.height || 0}).map((_, i) => (
              <line
                key={"hsep-"+i}
                x1="0%"
                y1={(i/(data.grid_dims.height-1))*100+"%"}
                x2="100%"
                y2={(i/(data.grid_dims.height-1))*100+"%"}
                stroke="#ef4444"
                strokeWidth="0.5"
                opacity="0.10"
              />
            ))}
            {data && data.points.map((p: any, i: number) => (
              <motion.circle
                key={i}
                initial={false}
                animate={{ cx: mapX(p.x), cy: mapY(p.y) }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                r="5"
                fill={p.label === 0 ? COLORS.class0 : COLORS.class1}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
