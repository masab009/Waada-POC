from google.cloud import storage

# Initialize the client
client = storage.Client()

# Bucket and folder details
bucket_name = "waada_bucket"
output_folder = "model_output/"

# Get the bucket
bucket = client.bucket(bucket_name)

# List all blobs in the output folder
blobs = bucket.list_blobs(prefix=output_folder)

# Filter folders with predictions.jsonl
prediction_files = [
    blob for blob in blobs if blob.name.endswith("predictions.jsonl")
]

# If there are no prediction files found
if not prediction_files:
    print("No prediction files found.")
else:
    # Sort files by timestamp (folder names contain the timestamp)
    latest_file = sorted(
        prediction_files,
        key=lambda x: x.name,
        reverse=True
    )[0]

    # Download the latest file
    local_filename = "latest_predictions.jsonl"
    latest_file.download_to_filename(local_filename)

    print(f"Downloaded the latest prediction file to {local_filename}")
