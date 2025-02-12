import React, { useState, useRef } from 'react';
import {
  Clock,
  Volume2,
  Waves,
  Activity,
  Upload,
  X,
  BarChart2,
  MessageSquare,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  AlertTriangle,
  Shield,
} from 'lucide-react';

interface TimeData {
  pitch: number[];
  amplitude: number[];
  energy: number[];
  timestamps: number[];
}

interface DetailedEvaluation {
  'Greeting & Personalization': {
    Score: number;
    Feedback: string;
    'Suggestions for Improvement': string;
  };
  'Language Clarity': {
    Score: number;
    Feedback: string;
    'Suggestions for Improvement': string;
  };
  'Product & Processes': {
    Score: number;
    Feedback: string;
    'Suggestions for Improvement': string;
  };
  'Pricing & Activation': {
    Score: number;
    Feedback: string;
    'Suggestions for Improvement': string;
  };
}

interface UnsuccessfulCallExplanation {
  Explanation: string;
  'Relevant Quotes': string;
}

interface AudioMetrics {
  duration: number;
  averagePitch: number;
  amplitude: number;
  signalEnergy: number;
  timeData: TimeData;
  geminiAnalysis: {
    Transcriptions: string;
    'Speech Analysis': {
      'Articulation Clarity': string;
      'Speaking Pace': string;
      'Tone': string;
    };
    'Success Classification': {
      'Successful': boolean;
      'Reasons': string;
      'Relevant Quotes': string;
      'Unsuccessful Classification': 'Callback' | 'Fraud' | 'None';
    };
    'Unsuccessful Call Explanation': UnsuccessfulCallExplanation;
    'Detailed Evaluation with Scores': DetailedEvaluation;
    'Critical Compliance Check': {
      Score: number;
      Feedback: string;
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

const SCORE_DIVISIONS = {
  'Greeting & Personalization': 10,
  'Language Clarity': 20,
  'Product & Processes': 30,
  'Pricing & Activation': 40
};

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

function ProcessingOverlay() {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1a2234] rounded-xl p-8 shadow-2xl border border-[#2a334a] max-w-md w-full mx-4">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping"></div>
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">Analyzing Audio</h3>
            <p className="text-gray-400">Please wait while we process your audio file and generate insights...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({ title, suggestions }: { title: string; suggestions: string }) {
  return (
    <div className="mt-4 bg-[#151b2d] rounded-lg p-4 border border-[#2a334a]">
      <h4 className="text-yellow-400 font-medium mb-2">Suggestions for Improvement</h4>
      <p className="text-gray-300 whitespace-pre-line">{suggestions}</p>
    </div>
  );
}

function getScoreColor(score: number, maxScore: number) {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 80) return 'text-green-400';
  if (percentage >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

function App() {
  const [isIntelligentModel, setIsIntelligentModel] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [metrics, setMetrics] = useState<AudioMetrics | null>(null);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTranscription, setShowTranscription] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'audio/mpeg') {
      setAudioFile(file);
      setIsProcessing(true);
      setMetrics(null);

      const formData = new FormData();
      formData.append('audio', file);
      formData.append('isIntelligent', isIntelligentModel.toString());

      try {
        const response = await fetch('https://089b-2a09-bac5-5038-137d-00-1f1-1d6.ngrok-free.app/analyze', {
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
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleModelToggle = async () => {
    const newModelState = !isIntelligentModel;
    setIsIntelligentModel(newModelState);
    
    if (audioFile) {
      setIsProcessing(true);
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('isIntelligent', newModelState.toString());

      try {
        const response = await fetch('https://089b-2a09-bac5-5038-137d-00-1f1-1d6.ngrok-free.app/analyze', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Error analyzing audio:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleRemoveAudio = () => {
    setAudioFile(null);
    setMetrics(null);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#111827] p-8">
      {isProcessing && <ProcessingOverlay />}
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Call Analysis Dashboard</h1>
          <div className="flex items-center space-x-4">
            <label className={`flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#1a2234] text-white border border-[#2a334a] transition-all cursor-pointer ${
              isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2a334a]'
            }`}>
              <Upload className="w-4 h-4" />
              <span>Upload Call Audio</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,audio/mpeg"
                onChange={handleAudioUpload}
                className="hidden"
                disabled={isProcessing}
              />
            </label>
            {audioFile && !isProcessing && (
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

        {/* Main Content */}
        {metrics && (
          <div className="flex gap-6">
            {/* Left Column - Analysis */}
            <div className="flex-1 space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  icon={Clock}
                  title="Call Duration"
                  value={`${metrics.duration.toFixed(2)}s`}
                  color="bg-blue-500"
                  onClick={() => setExpandedMetric(expandedMetric === 'duration' ? null : 'duration')}
                  isExpanded={expandedMetric === 'duration'}
                />
                <MetricCard
                  icon={Volume2}
                  title="Average Pitch"
                  value={`${metrics.averagePitch.toFixed(2)} Hz`}
                  color="bg-green-500"
                  onClick={() => setExpandedMetric(expandedMetric === 'pitch' ? null : 'pitch')}
                  isExpanded={expandedMetric === 'pitch'}
                />
                <MetricCard
                  icon={Waves}
                  title="Amplitude"
                  value={`${metrics.amplitude.toFixed(2)} dB`}
                  color="bg-purple-500"
                  onClick={() => setExpandedMetric(expandedMetric === 'amplitude' ? null : 'amplitude')}
                  isExpanded={expandedMetric === 'amplitude'}
                />
                <MetricCard
                  icon={Activity}
                  title="Signal Energy"
                  value={metrics.signalEnergy.toFixed(2)}
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
                        {!metrics.geminiAnalysis['Success Classification'].Successful && (
                          <div className="border-t border-[#2a334a] pt-4">
                            <h3 className="text-cyan-400 font-medium mb-2">Classification Type</h3>
                            <p className="text-gray-300">
                              {metrics.geminiAnalysis['Success Classification']['Unsuccessful Classification']}
                            </p>
                          </div>
                        )}
                        <div className="border-t border-[#2a334a] pt-4">
                          <h3 className="text-cyan-400 font-medium mb-2">Reasons</h3>
                          <p className="text-gray-300">
                            {metrics.geminiAnalysis['Success Classification'].Reasons}
                          </p>
                        </div>
                        <div className="border-t border-[#2a334a] pt-4">
                          <h3 className="text-cyan-400 font-medium mb-2">Relevant Quotes</h3>
                          <p className="text-gray-300 font-urdu">
                            {metrics.geminiAnalysis['Success Classification']['Relevant Quotes']}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Unsuccessful Call Explanation */}
                {metrics.geminiAnalysis?.['Unsuccessful Call Explanation'] && (
                  <div className="bg-[#1a2234] rounded-xl p-6 shadow-lg border border-[#2a334a]">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-6 h-6 text-yellow-400" />
                      <h2 className="text-lg font-semibold text-white">Unsuccessful Call Explanation</h2>
                    </div>
                    <div className="space-y-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                      <div>
                        <h3 className="text-cyan-400 font-medium mb-2">Explanation</h3>
                        <p className="text-gray-300">
                          {metrics.geminiAnalysis['Unsuccessful Call Explanation'].Explanation}
                        </p>
                      </div>
                      <div className="border-t border-[#2a334a] pt-4">
                        <h3 className="text-cyan-400 font-medium mb-2">Supporting Quotes</h3>
                        <p className="text-gray-300 font-urdu">
                          {metrics.geminiAnalysis['Unsuccessful Call Explanation']['Relevant Quotes']}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detailed Evaluation */}
                <div className="bg-[#1a2234] rounded-xl p-6 shadow-lg border border-[#2a334a] col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart2 className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-lg font-semibold text-white">Detailed Evaluation with Scores</h2>
                  </div>
                  <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {metrics.geminiAnalysis?.['Detailed Evaluation with Scores'] && (
                      <>
                        {Object.entries(metrics.geminiAnalysis['Detailed Evaluation with Scores']).map(
                          ([category, data]) => (
                            <div key={category} className="border-b border-[#2a334a] pb-6 last:border-b-0">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h3 className="text-lg text-cyan-400 font-medium">{category}</h3>
                                  <p className="text-sm text-gray-400">
                                    Maximum score: {SCORE_DIVISIONS[category as keyof typeof SCORE_DIVISIONS]}%
                                  </p>
                                </div>
                                <span className={`text-lg font-bold ${getScoreColor(data.Score, SCORE_DIVISIONS[category as keyof typeof SCORE_DIVISIONS])}`}>
                                  {data.Score}/{SCORE_DIVISIONS[category as keyof typeof SCORE_DIVISIONS]}
                                </span>
                              </div>
                              <p className="text-gray-300 whitespace-pre-line">{data.Feedback}</p>
                              <SuggestionCard 
                                title={category} 
                                suggestions={data['Suggestions for Improvement']} 
                              />
                            </div>
                          )
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Critical Compliance Check */}
                <div className="bg-[#1a2234] rounded-xl p-6 shadow-lg border border-[#2a334a] col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-lg font-semibold text-white">Critical Compliance Check</h2>
                  </div>
                  <div className="space-y-4">
                    {metrics.geminiAnalysis?.['Critical Compliance Check'] && (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg text-cyan-400 font-medium">Compliance Score</h3>
                          <span className={`text-lg font-bold ${getScoreColor(
                            metrics.geminiAnalysis['Critical Compliance Check'].Score,
                            100
                          )}`}>
                            {metrics.geminiAnalysis['Critical Compliance Check'].Score}/100
                          </span>
                        </div>
                        <div className="border-t border-[#2a334a] pt-4">
                          <h3 className="text-cyan-400 font-medium mb-2">Feedback</h3>
                          <p className="text-gray-300 whitespace-pre-line">
                            {metrics.geminiAnalysis['Critical Compliance Check'].Feedback}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Transcription */}
            <div className="w-96">
              <div className="sticky top-8">
                <div className="bg-[#1a2234] rounded-xl p-6 shadow-lg border border-[#2a334a]">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-6 h-6 text-cyan-400" />
                      <h2 className="text-lg font-semibold text-white">Transcription</h2>
                    </div>
                    <button
                      onClick={() => setShowTranscription(!showTranscription)}
                      className="text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                      {showTranscription ? <X className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className={`transition-all duration-300 ${showTranscription ? 'max-h-[600px]' : 'max-h-0'} overflow-y-auto custom-scrollbar`}>
                    <p className="text-gray-300 whitespace-pre-line font-urdu">
                      {metrics.geminiAnalysis.Transcriptions}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;