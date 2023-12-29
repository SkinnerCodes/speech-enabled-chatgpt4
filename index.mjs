import 'dotenv/config';
import OpenAI from 'openai';
import readline from 'readline';
import path from 'path';
import record from 'node-record-lpcm16';
import player from 'play-sound';
import fs from 'fs';

const openai = new OpenAI();
const audioPlayer = player();
const speechFile = path.resolve('./speech.mp3');
const audioFilePath = path.resolve('recording.wav');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAssistant() {
  const assistant = await openai.beta.assistants.create({
    name: "Mandarin Tutor API",
    instructions: "You are a personal mandarin tutor. You format your answers like you are talking in person, but no small talk. Don't ever use romantization of chinese words, always just the characters to refer to them. Your client knows english well and only knows mandarin at HSK 1 level. Begin every reponse with 你好, but make sure explanations are in english",
    //tools: [{ type: "code_interpreter" }],
    model: "gpt-4-1106-preview"
  });
  return assistant.id;
}

async function createThread() {
  const thread = await openai.beta.threads.create();
  return thread.id;
}

async function addMessageToThread(threadId, content) {
  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: content
  });
}

async function runAssistant(threadId, assistantId) {
  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: assistantId,
  });
  return run.id;
}

async function getAssistantResponse(threadId) {
  const messages = await openai.beta.threads.messages.list(threadId);
  //console.log(JSON.stringify(messages.body.data))
  const assistantMessages = messages.body.data.find(message => message.role === 'assistant')
  //console.log(JSON.stringify(assistantMessages))
  return assistantMessages.content[0].text.value;
}

async function waitForAssistantResponse(threadId, runId) {
  let completed = false;
  while (!completed) {
    const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    if (runStatus.status === 'completed') {
      completed = true;
    } else {
      await new Promise(resolve => setTimeout(resolve, 500)); // Poll every second
    }
  }
}


// Function to record audio from the microphone
function recordAudio() {
  console.log('Recording... Press Enter to stop.');

  const recorder = record.record({
    sampleRate: 16000,
    channels: 1,
    audioType: 'wav',
  });

  const recordingStream = recorder.stream().pipe(fs.createWriteStream(audioFilePath, {encoding: 'binary'}));

  return () => {
    recorder.stop();
    console.log('Recording stopped.');
  }
}

// Function to transcribe the recorded audio
async function transcribeAudio(filePath) {
  try {
    const audioFile = fs.createReadStream(filePath);

    const transcript = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      response_format: "text"
    });

    console.log('Transcription:', transcript);
    return transcript;
  } catch (error) {
    console.error('Error during transcription:', error);
  }
}

async function textToSpeech(inputText) {
  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "echo",
      input: inputText
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);

    return playSpeech(speechFile);
  } catch (error) {
    console.error(`Error during text-to-speech conversion: ${error}`);
    return () => {}
  }
}

function playSpeech(speechFile) {
  let childProcess = audioPlayer.play(speechFile, (err) => {
    if (err && err !== 1) console.error(`Could not play the file: ${err}`);
  });
  return () => childProcess.kill()
}

async function main() {
  const assistantId = await createAssistant();
  const threadId = await createThread();

  let recording = false;
  let stopRecording = () => {}
  let stopPlaying = () => {}
  let lineLock = false;

  rl.on('line', async (input) => {
    if (lineLock) return;
    lineLock = true;
    if (!recording) {
      stopPlaying()
      stopRecording = recordAudio();
      recording = true;
      lineLock = false;
      return;
    } else {
      stopRecording()
      recording = false;
    }
    if (input.toLowerCase() === 'exit') {
      console.log('Exiting...');
      rl.close();
      return;
    }

    let transcribeInput = await transcribeAudio(audioFilePath);
    await addMessageToThread(threadId, transcribeInput);
    const runId = await runAssistant(threadId, assistantId);
    await waitForAssistantResponse(threadId, runId);
    const response = await getAssistantResponse(threadId);
    console.log('Assistant:', response);
    stopPlaying = await textToSpeech(response);
    lineLock = false;
  });

  console.log('Type your message (or "exit" to quit):');
}

main();
