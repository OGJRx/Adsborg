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
  Settings
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";

export default function App() {
  const [formData, setFormData] = React.useState({ title: '', price: '', description: '' });
  const [result, setResult] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [credits, setCredits] = React.useState(999);
  const [history, setHistory] = React.useState<string[]>([]);
  const [copyFeedback, setCopyFeedback] = React.useState<string | null>(null);
  const [enabledSections, setEnabledSections] = React.useState({ gancho: true, solucion: true, oferta: true, cta: true });
  
  // Settings
  const [showSettings, setShowSettings] = React.useState(false);
  const [model, setModel] = React.useState(localStorage.getItem('copyflow_model') || 'gemini-2.0-flash');
  const [systemInstructions, setSystemInstructions] = React.useState(localStorage.getItem('copyflow_instructions') || 'Eres copywriter hispano experto en psicología de ventas. Genera solo Markdown con la estructura exacta. Usa los datos proporcionados. Si precio="Gratis" o "Desde", aplica reciprocidad. Si numérico, contraste perceptual.');
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
    if (!formData.title || !formData.price || loading || credits <= 0) return;
    
    setLoading(true);
    try {
      if (useMock) {
        const mockMarkdown = `# 🎯 Ángulo 1: Problema (RUM)
## Versión A (Resultado+Rapidez)
¿Cansado de esperar? Consigue ${formData.title} y transforma tu día en minutos.
## Versión B (Escasez)
Solo quedan pocas unidades de ${formData.title}. No dejes pasar esta oportunidad única por ${formData.price}.
## Versión C (Contraste)
Otros cobran el doble por la mitad de la calidad. ${formData.title} es la elección inteligente.

# 🚀 Ángulo 2: Competencia (Contracorriente)
## Versión A
Mientras otros fallan, ${formData.title} cumple lo que promete.
## Versión B
La competencia no quiere que sepas esto sobre ${formData.title}.
## Versión C
Diseñado para quienes buscan excelencia, no promesas vacías.`;

        setResult(mockMarkdown);
        setEditableResult(mockMarkdown);
        setCredits(prev => Math.max(0, prev - 1));
        setHistory(prev => [formData.title, ...prev].slice(0, 5));
        return;
      }

      const apiKey = customApiKey.trim() || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setCopyFeedback('API key no configurada');
        setTimeout(() => setCopyFeedback(null), 3000);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
Producto: Título: ${formData.title}, Precio: ${formData.price}, Descripción: ${formData.description}

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

No añadas texto fuera. Emojis moderados.`;

      const response = await ai.models.generateContent({
        model: model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: systemInstructions
        }
      });

      const markdown = response.text || '';
      if (markdown) {
        setResult(markdown);
        setEditableResult(markdown);
        setCredits(prev => Math.max(0, prev - 1));
        setHistory(prev => [formData.title, ...prev].slice(0, 5));
      }
    } catch (err: any) {
      console.error('Error generating:', err);
      if (err?.message?.includes('429')) {
        setCopyFeedback('Cuota Gemini excedida');
      } else if (err?.message?.includes('API key not valid')) {
        setCopyFeedback('API Key inválida');
      } else {
        setCopyFeedback('Error al generar');
      }
      setTimeout(() => setCopyFeedback(null), 3000);
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
    setCopyFeedback(type === 'md' ? 'Markdown copiado!' : 'Texto plano copiado!');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const resetForm = () => {
    setFormData({ title: '', price: '', description: '' });
    setResult('');
  };

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-brand-cream/40">Título (max 60)</label>
              <input 
                type="text" 
                placeholder="Ej. Auriculares Pro-X"
                value={formData.title}
                maxLength={60}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-brand-dark/50 border border-brand-border rounded-xl p-4 text-sm focus:border-brand-orange outline-none transition-all placeholder:text-brand-cream/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-brand-cream/40">Precio (max 20)</label>
              <input 
                type="text" 
                placeholder="Ej. 149.00€"
                value={formData.price}
                maxLength={20}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-brand-dark/50 border border-brand-border rounded-xl p-4 text-sm focus:border-brand-orange outline-none transition-all placeholder:text-brand-cream/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-brand-cream/40">Descripción (max 500)</label>
            <textarea 
              placeholder="Describe las ventajas competitivas..."
              value={formData.description}
              maxLength={500}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-brand-dark/50 border border-brand-border rounded-xl p-4 text-sm focus:border-brand-orange outline-none transition-all h-32 resize-none placeholder:text-brand-cream/20"
            />
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
            disabled={!formData.title || !formData.price || loading}
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
                    {copyFeedback && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-orange text-white text-[10px] rounded-full whitespace-nowrap shadow-xl"
                      >
                        {copyFeedback}
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
      </footer>
    </div>
  );
}
