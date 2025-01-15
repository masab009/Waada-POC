from flask import Flask, request, jsonify
from flask_cors import CORS
import librosa
import numpy as np
import tempfile
import os
import google.generativeai as genai
import json
import logging
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configure Gemini API
genai.configure(api_key="AIzaSyA_RSyUS3NkTeOEaQIXTk0tdMNYfDBXyaY")

# Configuration for the generative model
generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "application/json"
}

model = genai.GenerativeModel(
    model_name="gemini-1.5-pro-002",
    generation_config=generation_config,
)

def analyze_audio(file_path):
    # Original audio analysis code remains the same
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

def clean_json_string(text):
    """Clean and validate JSON string from Gemini response."""
    try:
        # First try to parse the text directly as it might already be valid JSON
        try:
            parsed = json.loads(text)
            logger.info("Successfully parsed raw response as JSON")
            return parsed
        except json.JSONDecodeError:
            logger.info("Raw response is not valid JSON, attempting to clean")
        
        # Find the first occurrence of a JSON-like structure
        json_match = re.search(r'({[\s\S]*})', text)
        if not json_match:
            logger.error("No JSON structure found in text")
            return None
        
        json_str = json_match.group(1)
        
        # Remove any trailing commas before closing braces/brackets
        json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
        
        # Fix any double quotes within double quotes
        json_str = re.sub(r'(?<!\\)"(?=.*".*})', r'\"', json_str)
        
        # Remove any non-JSON content
        json_str = re.sub(r'[^\x20-\x7E]', '', json_str)
        
        # Try to parse the cleaned JSON
        try:
            parsed = json.loads(json_str)
            logger.info("Successfully parsed cleaned JSON")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse cleaned JSON: {str(e)}")
            # Try one more time with a more aggressive cleaning
            json_str = re.sub(r'[^{}[\]",.:\d\w\s-]', '', json_str)
            parsed = json.loads(json_str)
            logger.info("Successfully parsed aggressively cleaned JSON")
        
        # Verify required keys are present
        required_keys = ['Speech Analysis', 'Success Classification', 'Detailed Evaluation with Scores']
        if not all(key in parsed for key in required_keys):
            logger.error("Missing required keys in JSON structure")
            return None
            
        return parsed
    except Exception as e:
        logger.error(f"Error cleaning JSON string: {str(e)}")
        return None

def get_gemini_analysis(file_path):
    try:
        logger.info("Starting Gemini analysis for file: %s", file_path)
        uploaded_file = genai.upload_file(file_path, mime_type="audio/mp3")
        
        prompt = """
Audio Analysis and Evaluation Request
## Primary Task
Please analyze the provided audio conversation between an insurance service employee and customer in Urdu. 
Provide a comprehensive evaluation based on the following components:
## Required Outputs
1. Analysis
- analyze the call thoroughly
2. Speech Analysis
- Evaluate articulation clarity.
- Assess speaking pace of the employee.
- Evaluate tone of the employee.
3. Success Classification
- Clearly state whether the call was successful or unsuccessful.
- Provide specific reasons for this classification.
- Include relevant quotes from the conversation to support your conclusion.
## Detailed Evaluation Criteria
### 1. Greeting & Personalization (10%)
- Opening script adherence
- Customer name usage frequency
- Tone assessment
- Communication consent verification
### 2. Language Clarity (20%)
- Professional conduct evaluation
- Speech clarity assessment
- Language consistency check
### 3. Resolution Attributes (70%)
#### Product & Processes (30%)
- Product information accuracy
- Terms and conditions clarity
- Deactivation process explanation
- Query response completeness
- Product understanding verification
- Claims process explanation
#### Pricing & Activation (40%)
- Price point clarity
- Charge frequency communication
- Balance deduction explanation
- Customer acknowledgment verification
- Pricing consent confirmation
### Critical Compliance Check
*Fatal Error Criteria:*
- Consent verification
- Check for forced or deceptive practices
- Activation compliance
- Point deduction tracking (-100 for missing consent)
## for each and every section create a separate section  and clearly mention the section name with its headings,
there should be three sections Speech analysis, success classification, and Detailed Evaluation with scores
IMPORTANT: Format your response as a JSON object with the following structure:
        {
            "Speech Analysis": {
                "Articulation Clarity": "description",
                "Speaking Pace": "description",
                "Tone": "description"
            },
            "Success Classification": {
                "Successful": true/false,
                "Reasons": "explanation",
                "Relevant Quotes": "quotes from conversation"
            },
            "Detailed Evaluation with Scores": {
                "Category n": {
                    "Score": number,
                    "Feedback": "detailed feedback"
                }
            }
        }

CRITICAL: Return ONLY a valid JSON object. Do not include any text before or after the JSON structure.
"""
        
        logger.info("Sending request to Gemini API")
        chat = model.start_chat(history=[])
        response = chat.send_message([uploaded_file, prompt])
        
        logger.info("Raw Gemini response:")
        logger.info(response.text)
        
        # Clean and parse the JSON response
        parsed_json = clean_json_string(response.text)
        
        if parsed_json:
            logger.info("Successfully parsed JSON:")
            logger.info(json.dumps(parsed_json, indent=2))
            return parsed_json
        else:
            logger.error("Failed to parse valid JSON from response")
            return create_default_response("Invalid JSON structure in response")
            
    except Exception as e:
        logger.error("Error in Gemini analysis: %s", str(e))
        return create_default_response(str(e))

def create_default_response(error_message):
    return {
        "Speech Analysis": {
            "Articulation Clarity": f"Analysis not available: {error_message}",
            "Speaking Pace": "Analysis not available",
            "Tone": "Analysis not available"
        },
        "Success Classification": {
            "Successful": False,
            "Reasons": "Unable to analyze",
            "Relevant Quotes": "No quotes available"
        },
        "Detailed Evaluation with Scores": {
            "Overall": {
                "Score": 0,
                "Feedback": f"Analysis failed: {error_message}"
            }
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
            # Get basic audio metrics
            logger.info("Analyzing audio metrics")
            audio_metrics = analyze_audio(temp_file.name)
            
            # Get Gemini analysis
            logger.info("Getting Gemini analysis")
            gemini_analysis = get_gemini_analysis(temp_file.name)
            
            # Combine both results
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
    app.run(port=5000)