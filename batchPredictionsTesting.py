import os
import json
import time
import logging
from google.cloud import storage
import vertexai
from vertexai.batch_prediction import BatchPredictionJob
from vertexai.generative_models import GenerativeModel, GenerationConfig

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set up Vertex AI
PROJECT_ID = "tonal-topic-448519-m2"
LOCATION = "asia-south1"
vertexai.init(project=PROJECT_ID, location=LOCATION)

# Cloud Storage bucket details
BUCKET_NAME = "waada_bucket"
AUDIO_FOLDER = "Waada dataset/"
REQUESTS_FOLDER = "Waada_req/requests/"
OUTPUT_URI = "gs://waada_bucket/model_output"

# Gemini model and output schema
MODEL_ID = "gemini-1.5-flash-002"
OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "Transcriptions": {"type": "string"},
        "SpeechAnalysis": {
            "type": "object",
            "properties": {
                "ArticulationClarity": {"type": "string"},
                "SpeakingPace": {"type": "string"},
                "Tone": {"type": "string"}
            },
            "required": ["ArticulationClarity", "SpeakingPace", "Tone"]
        },
        "SuccessClassification": {
            "type": "object",
            "properties": {
                "Successful": {"type": "boolean"},
                "Reasons": {"type": "string"},
                "RelevantQuotes": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["Successful", "Reasons", "RelevantQuotes"]
        },
        "EvaluationScores": {
            "type": "object",
            "properties": {
                "GreetingPersonalization": {
                    "type": "object",
                    "properties": {
                        "Score": {"type": "integer"},
                        "Feedback": {"type": "string"},
                        "Suggestions": {"type": "string"}
                    },
                    "required": ["Score", "Feedback", "Suggestions"]
                },
                "LanguageClarity": {
                    "type": "object",
                    "properties": {
                        "Score": {"type": "integer"},
                        "Feedback": {"type": "string"},
                        "Suggestions": {"type": "string"}
                    },
                    "required": ["Score", "Feedback", "Suggestions"]
                },
                "ProductProcesses": {
                    "type": "object",
                    "properties": {
                        "Score": {"type": "integer"},
                        "Feedback": {"type": "string"},
                        "Suggestions": {"type": "string"}
                    },
                    "required": ["Score", "Feedback", "Suggestions"]
                },
                "PricingActivation": {
                    "type": "object",
                    "properties": {
                        "Score": {"type": "integer"},
                        "Feedback": {"type": "string"},
                        "Suggestions": {"type": "string"}
                    },
                    "required": ["Score", "Feedback", "Suggestions"]
                }
            }
        },
        "CriticalComplianceCheck": {
            "type": "object",
            "properties": {
                "ComplianceScore": {"type": "integer"},
                "ComprehensiveFeedback": {"type": "string"}
            },
            "required": ["ComplianceScore", "ComprehensiveFeedback"]
        }
    },
    "required": ["Transcriptions", "SpeechAnalysis", "SuccessClassification", "CriticalComplianceCheck"]
}

model = GenerativeModel(
    MODEL_ID,
    generation_config=GenerationConfig(
        response_mime_type="application/json",
        response_schema=OUTPUT_SCHEMA
    )
)

def list_audio_files(bucket_name, folder):
    client = storage.Client(project=PROJECT_ID)
    bucket = client.bucket(bucket_name)
    blobs = bucket.list_blobs(prefix=folder)
    audio_files = [f"gs://{bucket_name}/{blob.name}" for blob in blobs if blob.name.lower().endswith('.mp3')]
    logger.info(f"Found {len(audio_files)} audio files.")
    return audio_files

def create_jsonl_request_entry(gcs_audio_uri):
    entry = {
        "request": {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": """
                            Audio Analyses request
## Primary Task
Please analyze the provided audio conversation between an insurance service employee and customer in Urdu.
Provide a comprehensive evaluation based on the following components:

## Required Outputs
1. Transcriptions
- Provide a complete transcription of the conversation in Urdu.

2. Speech Analysis
- Evaluate articulation clarity.
- Assess the speaking pace of the employee.
- Evaluate the tone of the employee.

3. Success Classification
- Clearly state whether the call was successful or unsuccessful.
- Provide specific reasons for this classification.
- Include relevant quotes from the conversation to support your conclusion.

## Detailed Evaluation Criteria
### 1. Greeting & Personalization (score out of 10%)
- Opening script adherence.
- Customer name usage frequency.
- Tone assessment.
- Communication consent verification.
- **Suggestions for Improvement:** Provide specific suggestions to improve the greeting and personalization(give examples in Roman Urdu).

### 2. Language Clarity (score out of 20%)
- Professional conduct evaluation.
- Speech clarity assessment.
- Language consistency check.
- **Suggestions for Improvement:** Provide specific suggestions to improve language clarity(give examples in Roman Urdu).

### 3. Resolution Attributes (score out of 70%)
#### Product & Processes (score out of 30%)
- Product information accuracy.
- Terms and conditions clarity.
- Deactivation process explanation.
- Query response completeness.
- Product understanding verification.
- Claims process explanation.
- **Suggestions for Improvement:** Provide specific suggestions to improve explanations related to products and processes(give examples in Roman Urdu).

#### Pricing & Activation (score out of 40%)
- Price point clarity.
- Charge frequency communication.
- Balance deduction explanation.
- Customer acknowledgment verification.
- Pricing consent confirmation.
- **Suggestions for Improvement:** Provide specific suggestions to improve communication regarding pricing and activation(give examples in Roman Urdu).

### Critical Compliance Check
Evaluate the overall compliance of the call, considering:
- Proper consent verification.
- Absence of deceptive practices.
- Activation process compliance.
- Point deduction tracking (-100 for missing consent).

Provide a single compliance score (0-100) and comprehensive feedback summarizing all compliance aspects.

## Special Instructions
Please prioritize providing **specific and actionable suggestions for improvement** in each section. Highlight areas where the employee could have said or done something differently to achieve a better outcome.

Please provide your analysis in a structured JSON format as specified in the schema
                            """},
                        {"file_data": {"file_uri": gcs_audio_uri, "mime_type": "audio/.mp3"}}
                    ]
                }
            ]
        }
    }
    return entry

def generate_jsonl_file(jsonl_entries, output_file_path):
    with open(output_file_path, 'w', encoding='utf-8') as f:
        for entry in jsonl_entries:
            json_line = json.dumps(entry, ensure_ascii=False)
            f.write(json_line + "\n")
    logger.info(f"JSONL file created at {output_file_path}")

def upload_file_to_gcs(local_file, bucket_name, destination_blob_name):
    client = storage.Client(project=PROJECT_ID)
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)
    blob.upload_from_filename(local_file)
    logger.info(f"Uploaded {local_file} to gs://{bucket_name}/{destination_blob_name}")

def run_batch_prediction(input_uri):
    try:
        batch_prediction_job = BatchPredictionJob.submit(
            source_model=MODEL_ID,
            input_dataset=input_uri,
            output_uri_prefix=OUTPUT_URI,
        )

        logger.info(f"Job resource name: {batch_prediction_job.resource_name}")
        logger.info(f"Model resource name with the job: {batch_prediction_job.model_name}")
        logger.info(f"Job state: {batch_prediction_job.state.name}")

        while not batch_prediction_job.has_ended:
            time.sleep(5)
            batch_prediction_job.refresh()

        if batch_prediction_job.has_succeeded:
            logger.info("Batch prediction job succeeded!")
        else:
            logger.error(f"Batch prediction job failed: {batch_prediction_job.error}")

        logger.info(f"Job output location: {batch_prediction_job.output_location}")
        return batch_prediction_job.output_location

    except Exception as e:
        logger.error(f"Error during batch prediction: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    audio_files = list_audio_files(BUCKET_NAME, AUDIO_FOLDER)
    jsonl_entries = [create_jsonl_request_entry(uri) for uri in audio_files]

    local_jsonl_file = "batch_requests.jsonl"
    generate_jsonl_file(jsonl_entries, local_jsonl_file)

    destination_blob = os.path.join(REQUESTS_FOLDER, os.path.basename(local_jsonl_file))
    upload_file_to_gcs(local_jsonl_file, BUCKET_NAME, destination_blob)

    input_uri = f"gs://{BUCKET_NAME}/{destination_blob}"
    output_location = run_batch_prediction(input_uri)

    logger.info(f"Final Batch Prediction Output Location: {output_location}")
