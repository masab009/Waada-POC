import os
from pydub.utils import mediainfo
from pydub import AudioSegment

# Define directories containing audio files
directories = [
    r"/home/badquant/Downloads/Waada.pk project/drive-download-20241222T033936Z-001/Telenor Sales Call Recordings",
    r"/home/badquant/Downloads/Waada.pk project/drive-download-20241222T033936Z-001/Telenor Errors Call Recordings/Telenor Call again",
    r"/home/badquant/Downloads/Waada.pk project/drive-download-20241222T033936Z-001/Telenor Errors Call Recordings/Telenor Rejected Calls"
]

def get_audio_length(file_path):
    """Returns the duration of the audio file in seconds."""
    try:
        audio = AudioSegment.from_file(file_path)
        return len(audio) / 1000  # Convert milliseconds to seconds
    except Exception as e:
        print(f"Error processing file {file_path}: {e}")
        return None

def calculate_average_audio_length(directories):
    total_length = 0
    file_count = 0

    for directory in directories:
        for root, _, files in os.walk(directory):
            for file in files:
                if file.endswith((".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a")):  # Add extensions as needed
                    file_path = os.path.join(root, file)
                    length = get_audio_length(file_path)
                    if length is not None:
                        total_length += length
                        file_count += 1

    if file_count == 0:
        print("No audio files found.")
        return 0

    average_length = total_length / file_count
    return average_length, file_count

# Calculate and display the average audio length
average_length, file_count = calculate_average_audio_length(directories)
print(f"Processed {file_count} audio files.")
print(f"Average Audio Length: {average_length:.2f} seconds.")
