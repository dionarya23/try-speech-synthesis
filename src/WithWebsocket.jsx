import { useState, useEffect, useCallback, useRef } from 'react';

const WebSocketTTS = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Queue untuk menyimpan pesan yang akan diputar
  const messageQueue = useRef([]);
  // Flag untuk menandai status pemutaran
  const isProcessing = useRef(false);

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = new WebSocket('ws://your-websocket-server');

    ws.onopen = () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
      setTimeout(() => {
        setSocket(new WebSocket('ws://your-websocket-server'));
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages(prev => [...prev, data]);
      // Tambahkan pesan ke antrian
      addToQueue(data.message);
    };

    setSocket(ws);

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
      if (ws) {
        ws.close();
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
    // Jika sedang memproses atau antrian kosong, keluar
    if (isProcessing.current || messageQueue.current.length === 0) {
      return;
    }

    isProcessing.current = true;
    setIsPlaying(true);

    while (messageQueue.current.length > 0) {
      const text = messageQueue.current[0];
      await playMessage(text);
      messageQueue.current.shift(); // Hapus pesan yang sudah diputar
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
            {isConnected ? 'Terhubung ke WebSocket' : 'Terputus dari WebSocket'}
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
          <h3 className="font-medium text-gray-700">Riwayat Pesan</h3>
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
          onClick={() => addToQueue("Ini adalah pesan test")}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Test Suara
        </button>
        <button
          onClick={clearQueue}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          disabled={!isPlaying && messageQueue.current.length === 0}
        >
          Bersihkan Antrian
        </button>
      </div>
    </div>
  );
};

export default WebSocketTTS;