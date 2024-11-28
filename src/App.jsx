import { useState, useEffect } from 'react'

function App() {
  const [text, setText] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [utterance, setUtterance] = useState(null);
  const [voice, setVoice] = useState(null);
  const [voices, setVoices] = useState([]);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports speech synthesis
    if ('speechSynthesis' in window) {
      setIsSupported(true);
      const synth = window.speechSynthesis;
      
      const updateVoices = () => {
        const availableVoices = synth.getVoices();
        console.log('Available voices:', availableVoices);
        setVoices(availableVoices);
        
        // Set default voice (preferably Indonesian if available)
        const indonesianVoice = availableVoices.find(v => v.lang.includes('id'));
        const defaultVoice = indonesianVoice || availableVoices[0];
        if (defaultVoice) {
          console.log('Setting default voice:', defaultVoice);
          setVoice(defaultVoice);
        }
      };

      // Initial voices load
      updateVoices();

      // Handle dynamic voice loading
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = updateVoices;
      }

      return () => {
        synth.cancel();
      };
    } else {
      console.error('Speech synthesis not supported');
    }
  }, []);

  useEffect(() => {
    if (text && isSupported) {
      const u = new SpeechSynthesisUtterance(text);
      
      u.onstart = () => {
        console.log('Speech started');
        setIsSpeaking(true);
      };
      
      u.onend = () => {
        console.log('Speech ended');
        setIsSpeaking(false);
        setIsPaused(false);
      };
      
      u.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setIsSpeaking(false);
        setIsPaused(false);
      };

      setUtterance(u);
    }
  }, [text, isSupported]);

  const handlePlay = () => {
    if (!isSupported) {
      alert('Maaf, browser Anda tidak mendukung fitur text-to-speech');
      return;
    }

    const synth = window.speechSynthesis;

    if (isPaused) {
      console.log('Resuming speech...');
      synth.resume();
    } else if (utterance && text) {
      console.log('Starting new speech...');
      // Cancel any ongoing speech
      synth.cancel();
      
      // Configure utterance
      utterance.voice = voice;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      
      console.log('Speech configuration:', {
        voice: voice?.name,
        rate,
        pitch,
        volume,
        text
      });
      
      // Speak
      synth.speak(utterance);
    }

    setIsSpeaking(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (!isSupported) return;
    console.log('Pausing speech...');
    const synth = window.speechSynthesis;
    synth.pause();
    setIsPaused(true);
  };

  const handleStop = () => {
    if (!isSupported) return;
    console.log('Stopping speech...');
    const synth = window.speechSynthesis;
    synth.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  if (!isSupported) {
    return (
      <div className="max-w-lg mx-auto p-6 bg-red-50 rounded-lg">
        <p className="text-red-600">Maaf, browser Anda tidak mendukung fitur text-to-speech.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6 bg-white rounded-lg shadow-md">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Masukkan Teks</label>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows="4"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ketik teks yang ingin diubah menjadi suara..."
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Pilih Suara</label>
        <select
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={voice?.name || ''}
          onChange={(e) => {
            const selectedVoice = voices.find(v => v.name === e.target.value);
            console.log('Selected voice:', selectedVoice);
            setVoice(selectedVoice);
          }}
        >
          {voices.map((v) => (
            <option key={v.name} value={v.name}>
              {`${v.name} (${v.lang})`}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Kecepatan: {rate}</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nada: {pitch}</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={pitch}
            onChange={(e) => setPitch(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Volume: {volume}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handlePlay}
          disabled={!text || (!isPaused && isSpeaking)}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPaused ? 'Lanjutkan' : (isSpeaking ? 'Berbicara...' : 'Mulai')}
        </button>
        <button
          onClick={handlePause}
          disabled={!isSpeaking || isPaused}
          className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Jeda
        </button>
        <button
          onClick={handleStop}
          disabled={!isSpeaking && !isPaused}
          className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Berhenti
        </button>
      </div>

      {voices.length === 0 && (
        <p className="text-yellow-600">
          Memuat daftar suara... Jika daftar tidak muncul, coba muat ulang halaman.
        </p>
      )}
    </div>
  )
}

export default App
