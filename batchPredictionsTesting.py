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
PROJECT_ID = "tonal-topic-448519-m2"  # Replace with your project ID
LOCATION = "asia-south1"  # Replace with your preferred location
vertexai.init(project=PROJECT_ID, location=LOCATION)

# Set up your Cloud Storage bucket details
BUCKET_NAME = "waada_bucket"
AUDIO_FOLDER = "Waada dataset/"  # Folder where your audio files are stored
REQUESTS_FOLDER = "Waada_req/requests/"  # Folder to store the generated JSONL file
OUTPUT_URI = "gs://waada_bucket/model_output"  # Replace with your output bucket path

# Gemini model and prompt details
MODEL_ID = "gemini-1.5-flash-001"
OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "Transcriptions": {"type": "string"},
        "Speech Analysis": {
            "type": "object",
            "properties": {
                "Articulation Clarity": {"type": "string"},
                "Speaking Pace": {"type": "string"},
                "Tone": {"type": "string"},
            },
        },
        "Success Classification": {
            "type": "object",
            "properties": {
                "Successful": {"type": "boolean"},
                "Reasons": {"type": "string"},
                "Relevant Quotes": {"type": "string"},
            },
        },
        "Detailed Evaluation with Scores": {
            "type": "object",
            "properties": {
                "Greeting & Personalization": {
                    "type": "object",
                    "properties": {
                        "Score": {"type": "integer"},
                        "Feedback": {"type": "string"},
                        "Suggestions for Improvement": {"type": "string"},
                    },
                },
                "Language Clarity": {
                    "type": "object",
                    "properties": {
                        "Score": {"type": "integer"},
                        "Feedback": {"type": "string"},
                        "Suggestions for Improvement": {"type": "string"},
                    },
                },
                "Product & Processes": {
                    "type": "object",
                    "properties": {
                        "Score": {"type": "integer"},
                        "Feedback": {"type": "string"},
                        "Suggestions for Improvement": {"type": "string"},
                    },
                },
                "Pricing & Activation": {
                    "type": "object",
                    "properties": {
                        "Score": {"type": "integer"},
                        "Feedback": {"type": "string"},
                        "Suggestions for Improvement": {"type": "string"},
                    },
                },
            },
        },
        "Critical Compliance Check": {
            "type": "object",
            "properties": {
                "Score": {"type": "integer"},
                "Feedback": {"type": "string"},
            },
        },
    },
    "required": ["Transcriptions", "Speech Analysis", "Success Classification"],
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
                        {"text": "Please transcribe and analyze this audio."},
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
