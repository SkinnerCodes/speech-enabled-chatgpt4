# Speech-enabled-chatgpt4

This script utilizes OpenAI's text to speech and speech to text capabilites to allow you to interact with your gpt4 assistant using voice. In the script, a Mandarin Tutor is initiated but you replace that to be any type of assistant

## Requirements

- Node.js 18+ installed on your machine.
- OpenAI API key with credits for TTS and STT
- dotenv, openai, readline, node-record-lpcm16, play-sound, fs, and path Node.js packages installed.

## Setup

1. Install Node.js: Ensure Node.js is installed on your system and install dependencies with `npm i`

2. Create a .env File: In your project's root directory, create a .env file and add your OpenAI API key:

```plaintext 
OPENAI_API_KEY=your_api_key_here
```

## Using the Script

1. Start the Script: Run the script using Node.js:

```bash 
node index.mjs
```

2. Record Audio: Speak into your microphone. When you're finished, press Enter to stop recording.

3. Transcription and Response: The script will transcribe your audio input and send it to chatgpt4. Wait for the assistant's response.

4. Hear the Response: The tutor's response will be read out loud using text-to-speech.

5. Repeat or Exit: Continue speaking and listening to responses, or type 'exit' and press Enter to quit the application.
