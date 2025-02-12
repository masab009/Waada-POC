from flask import Flask, request, jsonify
from flask_cors import CORS
import librosa
import numpy as np
import tempfile
import os
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig, Part
import json
import logging


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)


vertexai.init(project="tonal-topic-448519-m2", location="asia-south1")

response_schema = {
    "type": "object",
    "properties": {
        "Transcriptions": {"type": "string"},
        "Speech Analysis": {
            "type": "object",
            "properties": {
                "Articulation Clarity": {"type": "string"},
                "Speaking Pace": {"type": "string"},
                "Tone": {"type": "string"}
            },
            "required": ["Articulation Clarity", "Speaking Pace", "Tone"]
        },
        "Success Classification": {
            "type": "object",
            "properties": {
                "Successful": {"type": "boolean"},
                "Reasons": {"type": "string"},
                "Relevant Quotes": {"type": "string"},
                "Unsuccessful Classification": {
                    "type": "string",
                    "enum": ["Callback", "Fraud", "None"]
                }
            },
            "required": ["Successful", "Reasons", "Relevant Quotes", "Unsuccessful Classification"]
        },
        "Unsuccessful Call Explanation": {
            "type": "object",
            "properties": {
                "Explanation": {
                    "type": "string",
                    "description": "Explanation for why the call was classified as either a 'Callback' or 'Fraud'. If the call was successful, return a default message."
                },
                "Relevant Quotes": {
                    "type": "string",
                    "description": "Key quotes from the conversation supporting the unsuccessful classification."
                }
            },
            "required": ["Explanation", "Relevant Quotes"]
        },
        "Detailed Evaluation with Scores": {
            "type": "object",
            "properties": {
                "Greeting & Personalization": {
                    "type": "object",
                    "properties": {
                        "Score": {"type": "number"},
                        "Feedback": {"type": "string"},
                        "Suggestions for Improvement": {"type": "string"}
                    },
                    "required": ["Score", "Feedback", "Suggestions for Improvement"]
                },
                "Language Clarity": {
                    "type": "object",
                    "properties": {
                        "Score": {"type": "number"},
                        "Feedback": {"type": "string"},
                        "Suggestions for Improvement": {"type": "string"}
                    },
                    "required": ["Score", "Feedback", "Suggestions for Improvement"]
                },
                "Product & Processes": {
                    "type": "object",
                    "properties": {
                        "Score": {"type": "number"},
                        "Feedback": {"type": "string"},
                        "Suggestions for Improvement": {"type": "string"}
                    },
                    "required": ["Score", "Feedback", "Suggestions for Improvement"]
                },
                "Pricing & Activation": {
                    "type": "object",
                    "properties": {
                        "Score": {"type": "number"},
                        "Feedback": {"type": "string"},
                        "Suggestions for Improvement": {"type": "string"}
                    },
                    "required": ["Score", "Feedback", "Suggestions for Improvement"]
                }
            },
            "required": ["Greeting & Personalization", "Language Clarity", "Product & Processes", "Pricing & Activation"]
        },
        "Critical Compliance Check": {
            "type": "object",
            "properties": {
                "Score": {"type": "number"},
                "Feedback": {"type": "string"}
            },
            "required": ["Score", "Feedback"]
        }
    },
    "required": ["Transcriptions", "Speech Analysis", "Success Classification", "Unsuccessful Call Explanation", "Detailed Evaluation with Scores", "Critical Compliance Check"]
}

generation_config = GenerationConfig(
    temperature=1,
    top_p=0.95,
    top_k=40,
    max_output_tokens=8192,
    response_mime_type="application/json",
    response_schema=response_schema
)

prompt = """
# Audio Analysis and Evaluation Request

## Primary Task
Please analyze the provided audio conversation between an insurance service employee and a customer in Urdu.
Provide a comprehensive evaluation based on the following components:

## Required Outputs

### 1. Transcriptions
- Provide a complete transcription of the conversation in Urdu.

### 2. Speech Analysis
- Evaluate articulation clarity.
- Assess the speaking pace of the employee.
- Evaluate the tone of the employee.

### 3. Success Classification
- Clearly state whether the call was **successful** or **unsuccessful**.
- Provide specific reasons for this classification.
- A call is succesful when the agent has managed to pursue the customer for the purchase of subscription
- Include relevant quotes from the conversation to support your conclusion.
- If the call is classified as **unsuccessful**, further categorize it into one of the following:
  - **Callback:** If there is a potential for the customer to call back.
  - **Fraud:** If the call appears to be fraudulent in nature.
  - **None:** If the call was a success

### 4. Unsuccessful Call Explanation
- If the call was classified as **unsuccessful**, provide an explanation for why it falls under the **"Callback"** or **"Fraud"** category.
- Include relevant quotes from the conversation to support this classification.
- If the call was **successful**, return the default response:  
  "The call was successful, so it is neither a callback nor a fraud."

## Detailed Evaluation Criteria

### 1. Greeting & Personalization (Score must be between **0 and 10**):
- Opening script adherence.(2 points)
- Customer name usage frequency.(3 points)
- Tone assessment.(5 points)
- **Suggestions for Improvement:** Provide specific suggestions to improve the greeting and personalization (give examples in Roman Urdu).

### 2. Language Clarity (Score must be between **0 and 20**)
- Professional conduct evaluation.(10 points)
- Speech clarity assessment.(5 points)
- Language consistency check. (5 points)
- **Suggestions for Improvement:** Provide specific suggestions to improve language clarity (give examples in Roman Urdu).

### 3. Resolution Attributes (score out of 70%)

#### Product & Processes (Score must be between **0 and 30**)
- Product information accuracy.(10 points)
- Terms and conditions clarity.(5 points)
- Deactivation process explanation.(2 points)
- Query response completeness.(3 points)
- Product understanding verification.(5 points)
- Claims process explanation.(5 points)
- **Suggestions for Improvement:** Provide specific suggestions to improve explanations related to products and processes (give examples in Roman Urdu).

#### Pricing & Activation (Score must be between **0 and 40**)
- Price point clarity.(8 points)
- Charge frequency communication. (8 points)
- Balance deduction explanation.(8 points)
- Customer acknowledgment verification.(8 points)
- Pricing consent confirmation.(8 points)
- **Suggestions for Improvement:** Provide specific suggestions to improve communication regarding pricing and activation (give examples in Roman Urdu).

### Critical Compliance Check (Score must be between **0 and 100**)
Evaluate the overall compliance of the call, considering:
- Proper consent verification.**(50 points)**
- Absence of deceptive practices. **(30 points)**
- Activation process compliance.**(10 points)**
- Point deduction tracking.**(10 points)**
- **If consent from the costumer is missing, auto-assign score: 0**

## Special Instructions
Please prioritize providing **specific and actionable suggestions for improvement** in each section. Highlight areas where the employee could have said or done something differently to achieve a better outcome.

Please provide your analysis in a structured JSON format as specified in the schema.
"""
MODELID = "gemini-1.5-flash-002"
model = GenerativeModel(MODELID)

def analyze_audio(file_path):
    y, sr = librosa.load(file_path)
    duration = librosa.get_duration(y=y, sr=sr)
    
    pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
    pitch_values = []
    for t in range(pitches.shape[1]):
        index = magnitudes[:, t].argmax()
        pitch_values.append(pitches[index, t])
    average_pitch = np.mean([p for p in pitch_values if p > 0])
    
    amplitude_values = librosa.amplitude_to_db(np.abs(librosa.stft(y)), ref=np.max)
    average_amplitude = np.mean(amplitude_values)
    
    energy_values = librosa.feature.rms(y=y)[0]
    average_energy = np.mean(energy_values)
    
    num_points = 100
    timestamps = np.linspace(0, duration, num_points)
    
    pitch_series = np.interp(
        timestamps,
        np.linspace(0, duration, len(pitch_values)),
        pitch_values
    )
    
    amplitude_series = np.interp(
        timestamps,
        np.linspace(0, duration, amplitude_values.shape[1]),
        np.mean(amplitude_values, axis=0)
    )
    
    energy_series = np.interp(
        timestamps,
        np.linspace(0, duration, len(energy_values)),
        energy_values
    )
    
    return {
        "duration": duration,
        "averagePitch": float(average_pitch),
        "amplitude": float(average_amplitude),
        "signalEnergy": float(average_energy),
        "timeData": {
            "pitch": pitch_series.tolist(),
            "amplitude": amplitude_series.tolist(),
            "energy": energy_series.tolist(),
            "timestamps": timestamps.tolist()
        }
    }

def get_gemini_analysis(file_path):
    try:
        logger.info("Starting Gemini analysis for file: %s", file_path)
        
        with open(file_path, 'rb') as audio_file:
            audio_bytes = audio_file.read()
        
        audio_part = Part.from_data(data=audio_bytes, mime_type="audio/mp3")
        
        logger.info("Sending request to Gemini API")
        logger.info(f"Using the model {MODELID}")
        response = model.generate_content(
            [prompt, audio_part],
            generation_config=generation_config
        )
        
        logger.info("Raw Gemini response:")
        logger.info(response.text)
        
        try:
            parsed_json = json.loads(response.text)
            logger.info("Successfully parsed JSON response")
            return parsed_json
        except json.JSONDecodeError as e:
            logger.error("Failed to parse JSON response: %s", str(e))
            return create_default_response(f"JSON parsing error: {str(e)}")
            
    except Exception as e:
        logger.error("Error in Gemini analysis: %s", str(e))
        return create_default_response(str(e))

def create_default_response(error_message):
    return {
        "Transcriptions": "Transcription not available due to error",
        "Speech Analysis": {
            "Articulation Clarity": f"Analysis not available: {error_message}",
            "Speaking Pace": "Analysis not available",
            "Tone": "Analysis not available"
        },
        "Success Classification": {
            "Successful": False,
            "Reasons": "Unable to analyze",
            "Relevant Quotes": "No quotes available",
            "Unsuccessful Classification": "None"
        },
        "Unsuccessful Call Explanation": {
            "Explanation": "Analysis failed",
            "Relevant Quotes": "No quotes available"
        },
        "Detailed Evaluation with Scores": {
            "Greeting & Personalization": {
                "Score": 0,
                "Feedback": f"Analysis failed: {error_message}",
                "Suggestions for Improvement": "No suggestions available"
            },
            "Language Clarity": {
                "Score": 0,
                "Feedback": f"Analysis failed: {error_message}",
                "Suggestions for Improvement": "No suggestions available"
            },
            "Product & Processes": {
                "Score": 0,
                "Feedback": f"Analysis failed: {error_message}",
                "Suggestions for Improvement": "No suggestions available"
            },
            "Pricing & Activation": {
                "Score": 0,
                "Feedback": f"Analysis failed: {error_message}",
                "Suggestions for Improvement": "No suggestions available"
            }
        },
        "Critical Compliance Check": {
            "Score": 0,
            "Feedback": f"Analysis failed: {error_message}"
        }
    }

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'audio' not in request.files:
        logger.error("No audio file provided")
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    logger.info("Received audio file: %s", audio_file.filename)
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
        audio_file.save(temp_file.name)
        try:
            audio_metrics = analyze_audio(temp_file.name)
            logger.info("Getting Gemini analysis")
            gemini_analysis = get_gemini_analysis(temp_file.name)
            
            results = {
                **audio_metrics,
                "geminiAnalysis": gemini_analysis
            }

            logger.info("Analysis complete, sending response")
            os.unlink(temp_file.name)
            return jsonify(results)
        except Exception as e:
            logger.error("Error during analysis: %s", str(e))
            os.unlink(temp_file.name)
            return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000,debug=True)