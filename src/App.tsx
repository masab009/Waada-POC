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
  Folder,
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

interface FileStatus {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  metrics?: AudioMetrics;
  error?: string;
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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function App() {
  const [isIntelligentModel, setIsIntelligentModel] = useState(false);
  const [audioFiles, setAudioFiles] = useState<FileStatus[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTranscription, setShowTranscription] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const processBatch = async (files: File[], startIndex: number) => {
    const batchSize = 100;
    const endIndex = Math.min(startIndex + batchSize, files.length);
    const currentBatch = files.slice(startIndex, endIndex);

    for (const file of currentBatch) {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('isIntelligent', isIntelligentModel.toString());

      setAudioFiles(prev => prev.map(f => 
        f.name === file.name ? { ...f, status: 'processing' } : f
      ));

      try {
        const response = await fetch('http://127.0.0.1:5000/analyze', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        setAudioFiles(prev => prev.map(f => 
          f.name === file.name ? { ...f, status: 'completed', metrics: data } : f
        ));
      } catch (error) {
        setAudioFiles(prev => prev.map(f => 
          f.name === file.name ? { ...f, status: 'error', error: error.message } : f
        ));
      }

      await delay(1000); // Wait 1 second between requests
    }

    if (endIndex < files.length) {
      await processBatch(files, endIndex);
    } else {
      setIsProcessing(false);
    }
  };

  const handleDirectoryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setAudioFiles(files.map(file => ({
      name: file.name,
      status: 'pending'
    })));

    try {
      await processBatch(files, 0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (file: FileStatus) => {
    if (file.status === 'completed') {
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setAudioFiles(prev => prev.filter(f => f.name !== fileName));
    if (selectedFile?.name === fileName) {
      setSelectedFile(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#111827] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Call Analysis Dashboard</h1>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#1a2234] text-white border border-[#2a334a] transition-all cursor-pointer hover:bg-[#2a334a]">
              <Folder className="w-4 h-4" />
              <span>Upload Directory</span>
              <input
                ref={directoryInputRef}
                type="file"
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleDirectoryUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1a2234] rounded-xl p-6 shadow-lg border border-[#2a334a]">
            <h2 className="text-lg font-semibold text-white mb-4">Files ({audioFiles.length})</h2>
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
              {audioFiles.map((file) => (
                <div
                  key={file.name}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    file.status === 'completed' ? 'cursor-pointer ' : 'cursor-default opacity-70'
                  } ${
                    selectedFile?.name === file.name ? 'bg-[#2a334a]' : 'hover:bg-[#2a334a]'
                  } transition-all`}
                  onClick={() => file.status === 'completed' && handleFileSelect(file)}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-white truncate">{file.name}</span>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    {file.status === 'pending' && (
                      <span className="text-gray-400 text-sm">In Queue</span>
                    )}
                    {file.status === 'processing' && (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                        <span className="text-cyan-400 text-sm">Processing</span>
                      </div>
                    )}
                    {file.status === 'completed' && (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    )}
                    {file.status === 'error' && (
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 text-sm">Error</span>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(file.name);
                      }}
                      className="text-gray-400 hover:text-red-400 transition-colors ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            {selectedFile?.metrics ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    icon={Clock}
                    title="Call Duration"
                    value={`${selectedFile.metrics.duration.toFixed(2)}s`}
                    color="bg-blue-500"
                    onClick={() => setExpandedMetric(expandedMetric === 'duration' ? null : 'duration')}
                    isExpanded={expandedMetric === 'duration'}
                  />
                  <MetricCard
                    icon={Volume2}
                    title="Average Pitch"
                    value={`${selectedFile.metrics.averagePitch.toFixed(2)} Hz`}
                    color="bg-green-500"
                    onClick={() => setExpandedMetric(expandedMetric === 'pitch' ? null : 'pitch')}
                    isExpanded={expandedMetric === 'pitch'}
                  />
                  <MetricCard
                    icon={Waves}
                    title="Amplitude"
                    value={`${selectedFile.metrics.amplitude.toFixed(2)} dB`}
                    color="bg-purple-500"
                    onClick={() => setExpandedMetric(expandedMetric === 'amplitude' ? null : 'amplitude')}
                    isExpanded={expandedMetric === 'amplitude'}
                  />
                  <MetricCard
                    icon={Activity}
                    title="Signal Energy"
                    value={selectedFile.metrics.signalEnergy.toFixed(2)}
                    color="bg-red-500"
                    onClick={() => setExpandedMetric(expandedMetric === 'energy' ? null : 'energy')}
                    isExpanded={expandedMetric === 'energy'}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#1a2234] rounded-xl p-6 shadow-lg border border-[#2a334a]">
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare className="w-6 h-6 text-cyan-400" />
                      <h2 className="text-lg font-semibold text-white">Speech Analysis</h2>
                    </div>
                    <div className="space-y-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                      {selectedFile.metrics.geminiAnalysis?.['Speech Analysis'] && 
                        Object.entries(selectedFile.metrics.geminiAnalysis['Speech Analysis']).map(([key, value]) => (
                          <div key={key} className="border-b border-[#2a334a] pb-4 last:border-b-0">
                            <h3 className="text-cyan-400 font-medium mb-2">{key}</h3>
                            <p className="text-gray-300">{value as string}</p>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  <div className="bg-[#1a2234] rounded-xl p-6 shadow-lg border border-[#2a334a]">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-6 h-6 text-cyan-400" />
                      <h2 className="text-lg font-semibold text-white">Classification</h2>
                    </div>
                    <div className="space-y-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                      {selectedFile.metrics.geminiAnalysis?.['Success Classification'] && (
                        <>
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-lg font-medium text-white">Status:</span>
                            {selectedFile.metrics.geminiAnalysis['Success Classification'].Successful ? (
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
                          {!selectedFile.metrics.geminiAnalysis['Success Classification'].Successful && (
                            <div className="border-t border-[#2a334a] pt-4">
                              <h3 className="text-cyan-400 font-medium mb-2">Classification Type</h3>
                              <p className="text-gray-300">
                                {selectedFile.metrics.geminiAnalysis['Success Classification']['Unsuccessful Classification']}
                              </p>
                            </div>
                          )}
                          <div className="border-t border-[#2a334a] pt-4">
                            <h3 className="text-cyan-400 font-medium mb-2">Reasons</h3>
                            <p className="text-gray-300">
                              {selectedFile.metrics.geminiAnalysis['Success Classification'].Reasons}
                            </p>
                          </div>
                          <div className="border-t border-[#2a334a] pt-4">
                            <h3 className="text-cyan-400 font-medium mb-2">Relevant Quotes</h3>
                            <p className="text-gray-300 font-urdu">
                              {selectedFile.metrics.geminiAnalysis['Success Classification']['Relevant Quotes']}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedFile.metrics.geminiAnalysis?.['Unsuccessful Call Explanation'] && (
                    <div className="bg-[#1a2234] rounded-xl p-6 shadow-lg border border-[#2a334a]">
                      <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-6 h-6 text-yellow-400" />
                        <h2 className="text-lg font-semibold text-white">Unsuccessful Call Explanation</h2>
                      </div>
                      <div className="space-y-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                        <div>
                          <h3 className="text-cyan-400 font-medium mb-2">Explanation</h3>
                          <p className="text-gray-300">
                            {selectedFile.metrics.geminiAnalysis['Unsuccessful Call Explanation'].Explanation}
                          </p>
                        </div>
                        <div className="border-t border-[#2a334a] pt-4">
                          <h3 className="text-cyan-400 font-medium mb-2">Supporting Quotes</h3>
                          <p className="text-gray-300 font-urdu">
                            {selectedFile.metrics.geminiAnalysis['Unsuccessful Call Explanation']['Relevant Quotes']}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-[#1a2234] rounded-xl p-6 shadow-lg border border-[#2a334a] col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart2 className="w-6 h-6 text-cyan-400" />
                      <h2 className="text-lg font-semibold text-white">Detailed Evaluation with Scores</h2>
                    </div>
                    <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                      {selectedFile.metrics.geminiAnalysis?.['Detailed Evaluation with Scores'] && (
                        <>
                          {Object.entries(selectedFile.metrics.geminiAnalysis['Detailed Evaluation with Scores']).map(
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

                  <div className="bg-[#1a2234] rounded-xl p-6 shadow-lg border border-[#2a334a] col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-6 h-6 text-cyan-400" />
                      <h2 className="text-lg font-semibold text-white">Critical Compliance Check</h2>
                    </div>
                    <div className="space-y-4">
                      {selectedFile.metrics.geminiAnalysis?.['Critical Compliance Check'] && (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg text-cyan-400 font-medium">Compliance Score</h3>
                            <span className={`text-lg font-bold ${getScoreColor(
                              selectedFile.metrics.geminiAnalysis['Critical Compliance Check'].Score,
                              100
                            )}`}>
                              {selectedFile.metrics.geminiAnalysis['Critical Compliance Check'].Score}/100
                            </span>
                          </div>
                          <div className="border-t border-[#2a334a] pt-4">
                            <h3 className="text-cyan-400 font-medium mb-2">Feedback</h3>
                            <p className="text-gray-300 whitespace-pre-line">
                              {selectedFile.metrics.geminiAnalysis['Critical Compliance Check'].Feedback}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#1a2234] rounded-xl p-6 shadow-lg border border-[#2a334a] flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Select a processed file to view analysis</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;