import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Copy, 
  Trash2, 
  RefreshCcw, 
  CheckCircle2, 
  Zap, 
  History, 
  LayoutTemplate,
  FileText,
  Type,
  Settings,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";

export default function App() {
  const [formData, setFormData] = React.useState({ details: '' });
  const [result, setResult] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [credits, setCredits] = React.useState(999);
  const [history, setHistory] = React.useState<string[]>([]);
  const [feedback, setFeedback] = React.useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [enabledSections, setEnabledSections] = React.useState({ gancho: true, solucion: true, oferta: true, cta: true });
  
  // Settings
  const [showSettings, setShowSettings] = React.useState(false);
  const [showPrivacy, setShowPrivacy] = React.useState(false);
  const [model, setModel] = React.useState(localStorage.getItem('copyflow_model') || 'gemini-2.0-flash');
  const [systemInstructions, setSystemInstructions] = React.useState(localStorage.getItem('copyflow_instructions') || `# ROLE
Actúa como un Consultor de Marketing de Élite, experto en Psicología del Consumidor, Copywriting de Respuesta Directa y Estrategia de Posicionamiento de Mercado. Tu especialidad es transformar productos o servicios en soluciones irresistibles mediante el uso de ángulos estratégicos avanzados.

# CONTEXTO Y ANÁLISIS PREVIO (Chain of Thought)
Antes de redactar, realiza un análisis interno (silencioso pero aplicado) sobre:
1. Intención de Búsqueda (Search Intent): Identifica si el usuario está en una fase de concienciación del problema, comparación de soluciones o decisión de compra.
2. Relevancia de Palabras Clave: Identifica los términos semánticos y conceptos clave que resuenan con la audiencia para maximizar la relevancia y el SEO psicológico.

# TAREA
Genera 4 versiones de textos publicitarios, cada una estructurada en torno a un ángulo estratégico único. No te limites a cambiar titulares; cada versión debe representar una Hipótesis de Posicionamiento diferente.

# LOS 4 ÁNGULOS ESTRATÉGICOS A DESPLEGAR

## 1. Variantes del Problema que Resuelves
- Objetivo: Atacar el problema desde una perspectiva que el usuario no había considerado o profundizar en un síntoma específico.
- Lógica: No hables de la solución general, habla del dolor específico y agudo que tu producto elimina.

## 2. Aprovechar Vacíos de la Competencia
- Objetivo: Posicionarte donde los competidores fallan o son genéricos.
- Lógica: Identifica la frustración común con las soluciones actuales del mercado y presenta tu propuesta como la evolución lógica y necesaria.

## 3. Enfoques Basados en Pruebas Sociales (Social Proof)
- Objetivo: Utilizar el sesgo de aprobación social para eliminar el riesgo percibido.
- Lógica: No uses solo testimonios genéricos; construye una narrativa donde el éxito de otros valide la eficiencia de tu hipótesis de posicionamiento.

## 4. Ganchos que Responden Objeciones (Objection Handling)
- Objetivo: Desarmar las barreras mentales del cliente antes de que las verbalice.
- Lógica: Identifica la objeción más fuerte (precio, tiempo, escepticismo) y conviértela en el gancho principal de la comunicación.

# REQUERIMIENTOS DE SALIDA PARA CADA VERSIÓN
Para cada uno de los 4 ángulos, debes entregar:

1. Hipótesis de Posicionamiento: Una explicación estratégica de por qué este enfoque convencerá a la audiencia, qué palanca psicológica está activando y cómo se alinea con la intención de búsqueda.
2. Propuesta SEO: Lista de palabras clave y conceptos de intención que se han priorizado en esta versión.
3. Cuerpo del Texto Publicitario: Un texto versátil, creativo y de alto impacto que pueda adaptarse a cualquier plataforma (Ads, Email, Landing Page). Tienes libertad total para estructurar el formato de salida del texto (listas, storytelling, diálogo, etc.) siempre que busque la máxima conversión.

# REGLAS DE ORO
- Mantén un tono profesional, persuasivo y sofisticado.
- Evita clichés de marketing genéricos.
- Asegura que el contenido sea 100% accionable y orientado a resultados.
- Idioma de respuesta: Español.
- Entrega el resultado en formato Markdown claro.`);
  const [appVersion, setAppVersion] = React.useState(localStorage.getItem('copyflow_version') || 'v3.0-adgen');
  const [customApiKey, setCustomApiKey] = React.useState(localStorage.getItem('copyflow_apikey') || '');
  const [useMock, setUseMock] = React.useState(localStorage.getItem('copyflow_mock') === 'true');

  React.useEffect(() => {
    localStorage.setItem('copyflow_model', model);
    localStorage.setItem('copyflow_instructions', systemInstructions);
    localStorage.setItem('copyflow_version', appVersion);
    localStorage.setItem('copyflow_apikey', customApiKey);
    localStorage.setItem('copyflow_mock', String(useMock));
  }, [model, systemInstructions, appVersion, customApiKey, useMock]);
  const [showCopyMenu, setShowCopyMenu] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editableResult, setEditableResult] = React.useState('');

  const isConfigured = !!(customApiKey.trim() || (process as any).env.GEMINI_API_KEY);

  // Persistence and Daily Reset
  React.useEffect(() => {
    const saved = localStorage.getItem('copyflow_state');
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (saved) {
      const { credits: savedCredits, lastDate, history: savedHistory } = JSON.parse(saved);
      if (lastDate !== today) {
        setCredits(999);
        setHistory(savedHistory || []);
        localStorage.setItem('copyflow_state', JSON.stringify({ credits: 999, lastDate: today, history: savedHistory || [] }));
      } else {
        setCredits(savedCredits);
        setHistory(savedHistory || []);
      }
    } else {
      localStorage.setItem('copyflow_state', JSON.stringify({ credits: 999, lastDate: today, history: [] }));
    }
  }, []);

  React.useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('copyflow_state', JSON.stringify({ credits, lastDate: today, history }));
  }, [credits, history]);

  const handleGenerate = async () => {
    if (!formData.details || loading || credits <= 0) return;
    
    setLoading(true);
    try {
      if (useMock) {
        const mockMarkdown = `# 🎯 Ángulo 1: Problema (RUM)
## Versión A (Resultado+Rapidez)
¿Cansado de esperar? Transforma tu día en minutos con nuestra solución profesional.
## Versión B (Escasez)
Solo quedan pocas unidades disponibles. No dejes pasar esta oportunidad única.
## Versión C (Contraste)
Otros cobran el doble por la mitad de la calidad. Esta es la elección inteligente.

# 🚀 Ángulo 2: Competencia (Contracorriente)
## Versión A
Mientras otros fallan, nosotros cumplimos lo que prometemos.
## Versión B
La competencia no quiere que sepas esto.
## Versión C
Diseñado para quienes buscan excelencia, no promesas vacías.`;

        setResult(mockMarkdown);
        setEditableResult(mockMarkdown);
        setCredits(prev => Math.max(0, prev - 1));
        setHistory(prev => ['Generación Reciente', ...prev].slice(0, 5));
        return;
      }

      const apiKey = customApiKey.trim() || (process as any).env.GEMINI_API_KEY;
      if (!apiKey) {
        setFeedback({ text: 'Configura tu API Key en Ajustes', type: 'error' });
        setTimeout(() => setFeedback(null), 5000);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
Detalles del Producto/Servicio Proporcionados:
${formData.details}

Basado en estos detalles, identifica el producto, su valor, precio y beneficios. Luego genera un anuncio publicitario estratégico.
Genera en Markdown estas 4 secciones con 3 subsecciones cada una (A,B,C):

🎯 Ángulo 1: Problema (RUM)
Versión A (Resultado+Rapidez)
Versión B (Escasez)
Versión C (Contraste)

🚀 Ángulo 2: Competencia (Contracorriente)
Versión A
Versión B
Versión C

📢 Ángulo 3: Prueba Social
Versión A
Versión B
Versión C

🔒 Ángulo 4: Objeciones (Escalera del Sí)
Versión A (Precio)
Versión B (Confianza)
Versión C (Compromiso)

No añadas texto fuera de la estructura. Emojis moderados.`;

      const response = await ai.models.generateContent({
        model: model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: systemInstructions
        }
      });
      
      const responseText = response.text;
      
      if (responseText) {
        setResult(responseText);
        setEditableResult(responseText);
        setCredits(prev => Math.max(0, prev - 1));
        setHistory(prev => ['Generación Reciente', ...prev].slice(0, 5));
      }
    } catch (err: any) {
      console.error('Error generating:', err);
      if (err?.message?.includes('429')) {
        setFeedback({ text: 'Cuota Gemini excedida', type: 'error' });
      } else if (err?.message?.includes('API key not valid')) {
        setFeedback({ text: 'API Key inválida', type: 'error' });
      } else {
        setFeedback({ text: 'Error al generar', type: 'error' });
      }
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (type: 'md' | 'plain') => {
    let text = result;
    if (type === 'plain') {
      text = result
        .replace(/[#*`>\-]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
    }
    
    await navigator.clipboard.writeText(text);
    setFeedback({ 
      text: type === 'md' ? 'Markdown copiado!' : 'Texto plano copiado!', 
      type: 'success' 
    });
    setTimeout(() => setFeedback(null), 5000);
  };

  const resetForm = () => {
    setFormData({ details: '' });
    setResult('');
  };

  if (!isConfigured && !useMock) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 text-brand-cream">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 text-center"
        >
          <div className="space-y-2">
            <div className="inline-block p-3 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 mb-4">
              <Zap className="w-8 h-8 text-brand-orange" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter">ADGEN <span className="text-brand-orange text-lg align-top">PRO</span></h1>
            <p className="text-brand-cream/60 text-sm">Ingresa tu API Key de Gemini para activar el motor de psicología estratégica.</p>
          </div>

          <div className="bg-brand-card/50 border border-brand-border p-6 rounded-3xl space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-[10px] uppercase font-bold tracking-widest text-brand-orange">Tu Gemini API Key</label>
              <input 
                type="password"
                placeholder="Pega tu token aquí..."
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border rounded-xl p-4 text-sm focus:border-brand-orange outline-none"
              />
              <p className="text-[10px] text-brand-cream/40">Consigue una gratis en <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-brand-orange hover:underline">Google AI Studio</a></p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-brand-orange hover:bg-brand-blue text-brand-dark font-black py-4 rounded-xl transition-all uppercase tracking-widest text-xs"
            >
              Conectar y Empezar
            </button>
          </div>

          <button 
            onClick={() => setUseMock(true)}
            className="text-[10px] uppercase font-bold tracking-[0.2em] text-brand-cream/20 hover:text-brand-cream/60 transition-colors"
          >
            O probar modo de simulación
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-12 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-brand-orange rounded-2xl flex items-center justify-center shadow-lg shadow-brand-orange/20">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CopyFlow <span className="text-brand-orange">Pro</span></h1>
            <p className="text-sm text-brand-cream/50">IA Copywriting Expert</p>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 bg-brand-card/50 border border-brand-border px-4 py-2 rounded-full"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-mono text-brand-cream/60">{appVersion} • Firebase Active</span>
          <button 
            onClick={() => setShowPrivacy(true)}
            className="p-1 hover:text-brand-orange transition-colors"
            title="Políticas de Privacidad"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-1 hover:text-brand-orange transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </motion.div>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Input Card */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-8 bento-card flex flex-col gap-6"
        >
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-brand-blue" />
              Detalles del Producto
            </h2>
            <button 
              onClick={resetForm}
              className="p-2 hover:bg-brand-orange/10 rounded-full transition-colors text-brand-cream/40 hover:text-brand-orange"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-brand-cream/40">Detalles del Producto (Prompt Context)</label>
              <textarea 
                placeholder="Pega aquí toda la información del producto. El sistema extraerá el título, precio y beneficios automáticamente para generar los ángulos de venta..."
                value={formData.details}
                maxLength={500000}
                onChange={e => setFormData({ details: e.target.value })}
                className="w-full bg-brand-dark/50 border border-brand-border rounded-xl p-4 text-sm focus:border-brand-orange outline-none transition-all h-64 resize-none placeholder:text-brand-cream/20 custom-scrollbar"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(Object.keys(enabledSections) as Array<keyof typeof enabledSections>).map(section => (
              <button
                key={section}
                onClick={() => setEnabledSections(prev => ({ ...prev, [section]: !prev[section] }))}
                className={`py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  enabledSections[section] ? 'bg-brand-blue text-white' : 'bg-brand-dark border border-brand-border text-brand-cream/40'
                }`}
              >
                {section}
              </button>
            ))}
          </div>

          <button 
            onClick={handleGenerate}
            disabled={!formData.details || loading}
            className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
              loading 
                ? 'bg-brand-blue/50 text-white cursor-wait' 
                : 'bg-brand-orange hover:bg-brand-orange/90 text-white shadow-xl shadow-brand-orange/20 active:scale-[0.98]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <RefreshCcw className="w-5 h-5 animate-spin" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
            {loading ? 'GENERANDO MÁGIA...' : 'GENERAR ANUNCIOS'}
          </button>
        </motion.section>

        {/* Stats & History Overlay (Mobile: stack, Desktop: side) */}
        <div className="md:col-span-4 flex flex-col gap-6">
          
          {/* Credit Card */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bento-card overflow-hidden relative"
          >
            <div className="relative z-10">
              <p className="text-[10px] uppercase font-bold tracking-widest text-brand-cream/40 mb-1">Créditos de Hoy</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-light tracking-tighter text-white">{credits}</span>
                <span className="text-brand-cream/30">/ 999</span>
              </div>
              <div className="mt-4 w-full h-1 bg-brand-border rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(credits / 999) * 100}%` }}
                  className="h-full bg-brand-orange shadow-[0_0_8px_rgba(224,94,26,0.5)]"
                />
              </div>
              <p className="mt-3 text-[10px] text-brand-cream/30 italic">Reinicio: 00:00 Local</p>
            </div>
            {/* Background Aesthetic */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-brand-blue/5 rounded-full blur-2xl" />
          </motion.section>

          {/* History Card */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bento-card flex-1"
          >
            <h2 className="text-sm font-bold flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-brand-orange" />
              Recientes
            </h2>
            <div className="space-y-3">
              {history.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-brand-dark/30 rounded-xl border border-brand-border/50 group transition-all hover:border-brand-orange/20">
                  <div className="w-2 h-2 rounded-full bg-brand-blue group-hover:bg-brand-orange" />
                  <span className="text-xs text-brand-cream/60 truncate">{item}</span>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bento-card w-full max-w-md bg-brand-card"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Settings className="w-5 h-5 text-brand-orange" />
                    Configuración
                  </h2>
                  <button onClick={() => setShowSettings(false)} className="text-brand-cream/50 hover:text-white">✕</button>
                </div>
                
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-brand-cream/40">Modelo de Gemini</label>
                    <select 
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-brand-dark border border-brand-border rounded-xl p-4 text-sm focus:border-brand-orange outline-none"
                    >
                      <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                      <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite Preview</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-brand-cream/40">Instrucciones del Sistema (Prompt)</label>
                    <textarea 
                      value={systemInstructions}
                      onChange={(e) => setSystemInstructions(e.target.value)}
                      rows={5}
                      className="w-full bg-brand-dark border border-brand-border rounded-xl p-4 text-sm focus:border-brand-orange outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-brand-cream/40">Versión App</label>
                      <input 
                        type="text"
                        value={appVersion}
                        onChange={(e) => setAppVersion(e.target.value)}
                        className="w-full bg-brand-dark border border-brand-border rounded-xl p-4 text-sm focus:border-brand-orange outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-brand-cream/40">API Key (Opcional)</label>
                      <input 
                        type="password"
                        placeholder="Dejar vacío para usar sistema"
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        className="w-full bg-brand-dark border border-brand-border rounded-xl p-4 text-sm focus:border-brand-orange outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-brand-dark border border-brand-border rounded-xl text-sm">
                    <span className="text-brand-cream/60">Modo Mock (Pruebas)</span>
                    <button 
                      onClick={() => setUseMock(!useMock)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${useMock ? 'bg-brand-orange' : 'bg-brand-border'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${useMock ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-8">
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="w-full py-3 bg-brand-orange text-white rounded-xl font-bold hover:bg-brand-orange/90"
                  >
                    Guardar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Privacy Modal */}
        <AnimatePresence>
          {showPrivacy && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bento-card w-full max-w-lg bg-brand-card"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-brand-blue" />
                    Reglas de Privacidad y Uso
                  </h2>
                  <button onClick={() => setShowPrivacy(false)} className="text-brand-cream/50 hover:text-white">✕</button>
                </div>
                
                <div className="space-y-4 text-xs text-brand-cream/70 leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="p-4 bg-brand-dark/50 rounded-xl border border-brand-border">
                    <h3 className="text-brand-orange font-bold uppercase tracking-widest mb-2 text-[10px]">1. Manejo de API Keys</h3>
                    <p>Tu API Key se almacena localmente en tu navegador (localStorage). Nunca se envía a nuestros servidores. Las solicitudes a Gemini se realizan directamente desde tu cliente si así está configurado.</p>
                  </div>
                  
                  <div className="p-4 bg-brand-dark/50 rounded-xl border border-brand-border">
                    <h3 className="text-brand-orange font-bold uppercase tracking-widest mb-2 text-[10px]">2. Datos del Producto</h3>
                    <p>El texto que pegas en el campo de "Detalles del Producto" se procesa únicamente para generar el anuncio. No almacenamos, vendemos ni perfilamos tu información comercial de forma permanente fuera de tu sesión local.</p>
                  </div>

                  <div className="p-4 bg-brand-dark/50 rounded-xl border border-brand-border">
                    <h3 className="text-brand-orange font-bold uppercase tracking-widest mb-2 text-[10px]">3. Historial Local</h3>
                    <p>Tu historial de generaciones reside exclusivamente en tu dispositivo. Al limpiar la caché o datos del navegador, esta información se perderá permanentemente.</p>
                  </div>

                  <div className="p-4 bg-brand-dark/50 rounded-xl border border-brand-border">
                    <h3 className="text-brand-orange font-bold uppercase tracking-widest mb-2 text-[10px]">4. Uso Ético</h3>
                    <p>Este sistema utiliza psicología de ventas avanzada. El usuario es responsable de asegurar que las promesas y ofertas generadas coincidan con la realidad de su producto.</p>
                  </div>

                  <div className="p-4 bg-brand-blue/5 rounded-xl border border-brand-blue/20">
                    <p className="text-brand-blue font-medium">Nota: Al usar tus propios tokens, estás sujeto a los términos de servicio de Google Gemini y su política de privacidad de datos empresariales.</p>
                  </div>
                </div>
                
                <div className="mt-8">
                  <button 
                    onClick={() => setShowPrivacy(false)}
                    className="w-full py-3 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl font-bold transition-all"
                  >
                    Entendido
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Area */}
        <AnimatePresence>
          {result && (
            <motion.section 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="md:col-span-12 bento-card bg-brand-dark border-brand-orange/20 flex flex-col gap-4"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-border pb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-brand-orange" />
                  Resultado Estratégico
                </h2>
                
                <div className="relative flex items-center bg-brand-blue rounded-xl overflow-hidden shadow-lg shadow-brand-blue/20">
                  <AnimatePresence>
                    {feedback && (
                      <motion.div 
                        initial={{ opacity: 0, y: 15, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        className={`fixed top-6 right-6 px-4 py-2 rounded-full whitespace-nowrap shadow-2xl flex items-center gap-2 border border-white/10 z-[100] ${
                          feedback.type === 'success' ? 'bg-brand-orange text-white' : 'bg-red-500 text-white'
                        }`}
                      >
                        {feedback.type === 'success' && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                            className="flex-shrink-0 w-4 h-4 bg-white rounded-full flex items-center justify-center"
                          >
                            <CheckCircle2 className="w-3 h-3 text-brand-orange" />
                          </motion.div>
                        )}
                        <span className="font-bold tracking-wide uppercase text-[10px]">{feedback.text}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center px-4 py-2.5 border-r border-white/10 group">
                    <Copy className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                  </div>
                  
                  {!isEditing ? (
                    <>
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2.5 text-[10px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all border-r border-white/10"
                      >
                        EDITAR
                      </button>
                      <button 
                        onClick={() => copyToClipboard('md')}
                        className="px-4 py-2.5 text-[10px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all border-r border-white/10"
                      >
                        MARKDOWN
                      </button>
                      <button 
                        onClick={() => copyToClipboard('plain')}
                        className="px-4 py-2.5 text-[10px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all"
                      >
                        PLANO
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => {
                        setResult(editableResult);
                        setIsEditing(false);
                      }}
                      className="px-4 py-2.5 text-[10px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all"
                    >
                      GUARDAR
                    </button>
                  )}
                </div>
              </div>

              <div className="prose prose-invert prose-orange max-w-none prose-sm md:prose-base overflow-auto max-h-[600px] scroll-smooth p-2 md:p-4 font-sans">
                {isEditing ? (
                  <textarea
                    value={editableResult}
                    onChange={(e) => setEditableResult(e.target.value)}
                    className="w-full h-full min-h-[400px] bg-brand-dark/50 border border-brand-border rounded-xl p-4 text-sm focus:border-brand-orange outline-none resize-none"
                  />
                ) : (
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-brand-orange border-b border-brand-border pb-2 mt-8" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-brand-cream bg-brand-blue/10 px-3 py-1 rounded-lg mt-6" {...props} />,
                      p: ({node, ...props}) => <p className="leading-relaxed text-brand-cream/80" {...props} />,
                      strong: ({node, ...props}) => <strong className="text-brand-orange" {...props} />,
                    }}
                  >
                    {result}
                  </ReactMarkdown>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <footer className="mt-auto text-center py-8">
        <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-brand-cream/20">
          Powered by Gemini Strategic Psychology Engine
        </p>
        <p className="text-[9px] text-brand-cream/30 mt-2">
          El contenido generado por IA puede contener fallos o errores; verifique siempre la información antes de publicarla o usarla.
        </p>
      </footer>
    </div>
  );
}
