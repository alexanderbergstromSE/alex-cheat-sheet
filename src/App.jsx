import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Guitar, 
  Piano, 
  Drum, 
  FileText,
  X,
  Eye,
  Edit3,
  Printer,
  Music
} from 'lucide-react';

// --- Texturer för Pro-utseende ---
const NOISE_TEXTURE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")`;
const PAPER_TEXTURE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")`;

// --- Kärndata & Ordböcker ---
const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const NOTE_LABELS = {
  'C': 'C', 'C#': 'C#/Db', 'D': 'D', 'Eb': 'D#/Eb', 'E': 'E', 'F': 'F',
  'F#': 'F#/Gb', 'G': 'G', 'G#': 'G#/Ab', 'A': 'A', 'Bb': 'A#/Bb', 'B': 'B'
};

// Ordbok för bas
const BASS_INSTRUMENTS = {
  bass4: { name: 'Bas (4-strängad)', strings: ['G', 'D', 'A', 'E'] },
  bass5: { name: 'Bas (5-strängad)', strings: ['G', 'D', 'A', 'E', 'B'] }
};

// Ordbok för de olika stränginstrumenten
const FRETTED_INSTRUMENTS = {
  guitar: {
    name: 'Gitarr',
    tabStrings: ['e', 'B', 'G', 'D', 'A', 'E'],
    defaultChord: { name: 'C', frets: [-1, 3, 2, 0, 1, 0], fingers: [null, 3, 2, null, 1, null], capo: null }
  },
  ukulele: {
    name: 'Ukulele',
    tabStrings: ['A', 'E', 'C', 'G'],
    defaultChord: { name: 'C', frets: [0, 0, 0, 3], fingers: [null, null, null, 3], capo: null }
  },
  mandolin: {
    name: 'Mandolin',
    tabStrings: ['E', 'A', 'D', 'G'],
    defaultChord: { name: 'C', frets: [0, 2, 3, 0], fingers: [null, 1, 2, null], capo: null }
  }
};

// Hjälpfunktioner
const getPianoKeys = (root, quality, extension, inversion) => {
  const rootIdx = NOTES.indexOf(root);
  if (rootIdx === -1) return [];
  
  let thirdPitch = rootIdx + (extension === 'sus4' ? 5 : extension === 'sus2' ? 2 : (quality === 'm' ? 3 : 4));
  let fifthPitch = rootIdx + 7;
  
  let pitches = [rootIdx, thirdPitch, fifthPitch];
  
  if (extension === '7') pitches.push(rootIdx + 10);
  if (extension === 'maj7') pitches.push(rootIdx + 11);
  if (extension === 'add9') pitches.push(rootIdx + 2); 
  
  let targetPitch = rootIdx;
  if (inversion === 1) targetPitch = thirdPitch;
  if (inversion === 2) targetPitch = fifthPitch;
  
  let targetPC = targetPitch % 12;
  
  let keys = pitches.map(p => {
    let pc = p % 12;
    if (pc < targetPC) {
      return pc + 12;
    }
    return pc;
  });
  
  keys.sort((a,b) => a - b);
  return [...new Set(keys)]; 
};

const formatPianoName = (chordData) => {
  if (!chordData) return '';
  let q = chordData.quality === 'm' ? 'm' : '';
  if (chordData.extension === 'sus4' || chordData.extension === 'sus2') {
    q = ''; 
  }
  return `${chordData.root}${q}${chordData.extension || ''}`;
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const createNewSection = (isFirst = false) => ({
  id: generateId(),
  formSection: isFirst ? 'Formdel: Intro' : 'Ny Formdel',
  tempoKey: isFirst ? 'BPM: 120 | Tonart: C' : '',
  measures: 4,
  drumState: { kick: {}, snare: {}, hihat: {} },
  drumRepeats: {},
  bassState: { 'G': {}, 'D': {}, 'A': {}, 'E': {}, 'B': {} },
  frettedModes: {},
  frettedTabState: {
    guitar: { 'e':{}, 'B':{}, 'G':{}, 'D':{}, 'A':{}, 'E':{} },
    ukulele: { 'A':{}, 'E':{}, 'C':{}, 'G':{} },
    mandolin: { 'E':{}, 'A':{}, 'D':{}, 'G':{} }
  },
  frettedChordState: { guitar: {}, ukulele: {}, mandolin: {} },
  pianoChordState: {}
});

// --- Visuella Komponenter ---

const FClefIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M10.8,4C7.9,4,6.2,5.9,6.2,8.6c0,1.3,0.7,2.3,1.9,2.3c0.9,0,1.6-0.7,1.6-1.6c0-0.9-0.7-1.5-1.6-1.5c-0.1,0-0.2,0-0.3,0 c0.5-1.6,1.8-2.6,3.2-2.6c1.9,0,3.3,1.7,3.3,4.4c0,3.6-2.2,6.9-5.7,8.8l0.9,1.6C13.5,17.8,16,14.1,16,9.6C16,6.2,13.9,4,10.8,4z M17.8,8.2c-0.7,0-1.2,0.6-1.2,1.2c0,0.7,0.6,1.2,1.2,1.2c0.7,0,1.2-0.6,1.2-1.2C19,8.7,18.5,8.2,17.8,8.2z M17.8,11.8 c-0.7,0-1.2,0.6-1.2,1.2c0,0.7,0.6,1.2,1.2,1.2c0.7,0,1.2-0.6,1.2-1.2C19,12.3,18.5,11.8,17.8,11.8z" />
  </svg>
);

const InfinitySymbol = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.178 8c5.096 0 5.096 8 0 8-5.096 0-7.133-8-12.356-8-5.096 0-5.096 8 0 8 5.096 0 7.133-8 12.356-8z" />
  </svg>
);

const EighthNote = () => (
  <svg viewBox="0 0 24 24" className="w-3 h-3 inline-block fill-current opacity-60" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="18" r="4" />
    <path d="M11.5 18V4l8 3v3l-6-2.25V18z" />
  </svg>
);

const MiniPiano = ({ activeKeys }) => {
  const keys = Array.from({ length: 24 }).map((_, i) => {
    const octave = Math.floor(i / 12);
    const noteIndex = i % 12;
    const offsets = [0, 4, 6, 10, 12, 18, 22, 24, 28, 30, 34, 36];
    const isBlack = [1, 3, 6, 8, 10].includes(noteIndex);
    return {
      index: i,
      type: isBlack ? 'black' : 'white',
      x: offsets[noteIndex] + (octave * 42)
    };
  });

  return (
    <svg viewBox="0 0 84 24" className="w-full h-full max-h-[32px] drop-shadow-sm">
      {keys.filter(k => k.type === 'white').map((k) => (
        <rect key={`w-${k.index}`} x={k.x} y="0" width="6" height="24" rx="1"
              fill={activeKeys.includes(k.index) ? '#c7d2fe' : '#ffffff'}
              stroke="#9ca3af" strokeWidth="0.5" />
      ))}
      {keys.filter(k => k.type === 'black').map((k) => (
        <rect key={`b-${k.index}`} x={k.x} y="0" width="4" height="14" rx="0.5"
              fill={activeKeys.includes(k.index) ? '#4f46e5' : '#374151'} />
      ))}
    </svg>
  );
};

const MiniFrettedChord = ({ frets, fingers = [], capo = null, strings = 6 }) => {
  if (!frets) return null;
  
  const numStrings = strings;
  const gap = 26 / (numStrings - 1); 

  let autoBarreFret = null;
  let barreMinStr = numStrings, barreMaxStr = -1;
  const minStringsForBarre = numStrings >= 5 ? 4 : 3;

  for (let f = 1; f <= 5; f++) {
    let count = 0;
    let minS = numStrings, maxS = -1;
    for (let s = 0; s < numStrings; s++) {
      if (frets[s] === f && fingers[s] === 1) {
        count++;
        if (s < minS) minS = s;
        if (s > maxS) maxS = s;
      }
    }
    if (count >= minStringsForBarre) {
      autoBarreFret = f;
      barreMinStr = minS;
      barreMaxStr = maxS;
      break;
    }
  }

  return (
    <svg viewBox="0 0 40 46" className="w-full h-full max-h-[80px] drop-shadow-sm">
      <rect width="40" height="46" fill="#ffffff" stroke="#d1d5db" strokeWidth="1" rx="4" />
      {Array.from({length: numStrings}).map((_, i) => <line key={`v-${i}`} x1={7 + i*gap} y1="10" x2={7 + i*gap} y2="40" stroke="#9ca3af" strokeWidth="1" />)}
      {[0,1,2,3,4].map(i => <line key={`h-${i}`} x1="7" y1={10 + i*7.5} x2="33" y2={10 + i*7.5} stroke="#9ca3af" strokeWidth={i===0 ? "2" : "1"} />)}
      
      {capo && capo > 0 && capo <= 9 && (
        <g>
          <rect x={3} y={8.5} width={34} height={3} fill="#4b5563" rx="1.5" />
          <text x={20} y={7.5} fontSize="3.5" fill="#4b5563" fontWeight="bold" textAnchor="middle">CAPO {capo}</text>
        </g>
      )}

      {autoBarreFret && (
        <g>
          <line 
            x1={7 + barreMinStr * gap} y1={10 + (autoBarreFret - 0.5)*7.5} 
            x2={7 + barreMaxStr * gap} y2={10 + (autoBarreFret - 0.5)*7.5} 
            stroke="#0d9488" strokeWidth="4.6" strokeLinecap="round" 
          />
          <text x={7 + barreMinStr * gap} y={10 + (autoBarreFret - 0.5)*7.5 + 1} fontSize="3.5" fill="white" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">1</text>
        </g>
      )}

      {frets.map((fret, stringIndex) => {
        const x = 7 + stringIndex * gap;
        const finger = fingers[stringIndex];

        if (fret === -1) return <text key={`f-${stringIndex}`} x={x} y="4.5" fontSize="5" fill="#ef4444" textAnchor="middle" fontWeight="bold">X</text>;
        if (fret === 0) return <circle key={`f-${stringIndex}`} cx={x} cy="3" r="1.5" fill="none" stroke="#0d9488" strokeWidth="1" />;
        
        if (fret === autoBarreFret && finger === 1) return null; 
        
        const y = 10 + (fret - 0.5)*7.5;
        return (
          <g key={`f-${stringIndex}`}>
            <circle cx={x} cy={y} r="2.3" fill="#0d9488" />
            {finger && <text x={x} y={y + 1} fontSize="3.5" fill="white" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">{finger}</text>}
          </g>
        );
      })}
    </svg>
  );
};

const KickIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-700 drop-shadow-sm">
    <circle cx="12" cy="12" r="9" fill="#dbeafe" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" fill="none" />
    <path d="M7 20l-2 3 M17 20l2 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const SnareIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-700 drop-shadow-sm">
    <rect x="4" y="10" width="16" height="8" rx="1" fill="#dbeafe" stroke="currentColor" strokeWidth="2" />
    <path d="M8 10v8 M12 10v8 M16 10v8" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
    <path d="M2 6l18 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="20" cy="10" r="1.5" fill="currentColor" />
  </svg>
);

const HiHatIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-700 drop-shadow-sm">
    <path d="M12 13v9 M9 22h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 11l8-3 8 3-8 3z" fill="#dbeafe" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M5 13l7 2.5 7-2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const SimileIcon = () => (
  <svg viewBox="0 0 24 24" className="w-12 h-12 text-blue-500 drop-shadow-sm">
    <path d="M5 18 L19 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="8" cy="8" r="2.5" fill="currentColor" />
    <circle cx="16" cy="16" r="2.5" fill="currentColor" />
  </svg>
);

const StepCell = ({ step, span = 1, isBeat, children, className = '', stepsPerMeasure, isEditMode }) => {
  return (
    <div className={`flex-1 min-w-0 border-r border-stone-300/80 flex flex-col items-center justify-center relative
      ${isBeat ? 'border-r-stone-400 bg-stone-200/25' : 'bg-transparent'} 
      ${step % stepsPerMeasure === 0 ? 'border-l-2 border-l-stone-400' : ''}
      ${isEditMode ? 'hover:bg-stone-100' : ''} 
      transition-colors duration-75 ${className}`}
    >
      {children}
    </div>
  );
};

const TrackRowContainer = ({ title, icon: Icon, borderColor, bgHeader, bgContent, textColor, children, controls, onClear, isEditMode }) => (
  <div className={`flex border-b border-stone-300 group/track ${bgContent} relative`}>
    <div className={`w-44 shrink-0 border-r border-stone-300 ${bgHeader} flex flex-col justify-between p-3 border-l-[6px] ${borderColor} z-30 relative`}>
      <div className={`flex flex-col items-start gap-1.5 ${textColor} w-full opacity-90 pr-6`}>
        <div className="p-1 bg-white/60 rounded shadow-sm border border-white/50">
          <Icon size={20} className="shrink-0" />
        </div>
        <h3 className="font-bold text-[10px] tracking-widest uppercase break-words w-full leading-tight">{title}</h3>
      </div>
      <div className="mt-auto w-full pt-3 flex items-end gap-2 pr-8">
        {isEditMode && onClear && (
          <button 
            onClick={onClear} 
            className="shrink-0 p-1.5 text-stone-400 hover:text-rose-600 bg-white/50 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 transition-all shadow-sm" 
            title="Rensa spårets innehåll på denna rad"
          >
            <Trash2 size={13} />
          </button>
        )}
        {controls && (
          <div className="flex-1 min-w-0">
            {controls}
          </div>
        )}
      </div>
    </div>
    <div className="flex-1 flex relative">
      {children}
    </div>
  </div>
);


// --- Huvudapplikation ---

export default function App() {
  const [isEditMode, setIsEditMode] = useState(true);
  
  const [songTitle, setSongTitle] = useState("Ny Låt");
  const [artist, setArtist] = useState("Artist / Kompositör");
  
  const [bassType, setBassType] = useState('bass4');
  const [frettedType, setFrettedType] = useState('guitar');
  const [frettedMode, setFrettedMode] = useState('chord'); 
  
  const [sections, setSections] = useState([createNewSection(true)]);
  
  const [chordModal, setChordModal] = useState({ isOpen: false, instrument: null, sectionId: null, step: null, data: null });

  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(true);
  const [dragType, setDragType] = useState(null);

  // Referens för att automatiskt storleksanpassa titelfältet utan krockar
  const titleRef = useRef(null);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Fixar höjden på titeln varje gång den ändras så att den pressar ner artisten rätt
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'; 
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
    }
  }, [songTitle, isEditMode]);

  const stepsPerMeasure = 8; 
  const measuresPerSystem = 4;
  const systemsPerPage = 2; 

  const updateSection = (sectionId, updater) => {
    setSections(prev => prev.map(sec => sec.id === sectionId ? updater(sec) : sec));
  };

  const addMeasuresToSection = (sectionId) => {
    updateSection(sectionId, sec => ({ ...sec, measures: sec.measures + 4 }));
  };

  const removeMeasuresFromSection = (sectionId) => {
    updateSection(sectionId, sec => ({ ...sec, measures: Math.max(4, sec.measures - 4) }));
  };

  const addNewSection = () => {
    setSections(prev => [...prev, createNewSection(false)]);
  };

  const removeSection = (sectionId) => {
    if (sections.length <= 1) return;
    setSections(prev => prev.filter(sec => sec.id !== sectionId));
  };

  const updateSectionField = (sectionId, field, value) => {
    updateSection(sectionId, sec => ({ ...sec, [field]: value }));
  };

  const setDrumStep = (sectionId, type, step, value) => {
    updateSection(sectionId, sec => ({
      ...sec,
      drumState: {
        ...sec.drumState,
        [type]: { ...sec.drumState[type], [step]: value }
      }
    }));
  };

  const clearTrackSystem = (sectionId, trackType, stepsToClear) => {
    updateSection(sectionId, sec => {
      const newSec = { ...sec };
      
      if (trackType === 'drums') {
        const d = { kick: {...sec.drumState.kick}, snare: {...sec.drumState.snare}, hihat: {...sec.drumState.hihat} };
        const newRepeats = { ...sec.drumRepeats };
        stepsToClear.forEach(s => { delete d.kick[s]; delete d.snare[s]; delete d.hihat[s]; });
        
        const measuresInSystem = [...new Set(stepsToClear.map(s => Math.floor(s / stepsPerMeasure)))];
        measuresInSystem.forEach(m => delete newRepeats[m]);
        
        newSec.drumState = d;
        newSec.drumRepeats = newRepeats;
      } 
      else if (trackType === 'bass') {
        const b = { G: {...sec.bassState.G}, D: {...sec.bassState.D}, A: {...sec.bassState.A}, E: {...sec.bassState.E}, B: {...(sec.bassState.B || {})} };
        stepsToClear.forEach(s => { delete b.G[s]; delete b.D[s]; delete b.A[s]; delete b.E[s]; if(b.B) delete b.B[s]; });
        newSec.bassState = b;
      } 
      else if (trackType === 'fretted') {
        const fTab = { ...sec.frettedTabState, [frettedType]: { ...sec.frettedTabState[frettedType] } };
        Object.keys(fTab[frettedType]).forEach(str => {
          fTab[frettedType][str] = { ...fTab[frettedType][str] };
        });
        const fChord = { ...sec.frettedChordState, [frettedType]: { ...sec.frettedChordState[frettedType] } };
        const fModes = { ...sec.frettedModes };

        stepsToClear.forEach(s => {
          Object.keys(fTab[frettedType]).forEach(str => delete fTab[frettedType][str][s]);
          delete fChord[frettedType][s];
          delete fModes[s];
        });
        newSec.frettedTabState = fTab;
        newSec.frettedChordState = fChord;
        newSec.frettedModes = fModes;
      } 
      else if (trackType === 'piano') {
        const p = { ...sec.pianoChordState };
        stepsToClear.forEach(s => delete p[s]);
        newSec.pianoChordState = p;
      }
      
      return newSec;
    });
  };

  const toggleDrumRepeat = (sectionId, measureIndex) => {
    updateSection(sectionId, sec => ({
      ...sec,
      drumRepeats: {
        ...sec.drumRepeats,
        [measureIndex]: !sec.drumRepeats[measureIndex]
      }
    }));
  };

  const updateBass = (sectionId, str, step, val) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    if (val !== '' && parseInt(val, 10) > 21) return;
    updateSection(sectionId, sec => {
      const newBass = { ...sec.bassState, [str]: { ...sec.bassState[str] } };
      val === '' ? delete newBass[str][step] : newBass[str][step] = val.slice(0,2);
      return { ...sec, bassState: newBass };
    });
  };

  const updateFrettedTab = (sectionId, str, step, val) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    if (val !== '' && parseInt(val, 10) > 24) return;
    updateSection(sectionId, sec => {
      const typeState = { ...sec.frettedTabState[frettedType], [str]: { ...sec.frettedTabState[frettedType][str] } };
      val === '' ? delete typeState[str][step] : typeState[str][step] = val.slice(0,2);
      return { ...sec, frettedTabState: { ...sec.frettedTabState, [frettedType]: typeState } };
    });
  };

  const setSectionFrettedMode = (sectionId, step, mode) => {
    updateSection(sectionId, sec => ({
      ...sec, frettedModes: { ...sec.frettedModes, [step]: mode }
    }));
  };

  const resetSectionFrettedModes = (sectionId) => {
    updateSection(sectionId, sec => ({ ...sec, frettedModes: {} }));
  };

  const openModal = (instrument, sectionId, step) => {
    const sec = sections.find(s => s.id === sectionId);
    let currentState;
    if (instrument === 'fretted') {
      currentState = sec.frettedChordState[frettedType][step] || FRETTED_INSTRUMENTS[frettedType].defaultChord;
    } else {
      currentState = sec.pianoChordState[step] || { root: 'C', quality: 'M', extension: '', inversion: 0 };
    }
    setChordModal({ isOpen: true, instrument, sectionId, step, data: currentState });
  };

  const saveModal = () => {
    const { instrument, sectionId, step, data } = chordModal;
    updateSection(sectionId, sec => {
      if (instrument === 'fretted') {
        const typeState = { ...sec.frettedChordState[frettedType], [step]: data };
        return { ...sec, frettedChordState: { ...sec.frettedChordState, [frettedType]: typeState } };
      } else {
        return { ...sec, pianoChordState: { ...sec.pianoChordState, [step]: data } };
      }
    });
    setChordModal({ isOpen: false, instrument: null, sectionId: null, step: null, data: null });
  };

  const clearChord = () => {
    const { instrument, sectionId, step } = chordModal;
    updateSection(sectionId, sec => {
      if (instrument === 'fretted') {
        const typeState = { ...sec.frettedChordState[frettedType] };
        delete typeState[step];
        return { ...sec, frettedChordState: { ...sec.frettedChordState, [frettedType]: typeState } };
      } else {
        const newPiano = { ...sec.pianoChordState };
        delete newPiano[step];
        return { ...sec, pianoChordState: newPiano };
      }
    });
    setChordModal({ isOpen: false, instrument: null, sectionId: null, step: null, data: null });
  };

  const handleExport = () => {
    setIsEditMode(false);
    setTimeout(() => {
      try { window.focus(); window.print(); } catch (e) { console.error("Print blocked", e); }
    }, 500);
  };

  const globalPages = [];
  sections.forEach((section, sectionIndex) => {
    const systems = [];
    for (let i = 0; i < section.measures; i += measuresPerSystem) {
      systems.push({
        startMeasure: i,
        measureCount: Math.min(measuresPerSystem, section.measures - i)
      });
    }
    
    for (let i = 0; i < systems.length; i += systemsPerPage) {
      globalPages.push({
        section,
        sectionIndex,
        isFirstPageOfSection: i === 0,
        isLastPageOfSection: i + systemsPerPage >= systems.length,
        systems: systems.slice(i, i + systemsPerPage)
      });
    }
  });

  const totalMeasuresAll = sections.reduce((sum, sec) => sum + sec.measures, 0);

  return (
    <div 
      className="min-h-screen bg-[#f4f3ef] text-stone-900 font-sans flex flex-col items-center pb-20 relative selection:bg-stone-300 print:bg-white"
      style={{ backgroundImage: NOISE_TEXTURE }}
    >
      
      {/* Tvingar webbläsaren att utgå från marginalfria A4-sidor i PDF-läge */}
      <style type="text/css" media="print">
        {`
          @page { size: A4 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        `}
      </style>

      {/* --- HEADER --- */}
      <header className="w-full flex flex-wrap items-center justify-between px-6 py-4 bg-[#fcfbf9]/85 backdrop-blur-md border-b border-stone-300/50 shadow-sm z-40 sticky top-0 print:hidden text-stone-800">
        
        <div className="flex items-center gap-3 bg-white/60 border border-white/80 p-1.5 pr-5 rounded-2xl shadow-sm transition-colors hover:bg-white/80 select-none">
          <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center shadow-inner border border-stone-700 relative overflow-hidden group shrink-0">
            <div className="absolute inset-0 bg-gradient-to-tr from-stone-800 to-stone-600 opacity-40"></div>
            <div className="flex items-end gap-[3px] h-[18px] relative z-10 group-hover:scale-110 transition-transform duration-300">
              <div className="w-1.5 h-2.5 bg-blue-400 rounded-sm"></div>
              <div className="w-1.5 h-[16px] bg-rose-400 rounded-sm"></div>
              <div className="w-1.5 h-[18px] bg-teal-400 rounded-sm"></div>
              <div className="w-1.5 h-3 bg-indigo-400 rounded-sm"></div>
            </div>
          </div>
          <div className="flex flex-col justify-center pt-0.5">
            <h1 className="text-lg font-black tracking-tighter text-stone-900 flex items-baseline gap-1 leading-none">
              ALEX <span className="font-bold text-stone-500 tracking-tight text-[15px]">CHEAT SHEET</span>
            </h1>
            <span className="text-[7px] font-bold uppercase tracking-widest text-stone-400 mt-0.5 ml-0.5">Instrumentstämmor & Form</span>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-stone-50 px-2 py-1.5 rounded-lg border border-stone-200">
            <button 
              onClick={() => setIsEditMode(true)} 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${isEditMode ? 'bg-white shadow text-stone-800 border border-stone-200/50' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'}`}
            >
              <Edit3 size={14} /> Redigera
            </button>
            <button 
              onClick={() => setIsEditMode(false)} 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${!isEditMode ? 'bg-indigo-600 shadow text-white' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'}`}
            >
              <Eye size={14} /> Presentation
            </button>
            
            <div className="w-px h-5 bg-stone-300 mx-1"></div>
            
            <button 
              onClick={handleExport} 
              title="Skriv ut eller spara som PDF (Ctrl+P)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
            >
              <Printer size={14} /> Skriv ut PDF
            </button>
          </div>
          <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-lg border border-stone-200">
            <span className="text-xs font-bold text-stone-600 w-24 text-center">{totalMeasuresAll} Takter Totalt</span>
          </div>
        </div>
      </header>

      {/* --- DOKUMENT-YTA (Sidor) --- */}
      <div className="w-full flex flex-col items-center gap-12 mt-12 print:mt-0 print:gap-0">
        {globalPages.map((page, pageIndex) => {
          const { section, isFirstPageOfSection, isLastPageOfSection, systems } = page;
          const isFirstPageOfDoc = pageIndex === 0;

          return (
            <div 
              key={`page-${pageIndex}`} 
              // print:w-[210mm] och print:h-[297mm] tvingar webbläsaren att matcha pappret exakt
              className="w-full max-w-[900px] bg-[#fdfdfc] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] rounded-sm flex flex-col relative print:shadow-none print:break-after-page border border-stone-200/60 print:border-none print:bg-white print:w-[210mm] print:h-[297mm] print:max-w-none print:overflow-hidden print:m-0"
              style={{ 
                backgroundImage: PAPER_TEXTURE,
                minHeight: '1122px' // Exakt en A4-höjd vid 96 DPI (visuellt på skärmen)
              }}
            >
              
              {isFirstPageOfSection && (
                <div className={`px-10 ${isFirstPageOfDoc ? 'pt-10 pb-8 print:pt-6 print:pb-4' : 'pt-8 pb-3 print:pt-6 print:pb-2'} border-b-[3px] border-stone-900 mx-8 mt-4 relative`}>
                  
                  {isFirstPageOfDoc ? (
                    <div className="w-full flex justify-between items-start relative">
                      
                      <input
                        type="text"
                        value={section.tempoKey}
                        onChange={e => updateSectionField(section.id, 'tempoKey', e.target.value)}
                        readOnly={!isEditMode}
                        className={`text-sm font-bold bg-transparent border-none outline-none text-stone-500 placeholder-stone-300 w-1/4 max-w-[160px] mt-3 transition-all ${isEditMode ? 'hover:bg-stone-100 focus:bg-stone-100 rounded px-2 -ml-2 py-1' : 'pointer-events-none'}`}
                        placeholder="Tempo / Tonart..."
                      />

                      {/* Flex-col gap-2 löser krocken. Titeln resizar nu korrekt utan att putta snett */}
                      <div className="flex-1 flex flex-col items-center max-w-[450px] mx-4 gap-2">
                        <textarea 
                          ref={titleRef}
                          value={songTitle}
                          onChange={e => setSongTitle(e.target.value)}
                          readOnly={!isEditMode}
                          rows={1}
                          className={`text-4xl md:text-5xl font-black bg-transparent border-none outline-none text-stone-900 w-full text-center placeholder-stone-300 transition-all tracking-tighter resize-none overflow-hidden leading-[1.1] ${isEditMode ? 'hover:bg-stone-100 focus:bg-stone-100 rounded py-1' : 'pointer-events-none'}`}
                          placeholder="LÅTENS TITEL..."
                        />
                        <input 
                          type="text" 
                          value={artist}
                          onChange={e => setArtist(e.target.value)}
                          readOnly={!isEditMode}
                          className={`text-lg md:text-xl font-bold bg-transparent border-none outline-none text-stone-500 w-full text-center placeholder-stone-300 transition-all tracking-tight ${isEditMode ? 'hover:bg-stone-100 focus:bg-stone-100 rounded py-1' : 'pointer-events-none'}`}
                          placeholder="Artist / Kompositör..."
                        />
                      </div>

                      <input
                        type="text"
                        value={section.formSection}
                        onChange={e => updateSectionField(section.id, 'formSection', e.target.value)}
                        readOnly={!isEditMode}
                        className={`text-sm font-bold bg-transparent border-none outline-none text-stone-500 placeholder-stone-300 w-1/4 max-w-[160px] text-right mt-3 transition-all ${isEditMode ? 'hover:bg-stone-100 focus:bg-stone-100 rounded px-2 -mr-2 py-1' : 'pointer-events-none'}`}
                        placeholder="Formdel (t.ex. Intro)..."
                      />
                      
                    </div>
                  ) : (
                    <div className="flex justify-between items-end w-full relative z-10">
                      <input
                        type="text"
                        value={section.formSection}
                        onChange={e => updateSectionField(section.id, 'formSection', e.target.value)}
                        readOnly={!isEditMode}
                        className={`text-2xl font-black bg-transparent border-none outline-none text-stone-800 placeholder-stone-300 w-2/3 transition-all tracking-tighter ${isEditMode ? 'hover:bg-stone-100 focus:bg-stone-100 rounded px-2 -ml-2 py-1' : 'pointer-events-none'}`}
                        placeholder="Formdel (t.ex. Vers)..."
                      />
                      <input
                        type="text"
                        value={section.tempoKey}
                        onChange={e => updateSectionField(section.id, 'tempoKey', e.target.value)}
                        readOnly={!isEditMode}
                        className={`text-xs font-bold bg-transparent border-none outline-none text-stone-400 placeholder-stone-300 w-1/3 text-right transition-all ${isEditMode ? 'hover:bg-stone-100 focus:bg-stone-100 rounded px-2 -mr-2 py-1' : 'pointer-events-none'} ${!isEditMode && !section.tempoKey ? 'opacity-0' : ''}`}
                        placeholder={isEditMode ? "Nytt tempo/tonart? (Valfritt)" : ""}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Innehåll: Rader. Gap-12 blir gap-6 under print för att tvinga dem att få plats */}
              <div className={`p-8 print:p-4 flex flex-col gap-12 print:gap-4 ${!isFirstPageOfSection ? 'pt-16 print:pt-6' : ''}`}>
                {systems.map((system, systemIndex) => {
                  const startStep = system.startMeasure * stepsPerMeasure;
                  const endStep = startStep + (system.measureCount * stepsPerMeasure);
                  const systemSteps = Array.from({ length: endStep - startStep }).map((_, i) => startStep + i);

                  return (
                    <div key={`sec-${section.id}-sys-${system.startMeasure}`} className="flex flex-col border-2 border-stone-300 rounded-md shadow-sm bg-white overflow-hidden print:break-inside-avoid">
                      
                      {/* Tidslinje Header */}
                      <div className="flex bg-stone-100 border-b-2 border-stone-300 relative">
                        <div className="w-44 shrink-0 border-r border-stone-300 flex items-center px-4 border-l-[6px] border-transparent">
                          <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Takt {system.startMeasure + 1}-{system.startMeasure + system.measureCount}</span>
                        </div>
                        <div className="flex-1 flex relative">
                          {systemSteps.map(step => {
                            const isBeat = step % 2 === 0;
                            const beatNum = Math.floor((step % stepsPerMeasure) / 2) + 1;
                            const measureNum = Math.floor(step / stepsPerMeasure) + 1;
                            const isMeasureStart = step % stepsPerMeasure === 0;
                            const measureIndex = Math.floor(step / stepsPerMeasure);

                            return (
                              <div key={`head-${step}`} className={`flex-1 border-r border-stone-300/80 flex flex-col justify-end pb-1.5 relative
                                ${isMeasureStart ? 'border-l-2 border-l-stone-400 bg-stone-200/50' : ''}`}>
                                
                                {isMeasureStart && (
                                  <div className="absolute top-1 left-1.5 right-1.5 flex justify-between items-center z-10">
                                    <span className="text-xs font-black text-stone-500">{measureNum}</span>
                                    {measureIndex > 0 && isEditMode && (
                                      <button 
                                        onClick={() => toggleDrumRepeat(section.id, measureIndex)}
                                        className={`p-0.5 rounded transition-colors print:hidden ${section.drumRepeats[measureIndex] ? 'text-blue-600 bg-blue-100' : 'text-stone-400 hover:bg-stone-300'}`}
                                        title="Upprepa trumkomp från föregående takt"
                                      >
                                        <InfinitySymbol />
                                      </button>
                                    )}
                                  </div>
                                )}
                                
                                <span className="text-[10px] text-center font-mono mt-6 flex items-center justify-center min-h-[14px]">
                                  {isBeat ? <span className="text-stone-800 font-bold">{beatNum}</span> : <EighthNote />}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Trummor */}
                      <TrackRowContainer 
                        title="Trummor" icon={Drum} borderColor="border-l-blue-500" bgHeader="bg-blue-50/60" bgContent="bg-blue-50/20" textColor="text-blue-900" 
                        isEditMode={isEditMode} onClear={() => clearTrackSystem(section.id, 'drums', systemSteps)}
                      >
                        <div className="flex-1 flex flex-col py-1 relative z-10">
                          {['hihat', 'snare', 'kick'].map((drumType, index) => (
                            <div key={drumType} className={`flex flex-1 min-h-[32px] relative ${index < 2 ? 'border-b border-stone-300/80' : ''}`}>
                              
                              <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 pointer-events-none bg-white/90 border border-blue-200 p-0.5 rounded-md z-30 shadow-sm flex items-center justify-center scale-[0.80]">
                                {drumType === 'hihat' ? <HiHatIcon /> : drumType === 'snare' ? <SnareIcon /> : <KickIcon />}
                              </div>
                              {systemSteps.map(s => {
                                const measureIndex = Math.floor(s / stepsPerMeasure);
                                const isHidden = measureIndex > 0 && section.drumRepeats[measureIndex];
                                
                                return (
                                  <StepCell key={`${drumType}-${s}`} step={s} isBeat={s%2===0} className={isHidden ? 'opacity-0 pointer-events-none' : (isEditMode ? 'cursor-pointer select-none' : '')} stepsPerMeasure={stepsPerMeasure} isEditMode={isEditMode}>
                                    <div 
                                      className={`w-full h-full flex items-center justify-center transition-colors ${isEditMode && !isHidden ? 'hover:bg-blue-200/80' : ''}`} 
                                      onMouseDown={(e) => {
                                        if (!isEditMode || isHidden) return;
                                        e.preventDefault(); 
                                        const newValue = !section.drumState[drumType][s];
                                        setIsDragging(true);
                                        setDragValue(newValue);
                                        setDragType(drumType);
                                        setDrumStep(section.id, drumType, s, newValue);
                                      }}
                                      onMouseEnter={() => {
                                        if (!isEditMode || isHidden || !isDragging || dragType !== drumType) return;
                                        setDrumStep(section.id, drumType, s, dragValue);
                                      }}
                                    >
                                      {section.drumState[drumType][s] && !isHidden && (
                                        drumType === 'hihat' ? <HiHatIcon /> : drumType === 'snare' ? <SnareIcon /> : <KickIcon />
                                      )}
                                    </div>
                                  </StepCell>
                                )
                              })}
                            </div>
                          ))}
                        </div>

                        {Array.from({length: system.measureCount}).map((_, mIdx) => {
                          const measureIndex = system.startMeasure + mIdx;
                          if (measureIndex > 0 && section.drumRepeats[measureIndex]) {
                            return (
                              <div 
                                key={`repeat-overlay-${measureIndex}`} 
                                className="absolute top-0 bottom-0 flex items-center justify-center z-20 bg-blue-50/90 border-r border-stone-300"
                                style={{ left: `${(mIdx / system.measureCount) * 100}%`, width: `${(1 / system.measureCount) * 100}%` }}
                              >
                                <SimileIcon />
                              </div>
                            )
                          }
                          return null;
                        })}
                      </TrackRowContainer>

                      {/* Bas */}
                      <TrackRowContainer 
                        title="Bas" icon={FClefIcon} borderColor="border-l-rose-500" bgHeader="bg-rose-50/60" bgContent="bg-rose-50/20" textColor="text-rose-900" 
                        isEditMode={isEditMode} onClear={() => clearTrackSystem(section.id, 'bass', systemSteps)}
                        controls={
                          isEditMode && (
                            <div className="flex flex-col w-[85px] gap-1.5 items-start">
                              <select 
                                value={bassType} 
                                onChange={(e) => setBassType(e.target.value)}
                                className="text-[9px] font-bold bg-white/90 border border-rose-200 text-rose-800 rounded px-1 py-1 outline-none shadow-sm w-full cursor-pointer"
                              >
                                <option value="bass4">4-strängad</option>
                                <option value="bass5">5-strängad</option>
                              </select>
                            </div>
                          )
                        }
                      >
                        <div className="flex-1 flex flex-col py-1">
                          {BASS_INSTRUMENTS[bassType].strings.map(str => (
                            <div key={`bass-${str}`} className="flex flex-1 min-h-[24px] relative">
                              <div className="absolute top-1/2 left-0 w-full h-[1.5px] bg-stone-400 pointer-events-none" />
                              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 text-[9px] text-rose-700 font-bold pointer-events-none bg-white/90 border border-rose-200 px-1 py-[1px] rounded-sm z-20 leading-none shadow-sm">{str}</div>
                              {systemSteps.map(s => (
                                <StepCell key={`b-${str}-${s}`} step={s} isBeat={s%2===0} className="!border-r-transparent z-10" stepsPerMeasure={stepsPerMeasure} isEditMode={isEditMode}>
                                  <input 
                                    type="text" maxLength={2} value={section.bassState[str]?.[s] || ''} onChange={(e) => updateBass(section.id, str, s, e.target.value)}
                                    readOnly={!isEditMode}
                                    className={`w-full h-full text-center text-[10px] font-mono font-bold bg-transparent ${section.bassState[str]?.[s] ? 'text-rose-900' : 'text-transparent'} outline-none transition-colors ${isEditMode ? 'focus:bg-white focus:text-rose-700 hover:bg-rose-200/80' : 'pointer-events-none'}`}
                                  />
                                </StepCell>
                              ))}
                            </div>
                          ))}
                        </div>
                      </TrackRowContainer>

                      {/* Stränginstrument (Gitarr/Ukulele/Mandolin) */}
                      <TrackRowContainer 
                        title={FRETTED_INSTRUMENTS[frettedType].name} 
                        icon={Guitar} 
                        borderColor="border-l-teal-500" 
                        bgHeader="bg-teal-50/60" 
                        bgContent="bg-teal-50/20" 
                        textColor="text-teal-900"
                        isEditMode={isEditMode} onClear={() => clearTrackSystem(section.id, 'fretted', systemSteps)}
                        controls={
                          isEditMode && (
                            <div className="flex flex-col w-[85px] gap-1.5 items-start">
                              <select 
                                value={frettedType} 
                                onChange={(e) => setFrettedType(e.target.value)}
                                className="text-[9px] font-bold bg-white/90 border border-teal-200 text-teal-800 rounded px-1 py-1 outline-none shadow-sm w-full cursor-pointer"
                              >
                                <option value="guitar">Gitarr</option>
                                <option value="ukulele">Ukulele</option>
                                <option value="mandolin">Mandolin</option>
                              </select>
                              <div className="flex bg-white/90 rounded border border-teal-200 overflow-hidden shadow-sm w-full">
                                <button onClick={() => { setFrettedMode('chord'); resetSectionFrettedModes(section.id); }} className={`flex-1 text-[9px] font-bold py-1.5 transition-colors ${frettedMode === 'chord' ? 'bg-teal-600 text-white' : 'text-teal-700 hover:bg-teal-50'}`}>Ack</button>
                                <button onClick={() => { setFrettedMode('tab'); resetSectionFrettedModes(section.id); }} className={`flex-1 text-[9px] font-bold py-1.5 border-l border-teal-100 transition-colors ${frettedMode === 'tab' ? 'bg-teal-600 text-white' : 'text-teal-700 hover:bg-teal-50'}`}>Tab</button>
                              </div>
                            </div>
                          )
                        }
                      >
                        <div className="flex-1 flex py-2 min-h-[85px]">
                          {systemSteps.filter(s => s % stepsPerMeasure === 0).map(measureStart => {
                            const s1 = measureStart;
                            const s2 = measureStart + 4;
                            const mode1 = section.frettedModes[s1] || frettedMode;
                            const mode2 = section.frettedModes[s2] || frettedMode;
                            const chord1 = section.frettedChordState[frettedType][s1];
                            const chord2 = section.frettedChordState[frettedType][s2];

                            const isPresentation = !isEditMode;
                            const bothChordsMode = mode1 === 'chord' && mode2 === 'chord';
                            const shouldMerge = isPresentation && bothChordsMode && (!chord1 || !chord2);

                            const renderBlock = (baseStep, isMerged) => {
                              const mode = section.frettedModes[baseStep] || frettedMode;
                              const chordData = isMerged ? (chord1 || chord2) : section.frettedChordState[frettedType][baseStep];
                              const activeInstrument = FRETTED_INSTRUMENTS[frettedType];

                              return (
                                <StepCell key={`g-block-${baseStep}${isMerged ? '-merged' : ''}`} step={baseStep} span={isMerged ? 8 : 4} isBeat={false} className="!p-0 !items-stretch flex-col justify-start relative group/block" stepsPerMeasure={stepsPerMeasure} isEditMode={isEditMode}>
                                  
                                  {isEditMode && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setSectionFrettedMode(section.id, baseStep, mode === 'chord' ? 'tab' : 'chord'); }}
                                      className="absolute top-1 right-1 z-40 bg-white/90 backdrop-blur border border-stone-300 rounded px-1.5 py-0.5 text-[8px] font-bold text-stone-500 hover:text-teal-700 hover:bg-teal-50 hover:border-teal-400 opacity-0 group-hover/block:opacity-100 transition-all shadow-md"
                                      title="Byt mellan Ackord och Tabulatur för denna halvtakt"
                                    >
                                      ⇄ {mode === 'chord' ? 'Tab' : 'Ackord'}
                                    </button>
                                  )}

                                  {mode === 'chord' ? (
                                    <div className="flex-1 flex flex-col items-center justify-start p-1.5 pt-2">
                                      <button 
                                        onClick={() => isEditMode && openModal('fretted', section.id, baseStep)}
                                        className={`w-[85%] max-w-[100px] mx-auto mt-1 text-center font-bold text-[10px] outline-none rounded py-0.5 mb-1 transition-colors flex items-center justify-center shadow-sm leading-none ${chordData ? 'bg-white border border-teal-200 text-teal-900 min-h-[20px]' : 'bg-transparent min-h-[28px]'} ${isEditMode && chordData ? 'hover:bg-teal-50 hover:border-teal-400' : ''} ${isEditMode && !chordData ? 'text-teal-400 border border-dashed border-teal-300 hover:bg-teal-50 shadow-none' : ''} ${!isEditMode && !chordData ? 'opacity-0 pointer-events-none' : ''}`}
                                      >
                                        {chordData ? chordData.name : (isEditMode ? '+ Ackord' : '')}
                                      </button>
                                      {chordData && <div className="w-full max-w-[76px] pointer-events-none mt-0.5"><MiniFrettedChord frets={chordData.frets} fingers={chordData.fingers} capo={chordData.capo} strings={activeInstrument.tabStrings.length} /></div>}
                                    </div>
                                  ) : (
                                    <div className="flex-1 flex flex-col w-full">
                                      {activeInstrument.tabStrings.map(str => (
                                        <div key={`gtab-${str}-${baseStep}`} className="flex flex-1 relative">
                                          <div className="absolute top-1/2 left-0 w-full h-[1.5px] bg-stone-400 pointer-events-none" />
                                          <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 text-[8px] text-teal-700 font-bold pointer-events-none bg-white/90 border border-teal-200 px-0.5 py-[1px] rounded-sm z-20 leading-none shadow-sm">{str}</div>
                                          
                                          {[0,1,2,3].map(offset => {
                                            const s = baseStep + offset;
                                            const isBeat = s % 2 === 0;
                                            return (
                                              <div key={s} className={`flex-1 h-full border-r ${offset === 3 ? 'border-transparent' : (isBeat ? 'border-stone-400 bg-stone-200/25' : 'border-stone-300/80 bg-transparent')} relative z-10 flex items-center justify-center`}>
                                                <input 
                                                  type="text" maxLength={2} value={section.frettedTabState[frettedType][str][s] || ''} onChange={(e) => updateFrettedTab(section.id, str, s, e.target.value)}
                                                  readOnly={!isEditMode}
                                                  className={`w-full h-full text-center text-[10px] font-mono font-bold bg-transparent ${section.frettedTabState[frettedType][str][s] ? 'text-teal-900' : 'text-transparent'} outline-none transition-colors ${isEditMode ? 'focus:bg-white focus:text-teal-700 hover:bg-teal-200/80' : 'pointer-events-none'}`}
                                                />
                                              </div>
                                            )
                                          })}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </StepCell>
                              );
                            };

                            return (
                              <div key={`m-g-${measureStart}`} className="flex-1 flex relative">
                                {shouldMerge ? renderBlock(measureStart, true) : (
                                  <>
                                    {renderBlock(s1, false)}
                                    {renderBlock(s2, false)}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </TrackRowContainer>

                      {/* Piano */}
                      <TrackRowContainer 
                        title="Piano" icon={Piano} borderColor="border-l-indigo-500" bgHeader="bg-indigo-50/60" bgContent="bg-indigo-50/20" textColor="text-indigo-900" 
                        isEditMode={isEditMode} onClear={() => clearTrackSystem(section.id, 'piano', systemSteps)}
                      >
                        <div className="flex-1 flex py-2 min-h-[75px]">
                          {systemSteps.filter(s => s % stepsPerMeasure === 0).map(measureStart => {
                            const s1 = measureStart;
                            const s2 = measureStart + 4;
                            const chord1 = section.pianoChordState[s1];
                            const chord2 = section.pianoChordState[s2];
                            
                            const isPresentation = !isEditMode;
                            const shouldMerge = isPresentation && (!chord1 || !chord2);

                            const renderPianoBlock = (baseStep, isMerged) => {
                              const chordData = isMerged ? (chord1 || chord2) : section.pianoChordState[baseStep];
                              const keys = chordData ? getPianoKeys(chordData.root, chordData.quality, chordData.extension, chordData.inversion) : [];

                              return (
                                <StepCell key={`p-ch-${baseStep}${isMerged ? '-merged' : ''}`} step={baseStep} span={isMerged ? 8 : 4} isBeat={false} className="flex-col items-center justify-start p-2" stepsPerMeasure={stepsPerMeasure} isEditMode={isEditMode}>
                                  <button 
                                    onClick={() => isEditMode && openModal('piano', section.id, baseStep)}
                                    className={`w-[90%] max-w-[90px] mx-auto text-center font-bold text-[11px] outline-none rounded py-1 mb-2 transition-colors flex items-center justify-center shadow-sm leading-none ${chordData ? 'bg-white border border-indigo-200 text-indigo-900 min-h-[24px]' : 'bg-transparent min-h-[24px]'} ${isEditMode && chordData ? 'hover:bg-indigo-50 hover:border-indigo-400' : ''} ${isEditMode && !chordData ? 'text-indigo-400 border border-dashed border-indigo-300 hover:bg-indigo-50 shadow-none' : ''} ${!isEditMode && !chordData ? 'opacity-0 pointer-events-none' : ''}`}
                                  >
                                    {chordData ? formatPianoName(chordData) : (isEditMode ? '+ Ackord' : '')}
                                  </button>
                                  {chordData && <div className="w-full max-w-[76px] mx-auto pointer-events-none"><MiniPiano activeKeys={keys} /></div>}
                                </StepCell>
                              );
                            };

                            return (
                              <div key={`m-p-${measureStart}`} className="flex-1 flex relative">
                                {shouldMerge ? renderPianoBlock(measureStart, true) : (
                                  <>
                                    {renderPianoBlock(s1, false)}
                                    {renderPianoBlock(s2, false)}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </TrackRowContainer>

                    </div>
                  );
                })}

                {/* --- LOKALA KNAPPAR FÖR FORMDELEN --- */}
                {isEditMode && isLastPageOfSection && (
                  <div className="flex justify-center gap-4 mt-2 mb-2 print:hidden flex-wrap">
                    <button 
                      onClick={() => addMeasuresToSection(section.id)}
                      className="flex items-center justify-center gap-2 px-5 py-2 bg-stone-50/80 border-2 border-dashed border-stone-300 text-stone-600 rounded-lg hover:bg-stone-100 hover:border-stone-400 hover:text-stone-900 text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm"
                    >
                      <Plus size={16} /> Lägg till rad (4 takter)
                    </button>
                    {section.measures > 4 && (
                      <button 
                        onClick={() => removeMeasuresFromSection(section.id)}
                        className="flex items-center justify-center gap-2 px-5 py-2 bg-stone-50/80 border-2 border-dashed border-stone-200 text-stone-400 rounded-lg hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm"
                      >
                        <Trash2 size={16} /> Ta bort rad
                      </button>
                    )}
                    {sections.length > 1 && (
                      <button 
                        onClick={() => removeSection(section.id)}
                        className="flex items-center justify-center gap-2 px-5 py-2 bg-rose-50 border-2 border-rose-200 text-rose-600 rounded-lg hover:bg-rose-600 hover:border-rose-600 hover:text-white text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm ml-auto"
                      >
                        <Trash2 size={16} /> Ta bort {section.formSection.replace('Formdel: ', '') || 'Formdel'}
                      </button>
                    )}
                  </div>
                )}

              </div>
              
              <div className="mt-auto px-10 py-6 flex justify-between items-center text-stone-400 text-xs font-bold uppercase tracking-wider print:hidden">
                <span>{pageIndex < globalPages.length - 1 ? 'Fler sidor nedan ↓' : ''}</span>
                <span>Sida {pageIndex + 1} av {globalPages.length}</span>
              </div>
            </div>
          );
        })}

        {/* --- GLOBAL KNAPP FÖR NY FORMDEL (NY SIDA) --- */}
        {isEditMode && (
          <div className="w-full max-w-[900px] flex justify-center mt-2 mb-16 print:hidden">
            <button 
              onClick={addNewSection}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] font-bold tracking-widest uppercase transition-all w-full sm:w-auto"
            >
              <Plus size={22} /> Lägg till ny formdel (ny sida)
            </button>
          </div>
        )}

      </div>

      {/* --- ACKORD-EDITOR MODAL --- */}
      {chordModal.isOpen && (
        <div 
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 print:hidden"
          onClick={() => setChordModal({...chordModal, isOpen: false})}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[95vh] flex flex-col overflow-hidden border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-4 py-3 border-b flex justify-between items-center text-white shrink-0 ${chordModal.instrument === 'fretted' ? 'bg-teal-600' : 'bg-indigo-600'}`}>
              <h2 className="font-bold flex items-center gap-2 text-sm">
                {chordModal.instrument === 'fretted' ? <Guitar size={16}/> : <Piano size={16}/>}
                {chordModal.instrument === 'fretted' ? `Redigera ${FRETTED_INSTRUMENTS[frettedType].name}-ackord` : 'Redigera Pianoackord'}
              </h2>
              <button onClick={() => setChordModal({...chordModal, isOpen: false})} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={18}/></button>
            </div>
            
            <div className="overflow-y-auto bg-stone-50/50">
              {chordModal.instrument === 'fretted' ? (
                <div className="p-5 flex flex-col gap-5">
                  <div>
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 block">Ackordets namn</span>
                    <input 
                      type="text" 
                      value={chordModal.data.name} 
                      onChange={(e) => setChordModal(prev => ({...prev, data: {...prev.data, name: e.target.value}}))}
                      placeholder="T.ex. Cmaj7"
                      className="w-full bg-white border border-stone-300 rounded px-3 py-2 text-sm font-bold text-stone-900 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
                    />
                  </div>

                  <div className="flex flex-col items-center select-none bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-3">Greppbräda</span>
                    <div className="relative">
                      {(() => {
                        const numStrings = chordModal.data.frets.length;
                        const gap = 80 / (numStrings - 1); 
                        const minStringsForBarre = numStrings >= 5 ? 4 : 3;

                        let autoBarreFret = null;
                        let barreMinStr = numStrings, barreMaxStr = -1;
                        for (let f = 1; f <= 5; f++) {
                          let count = 0;
                          let minS = numStrings, maxS = -1;
                          for (let s = 0; s < numStrings; s++) {
                            if (chordModal.data.frets[s] === f && chordModal.data.fingers[s] === 1) {
                              count++;
                              if (s < minS) minS = s;
                              if (s > maxS) maxS = s;
                            }
                          }
                          if (count >= minStringsForBarre) {
                            autoBarreFret = f;
                            barreMinStr = minS;
                            barreMaxStr = maxS;
                            break;
                          }
                        }

                        return (
                          <svg viewBox="0 0 120 160" className="w-[150px] drop-shadow-md">
                            <rect x="0" y="0" width="120" height="160" fill="#ffffff" rx="4" stroke="#d1d5db" />
                            
                            <line x1="20" y1="25" x2="100" y2="25" stroke="#4b5563" strokeWidth="4" />
                            {[1,2,3,4,5].map(i => <line key={`fl-${i}`} x1="20" y1={25 + i*25} x2="100" y2={25 + i*25} stroke="#9ca3af" strokeWidth="1" />)}
                            
                            {Array.from({length: numStrings}).map((_, i) => <line key={`sl-${i}`} x1={20 + i*gap} y1="25" x2={20 + i*gap} y2="150" stroke="#9ca3af" strokeWidth="1.5" />)}

                            {chordModal.data.capo && chordModal.data.capo > 0 && chordModal.data.capo <= 9 && (
                              <g>
                                <rect x="10" y="21" width="100" height="8" fill="#4b5563" rx="4" />
                                <text x="60" y="17" fontSize="8" fill="#4b5563" fontWeight="bold" textAnchor="middle" letterSpacing="1">CAPO {chordModal.data.capo}</text>
                              </g>
                            )}

                            {autoBarreFret && (
                              <g>
                                <line 
                                  x1={20 + barreMinStr * gap} 
                                  y1={25 + (autoBarreFret - 0.5) * 25} 
                                  x2={20 + barreMaxStr * gap} 
                                  y2={25 + (autoBarreFret - 0.5) * 25} 
                                  stroke="#0d9488" strokeWidth="14" strokeLinecap="round" opacity="1" 
                                />
                                <text x={20 + barreMinStr * gap} y={25 + (autoBarreFret - 0.5) * 25} fontSize="9" fill="white" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">1</text>
                              </g>
                            )}

                            {chordModal.data.frets.map((fret, sIdx) => {
                              const x = 20 + sIdx * gap;
                              const finger = chordModal.data.fingers[sIdx];
                              if (fret === -1) return <text key={`ed-f-${sIdx}`} x={x} y="11" fontSize="12" fill="#ef4444" textAnchor="middle" fontWeight="bold">X</text>;
                              if (fret === 0) return <circle key={`ed-f-${sIdx}`} cx={x} cy="7.5" r="4" fill="none" stroke="#0d9488" strokeWidth="2" />;
                              
                              if (fret === autoBarreFret && finger === 1) return null; 
                              
                              const y = 25 + (fret - 0.5) * 25;
                              return (
                                <g key={`ed-f-${sIdx}`}>
                                  <circle cx={x} cy={y} r="7" fill="#0d9488" />
                                  <text x={x} y={y + 0.5} fontSize="9" fill="white" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">{finger}</text>
                                </g>
                              );
                            })}

                            {Array.from({length: numStrings}).map((_, s) => (
                              <rect key={`cz-nut-${s}`} x={20 + s*gap - (gap/2)} y="0" width={gap} height="20" fill="transparent" cursor="pointer"
                                onClick={() => {
                                  const newData = { ...chordModal.data, frets: [...chordModal.data.frets], fingers: [...chordModal.data.fingers] };
                                  newData.frets[s] = newData.frets[s] === 0 ? -1 : 0;
                                  newData.fingers[s] = null;
                                  setChordModal(prev => ({...prev, data: newData}));
                                }}
                              />
                            ))}
                            {[1,2,3,4,5].map(f =>
                              Array.from({length: numStrings}).map((_, s) => (
                                <rect key={`cz-f-${s}-${f}`} x={20 + s*gap - (gap/2)} y={25 + (f-1)*25} width={gap} height="25" fill="transparent" cursor="pointer"
                                  onClick={() => {
                                    const newData = { ...chordModal.data, frets: [...chordModal.data.frets], fingers: [...chordModal.data.fingers] };
                                    const availableFingers = [1, 2, 3, 4].filter(n => 
                                      !newData.fingers.some((fn, i) => fn === n && newData.frets[i] !== f && i !== s)
                                    );

                                    if (newData.frets[s] === f) {
                                      const curr = newData.fingers[s];
                                      if (curr !== null) {
                                        const idx = availableFingers.indexOf(curr);
                                        if (idx !== -1 && idx < availableFingers.length - 1) {
                                          newData.fingers[s] = availableFingers[idx + 1];
                                        } else {
                                          newData.fingers[s] = null;
                                          newData.frets[s] = -1; 
                                        }
                                      } else {
                                        newData.fingers[s] = null;
                                        newData.frets[s] = -1; 
                                      }
                                    } else {
                                      newData.frets[s] = f;
                                      newData.fingers[s] = availableFingers.length > 0 ? availableFingers[0] : null;
                                    }
                                    setChordModal(prev => ({...prev, data: newData}));
                                  }}
                                />
                              ))
                            )}
                          </svg>
                        );
                      })()}
                    </div>
                    <p className="text-[9px] text-center text-stone-500 mt-3 leading-relaxed max-w-[220px]">
                      Klicka på strängarna för att placera grepp. Klicka igen för att byta finger. <br/>Sätt 3 eller 4 strängar på samma band med finger 1 för barré.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Capo:</span>
                    <select
                      value={chordModal.data.capo || ''}
                      onChange={(e) => setChordModal(prev => ({...prev, data: {...prev.data, capo: e.target.value ? parseInt(e.target.value) : null}}))}
                      className="flex-1 bg-white border border-stone-300 rounded px-2 py-1.5 text-sm font-bold text-stone-700 outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
                    >
                      <option value="">Inget Capo</option>
                      {[1,2,3,4,5,6,7,8,9].map(b => <option key={`capo-${b}`} value={b}>Band {b}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-5 flex flex-col gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 block">Grundton</span>
                    <div className="grid grid-cols-4 gap-2">
                      {NOTES.map(note => (
                        <button 
                          key={`root-${note}`}
                          onClick={() => setChordModal(prev => ({...prev, data: {...prev.data, root: note}}))}
                          className={`py-2 rounded font-bold text-sm transition-colors border shadow-sm ${chordModal.data.root === note ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'}`}
                        >
                          {NOTE_LABELS[note]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 block">Tonart</span>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => setChordModal(prev => ({...prev, data: {...prev.data, quality: 'M'}}))}
                          className={`py-2 rounded font-bold text-sm transition-colors border shadow-sm ${chordModal.data.quality === 'M' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'}`}
                        >Dur</button>
                        <button 
                          onClick={() => setChordModal(prev => ({...prev, data: {...prev.data, quality: 'm'}}))}
                          className={`py-2 rounded font-bold text-sm transition-colors border shadow-sm ${chordModal.data.quality === 'm' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'}`}
                        >Moll</button>
                      </div>
                    </div>

                    <div className="flex-[2]">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 block">Färgning</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { val: '', label: '(Ingen)' },
                          { val: '7', label: '7' },
                          { val: 'maj7', label: 'maj7' },
                          { val: 'add9', label: 'add9' },
                          { val: 'sus4', label: 'sus4' },
                          { val: 'sus2', label: 'sus2' }
                        ].map(ext => (
                           <button 
                            key={`ext-${ext.val}`}
                            onClick={() => setChordModal(prev => ({...prev, data: {...prev.data, extension: ext.val}}))}
                            className={`py-2 px-1 rounded font-bold text-xs transition-colors border shadow-sm ${chordModal.data.extension === ext.val ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'}`}
                          >
                            {ext.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 block">Omvändning</span>
                    <div className="flex gap-2">
                      {[
                        { val: 0, label: 'Grundläge' },
                        { val: 1, label: 'Tersläge' },
                        { val: 2, label: 'Kvintläge' }
                      ].map(inv => (
                         <button 
                          key={`inv-${inv.val}`}
                          onClick={() => setChordModal(prev => ({...prev, data: {...prev.data, inversion: inv.val}}))}
                          className={`flex-1 py-2 px-2 rounded font-bold text-xs transition-colors border shadow-sm flex flex-col items-center gap-1 ${chordModal.data.inversion === inv.val ? 'bg-indigo-100 text-indigo-900 border-indigo-300' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'}`}
                        >
                          {inv.label}
                          {chordModal.data.inversion === inv.val && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-0.5"></span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 bg-stone-100 border-t border-stone-200 flex justify-between items-center gap-2 shrink-0">
              <button onClick={clearChord} className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 rounded transition-colors border border-transparent hover:border-rose-200">Rensa fält</button>
              <div className="flex gap-2">
                <button onClick={() => setChordModal({...chordModal, isOpen: false})} className="px-4 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-200 rounded transition-colors border border-stone-300 bg-white shadow-sm">Avbryt</button>
                <button onClick={saveModal} className={`px-5 py-1.5 rounded text-xs font-bold text-white shadow-md transition-colors ${chordModal.instrument === 'fretted' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>Spara ackord</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}