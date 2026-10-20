'use client';
import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Keyboard, X, Send, Settings2 } from 'lucide-react';

export default function VoiceRecorder({ onTaskCreated }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [typedPrompt, setTypedPrompt] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  // Enumerate all available audio input devices
  const loadAudioDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter((d) => d.kind === 'audioinput');
      setDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    } catch (e) {
      console.warn('Could not enumerate devices:', e);
    }
  };

  useEffect(() => {
    loadAudioDevices();
  }, []);

  const sendAudioToGemini = async (audioBlob, mimeType) => {
    if (audioBlob.size < 3000) {
      setStatusMessage('No sound heard. Please check selected mic.');
      setTimeout(() => setStatusMessage(''), 3500);
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Gemini analyzing your voice...');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];

        const response = await fetch('/api/parse-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: mimeType || 'audio/webm',
          }),
        });

        const data = await response.json();
        if (data.task) {
          onTaskCreated(data.task);
          setStatusMessage('Task added!');
        } else {
          setStatusMessage(data.error || 'Failed to detect task');
        }
        setTimeout(() => setStatusMessage(''), 3500);
        setIsProcessing(false);
      };
    } catch (err) {
      console.error('Audio processing error:', err);
      setStatusMessage('Error parsing audio.');
      setTimeout(() => setStatusMessage(''), 3000);
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      // Force constraints to use explicitly selected device
      const audioConstraints = selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId } }
        : true;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
      streamRef.current = stream;

      // Re-populate device list now that permissions are granted (reveals device labels)
      loadAudioDevices();

      // Fix for Chrome Web Audio: Ensure audioContext is explicitly resumed
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let maxVal = 0;
        for (let i = 0; i < dataArray.length; i++) {
          if (dataArray[i] > maxVal) maxVal = dataArray[i];
        }
        // Normalize 0-255 to percentage
        const level = Math.round((maxVal / 255) * 100);
        setAudioLevel(level);
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // Configure media recorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        sendAudioToGemini(audioBlob, recorder.mimeType);
      };

      recorder.start(250);
      setIsRecording(true);
      setStatusMessage('Listening... Speak your task');
    } catch (err) {
      console.error('Microphone error:', err);
      setStatusMessage('Could not start microphone. Check permissions.');
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!typedPrompt.trim()) return;

    setIsProcessing(true);
    setStatusMessage(`Gemini organizing: "${typedPrompt}"...`);

    try {
      const response = await fetch('/api/parse-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speechText: typedPrompt }),
      });
      const data = await response.json();
      if (data.task) {
        onTaskCreated(data.task);
        setStatusMessage('Task added!');
        setTypedPrompt('');
        setShowTextFallback(false);
      } else {
        setStatusMessage(data.error || 'Failed to parse');
      }
    } catch (err) {
      console.error(err);
      setStatusMessage('Error parsing task.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end z-40">
      {statusMessage && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs backdrop-blur-md shadow-lg max-w-xs text-right animate-fade-in border border-neutral-700">
          {statusMessage}
        </div>
      )}

      {/* Live Volume Meter Bar */}
      {isRecording && (
        <div className="mb-2 w-44 bg-neutral-200 h-2.5 rounded-full overflow-hidden shadow-inner border border-neutral-300">
          <div
            className={`h-full transition-all duration-75 ${
              audioLevel > 5 ? 'bg-emerald-500' : 'bg-neutral-400'
            }`}
            style={{ width: `${Math.max(audioLevel, 4)}%` }}
          />
        </div>
      )}

      {/* Device Picker Popup */}
      {showDevicePicker && (
        <div className="mb-3 bg-white p-3 rounded-2xl shadow-2xl border border-neutral-200 w-80 animate-fade-in text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
            <span className="font-semibold text-neutral-700">Choose Microphone</span>
            <button
              onClick={() => setShowDevicePicker(false)}
              className="text-neutral-400 hover:text-neutral-600 p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-neutral-50"
          >
            {devices.map((device, idx) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Manual Text Fallback */}
      {showTextFallback && (
        <div className="mb-3 bg-white p-3 rounded-2xl shadow-2xl border border-neutral-200 w-80 animate-fade-in">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
            <span className="text-xs font-semibold text-neutral-700">Type Task for Gemini</span>
            <button
              onClick={() => setShowTextFallback(false)}
              className="text-neutral-400 hover:text-neutral-600 p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              autoFocus
              placeholder="e.g. Call NMP tomorrow high priority"
              value={typedPrompt}
              onChange={(e) => setTypedPrompt(e.target.value)}
              className="flex-1 text-xs px-2.5 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowDevicePicker(!showDevicePicker)}
          title="Microphone Settings"
          className="w-10 h-10 rounded-full bg-white text-neutral-600 shadow-md border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition"
        >
          <Settings2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowTextFallback(!showTextFallback)}
          title="Type task manually"
          className="w-10 h-10 rounded-full bg-white text-neutral-600 shadow-md border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        <button
          onClick={handleMicClick}
          disabled={isProcessing}
          title={isRecording ? 'Click to finish' : 'Click to speak'}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
            isRecording
              ? 'bg-red-500 scale-110 ring-4 ring-red-300 animate-pulse text-white'
              : isProcessing
              ? 'bg-neutral-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 text-white'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isRecording ? (
            <Square className="w-5 h-5 fill-white" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  );
}