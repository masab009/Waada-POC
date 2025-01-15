import React, { useState, useRef } from 'react';
import {
  Clock,
  Volume2,
  Waves,
  Activity,
  Upload,
  Sparkles,
  X,
  BarChart2,
  MessageSquare,
  CheckCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface TimeData {
  pitch: number[];
  amplitude: number[];
  energy: number[];
  timestamps: number[];
}

interface AudioMetrics {
  duration: number;
  averagePitch: number;
  amplitude: number;
  signalEnergy: number;
  timeData: TimeData;
  geminiAnalysis: {
    'Speech Analysis': {
      'Articulation Clarity': string;
      'Speaking Pace': string;
      'Tone': string;
    };
    'Success Classification': {
      'Successful': boolean;
      'Reasons': string;
      'Relevant Quotes': string;
    };
    'Detailed Evaluation with Scores': {
      [key: string]: {
        Score: number;
        Feedback: string;
      };
    };
  };
}

interface MetricCardProps {
  icon: React.ElementType;
  title: string;
  value: string;
  timeData?: number[];
  timestamps?: number[];
  color: string;
  onClick: () => void;
  isExpanded: boolean;
}

function MetricCard({ icon: Icon, title, value, color, onClick, isExpanded }: MetricCardProps) {
  return (
    <div 
      className={`bg-[#1a2234] rounded-xl p-6 shadow-lg border border-[#2a334a] cursor-pointer transition-all ${
        isExpanded ? 'col-span-2 row-span-2' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
        <h3 className="text-white font-medium">{title}</h3>
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function App() {
  const [isIntelligentModel, setIsIntelligentModel] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [metrics, setMetrics] = useState<AudioMetrics | null>(null);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'audio/mpeg') {
      setAudioFile(file);

      const formData = new FormData();
      formData.append('audio', file);

      try {
        const response = await fetch('http://localhost:5000/analyze', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log('Received data:', data);
        setMetrics(data);
      } catch (error) {
        console.error('Error analyzing audio:', error);
      }
    }
  };

  const handleRemoveAudio = () => {
    setAudioFile(null);
    setMetrics(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#111827] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Call Analysis Dashboard</h1>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#1a2234] text-white border border-[#2a334a] hover:bg-[#2a334a] transition-all cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Upload Call Audio</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,audio/mpeg"
                onChange={handleAudioUpload}
                className="hidden"
              />
            </label>
            {audioFile && (
              <button
                onClick={handleRemoveAudio}
                className="p-2 text-gray-400 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* File name display */}
        {audioFile && (
          <div className="bg-[#1a2234] p-4 rounded-lg border border-[#2a334a] text-gray-300">
            Analyzing: {audioFile.name}
          </div>
        )}

        {/* Metrics Grid */}
        {metrics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                icon={Clock}
                title="Call Duration"
                value={`${metrics.duration.toFixed(2)}s`}
                timeData={metrics.timeData.timestamps}
                timestamps={metrics.timeData.timestamps}
                color="bg-blue-500"
                onClick={() => setExpandedMetric(expandedMetric === 'duration' ? null : 'duration')}
                isExpanded={expandedMetric === 'duration'}
              />
              <MetricCard
                icon={Volume2}
                title="Average Pitch"
                value={`${metrics.averagePitch.toFixed(2)} Hz`}
                timeData={metrics.timeData.pitch}
                timestamps={metrics.timeData.timestamps}
                color="bg-green-500"
                onClick={() => setExpandedMetric(expandedMetric === 'pitch' ? null : 'pitch')}
                isExpanded={expandedMetric === 'pitch'}
              />
              <MetricCard
                icon={Waves}
                title="Amplitude"
                value={`${metrics.amplitude.toFixed(2)} dB`}
                timeData={metrics.timeData.amplitude}
                timestamps={metrics.timeData.timestamps}
                color="bg-purple-500"
                onClick={() => setExpandedMetric(expandedMetric === 'amplitude' ? null : 'amplitude')}
                isExpanded={expandedMetric === 'amplitude'}
              />
              <MetricCard
                icon={Activity}
                title="Signal Energy"
                value={metrics.signalEnergy.toFixed(2)}
                timeData={metrics.timeData.energy}
                timestamps={metrics.timeData.timestamps}
                color="bg-red-500"
                onClick={() => setExpandedMetric(expandedMetric === 'energy' ? null : 'energy')}
                isExpanded={expandedMetric === 'energy'}
              />
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Speech Analysis */}
              <div className="bg-[#1a2234] rounded-xl p-6 shadow-lg border border-[#2a334a]">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-6 h-6 text-cyan-400" />
                  <h2 className="text-lg font-semibold text-white">Speech Analysis</h2>
                </div>
                <div className="space-y-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {metrics.geminiAnalysis?.['Speech Analysis'] && 
                    Object.entries(metrics.geminiAnalysis['Speech Analysis']).map(([key, value]) => (
                      <div key={key} className="border-b border-[#2a334a] pb-4 last:border-b-0">
                        <h3 className="text-cyan-400 font-medium mb-2">{key}</h3>
                        <p className="text-gray-300">{value as string}</p>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Classification */}
              <div className="bg-[#1a2234] rounded-xl p-6 shadow-lg border border-[#2a334a]">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-6 h-6 text-cyan-400" />
                  <h2 className="text-lg font-semibold text-white">Classification</h2>
                </div>
                <div className="space-y-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {metrics.geminiAnalysis?.['Success Classification'] && (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg font-medium text-white">Status:</span>
                        {metrics.geminiAnalysis['Success Classification'].Successful ? (
                          <span className="text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="w-5 h-5" />
                            Successful
                          </span>
                        ) : (
                          <span className="text-red-400 flex items-center gap-1">
                            <XCircle className="w-5 h-5" />
                            Unsuccessful
                          </span>
                        )}
                      </div>
                      <div className="border-t border-[#2a334a] pt-4">
                        <h3 className="text-cyan-400 font-medium mb-2">Reasons</h3>
                        <p className="text-gray-300">
                          {metrics.geminiAnalysis['Success Classification'].Reasons}
                        </p>
                      </div>
                      <div className="border-t border-[#2a334a] pt-4">
                        <h3 className="text-cyan-400 font-medium mb-2">Relevant Quotes</h3>
                        <p className="text-gray-300">
                          {metrics.geminiAnalysis['Success Classification']['Relevant Quotes']}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Detailed Evaluation */}
              <div className="bg-[#1a2234] rounded-xl p-6 shadow-lg border border-[#2a334a] col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="w-6 h-6 text-cyan-400" />
                  <h2 className="text-lg font-semibold text-white">Detailed Evaluation with Scores</h2>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {metrics.geminiAnalysis?.['Detailed Evaluation with Scores'] &&
                    Object.entries(metrics.geminiAnalysis['Detailed Evaluation with Scores']).map(
                      ([category, data]) => (
                        <div key={category} className="border-b border-[#2a334a] pb-4 last:border-b-0">
                          <h3 className="text-cyan-400 font-medium mb-2">{category}</h3>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-300">Score</span>
                            <span className="text-cyan-400 font-medium">
                              {data.Score}/100
                            </span>
                          </div>
                          <p className="text-gray-300">{data.Feedback}</p>
                        </div>
                      )
                    )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Model Toggle Button */}
        <button
          onClick={() => setIsIntelligentModel(!isIntelligentModel)}
          className="fixed bottom-8 right-8 flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#1a2234] text-white border border-[#2a334a] hover:bg-[#2a334a] transition-all"
        >
          <Sparkles className={`w-4 h-4 ${isIntelligentModel ? 'text-cyan-400' : 'text-gray-400'}`} />
          <span>{isIntelligentModel ? 'Intelligent Model' : 'Basic Model'}</span>
        </button>
      </div>
    </div>
  );
}

export default App;