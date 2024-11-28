import { useState, useEffect, useCallback, useRef } from 'react';
import Echo from 'laravel-echo';

const TextToSpeechReverb = () => {
  const [messages, setMessages] = useState([]);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const messageQueue = useRef([]);
  const isProcessing = useRef(false);
  const echoInstance = useRef(null);

  // Initialize Echo dan Voice
  useEffect(() => {
    // Setup Laravel Echo
    echoInstance.current = new Echo({
      broadcaster: 'reverb',
      key: import.meta.env.VITE_REVERB_APP_KEY,
      wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
      wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
      forceTLS: false,
      enabledTransports: ['ws', 'wss']
    });

    // Listen connection status
    echoInstance.current.connector.socket.on('connect', () => {
      console.log('Connected to Reverb');
      setIsConnected(true);
    });

    echoInstance.current.connector.socket.on('disconnect', () => {
      console.log('Disconnected from Reverb');
      setIsConnected(false);
    });

    // Listen to panggil_antrian event
    echoInstance.current.channel('antrian')
      .listen('.panggil_antrian', (data) => {
        console.log('Received message:', data);
        setMessages(prev => [...prev, data]);
        addToQueue(data.message);
      });

    // Initialize speech synthesis voices
    const initVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      const indonesianVoice = availableVoices.find(v => v.lang.includes('id'));
      setSelectedVoice(indonesianVoice || availableVoices[0]);
    };

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = initVoices;
    }
    initVoices();

    return () => {
      if (echoInstance.current) {
        echoInstance.current.disconnect();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  // Fungsi untuk menambahkan pesan ke antrian
  const addToQueue = useCallback((text) => {
    messageQueue.current.push(text);
    processQueue();
  }, []);

  // Fungsi untuk memproses antrian pesan
  const processQueue = useCallback(async () => {
    if (isProcessing.current || messageQueue.current.length === 0) {
      return;
    }

    isProcessing.current = true;
    setIsPlaying(true);

    while (messageQueue.current.length > 0) {
      const text = messageQueue.current[0];
      await playMessage(text);
      messageQueue.current.shift();
    }

    isProcessing.current = false;
    setIsPlaying(false);
  }, []);

  // Fungsi untuk memutar pesan
  const playMessage = (text) => {
    return new Promise((resolve) => {
      if (!text) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = selectedVoice;
      utterance.volume = volume;
      utterance.rate = rate;
      utterance.pitch = pitch;

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = () => {
        console.error('Error playing message');
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  // Fungsi untuk membersihkan antrian
  const clearQueue = () => {
    messageQueue.current = [];
    window.speechSynthesis.cancel();
    isProcessing.current = false;
    setIsPlaying(false);
  };

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Terhubung ke Reverb' : 'Terputus dari Reverb'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-blue-500' : 'bg-gray-300'}`} />
          <span className="text-sm text-gray-600">
            {isPlaying ? 'Sedang Berbicara' : 'Diam'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Pilih Suara</label>
        <select
          className="w-full p-2 border border-gray-300 rounded-md"
          value={selectedVoice?.name || ''}
          onChange={(e) => {
            const voice = voices.find(v => v.name === e.target.value);
            setSelectedVoice(voice);
          }}
        >
          {voices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {`${voice.name} (${voice.lang})`}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
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
      </div>

      <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-gray-700">Riwayat Panggilan</h3>
          <span className="text-sm text-gray-500">
            Antrian: {messageQueue.current.length} pesan
          </span>
        </div>
        {messages.map((msg, index) => (
          <div key={index} className="p-2 bg-gray-50 rounded text-sm">
            {msg.message}
          </div>
        ))}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={clearQueue}
          className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
          disabled={!isPlaying && messageQueue.current.length === 0}
        >
          Bersihkan Antrian
        </button>
      </div>
    </div>
  );
};

export default TextToSpeechReverb;