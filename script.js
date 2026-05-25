const WORKER_URL = "https://english-ai-worker.vocidicassino.workers.dev/";

let conversationHistory = [];
let recognition;
let isListening = false;
let messageCounter = 0;

function showPage(pageId){
  document.querySelectorAll(".page").forEach(page=>{
    page.classList.remove("active");
  });

  document.getElementById(pageId).classList.add("active");
}

function getCurrentLevel(){
  return document.getElementById("levelSelect").value;
}

function cleanForSpeech(text){
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\*/g, "")
    .replace(/_/g, "")
    .replace(/#/g, "")
    .replace(/`/g, "")
    .replace(/["“”]/g, "")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[.,;:!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function speakText(text){
  const cleanText = cleanForSpeech(text);

  speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(cleanText);

  speech.lang = "it-IT";
  speech.rate = 0.95;
  speech.pitch = 1;
  speech.volume = 1;

  speechSynthesis.speak(speech);
}

function speakEnglish(text){
  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = "en-US";
  speech.rate = 0.85;
  speech.pitch = 1;

  speechSynthesis.cancel();
  speechSynthesis.speak(speech);
}

function startVoiceInput(){
  if(!("webkitSpeechRecognition" in window)){
    alert("Usa Chrome.");
    return;
  }

  if(!recognition){
    recognition = new webkitSpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = function(event){
      const transcript = event.results[0][0].transcript;

      document.getElementById("userInput").value = transcript;

      sendMessage();
    };

    recognition.onend = function(){
      isListening = false;

      document.getElementById("micBtn").innerText =
        "🎤 Parla";
    };
  }

  if(!isListening){
    isListening = true;

    document.getElementById("micBtn").innerText =
      "🛑 Ascolto...";

    recognition.start();
  }
}

async function sendMessage(){

  const input =
    document.getElementById("userInput");

  const chatBox =
    document.getElementById("chatBox");

  const text = input.value.trim();

  if(!text) return;

  messageCounter++;

  const loadingId =
    "loading_" + messageCounter;

  chatBox.innerHTML += `
    <div class="message user">
      ${text}
    </div>
  `;

  input.value = "";

  chatBox.innerHTML += `
    <div class="message ai typing"
         id="${loadingId}">
      🤖 AI is thinking...
    </div>
  `;

  chatBox.scrollTop =
    chatBox.scrollHeight;

  try{

    const response =
      await fetch(WORKER_URL, {

      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        message: text,
        history: conversationHistory,
        level: getCurrentLevel()
      })
    });

    const data = await response.json();

    const loadingMessage =
      document.getElementById(loadingId);

    const reply =
      data.reply ||
      "Errore nella risposta AI.";

    loadingMessage.classList.remove("typing");

    loadingMessage.innerHTML = reply;

    conversationHistory.push({
      role: "user",
      content: text
    });

    conversationHistory.push({
      role: "assistant",
      content: reply
    });

    if(conversationHistory.length > 12){
      conversationHistory =
        conversationHistory.slice(-12);
    }

    speakText(reply);

  }catch(error){

    const loadingMessage =
      document.getElementById(loadingId);

    loadingMessage.innerHTML =
      "Errore collegamento AI.";
  }

  chatBox.scrollTop =
    chatBox.scrollHeight;
}

if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register(
      "service-worker.js"
    );
  });
}
