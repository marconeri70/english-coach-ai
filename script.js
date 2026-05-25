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

  const voices = speechSynthesis.getVoices();

  const preferredVoice =
    voices.find(v =>
      v.lang.includes("it") &&
      (
        v.name.includes("Google") ||
        v.name.includes("Natural") ||
        v.name.includes("Enhanced")
      )
    ) || voices.find(v => v.lang.includes("it"));

  if(preferredVoice){
    speech.voice = preferredVoice;
  }

  speechSynthesis.speak(speech);
}

function startVoiceInput(){
  if(!("webkitSpeechRecognition" in window)){
    alert("Il riconoscimento vocale non è supportato da questo browser. Usa Chrome.");
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

    recognition.onerror = function(){
      alert("Errore microfono. Controlla i permessi.");
    };

    recognition.onend = function(){
      isListening = false;
      const micBtn = document.getElementById("micBtn");
      if(micBtn) micBtn.innerText = "🎤 Parla";
    };
  }

  if(!isListening){
    isListening = true;
    const micBtn = document.getElementById("micBtn");
    if(micBtn) micBtn.innerText = "🛑 Ascolto...";
    recognition.start();
  }
}

async function sendMessage(){
  const input = document.getElementById("userInput");
  const chatBox = document.getElementById("chatBox");
  const text = input.value.trim();

  if(!text) return;

  messageCounter++;
  const loadingId = "loadingMessage_" + messageCounter;

  chatBox.innerHTML += `
    <div class="message user">
      ${text}
    </div>
  `;

  input.value = "";

  chatBox.innerHTML += `
    <div class="message ai" id="${loadingId}">
      🤖 AI is thinking...
    </div>
  `;

  chatBox.scrollTop = chatBox.scrollHeight;

  try{
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        history: conversationHistory
      })
    });

    const data = await response.json();

    const loadingMessage = document.getElementById(loadingId);
    const reply = data.reply || "Errore nella risposta AI.";

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
      conversationHistory = conversationHistory.slice(-12);
    }

    speakText(reply);

  }catch(error){
    const loadingMessage = document.getElementById(loadingId);

    loadingMessage.innerHTML = `
      Errore di collegamento con l'AI.<br>
      Controlla il Worker Cloudflare.
    `;
  }

  chatBox.scrollTop = chatBox.scrollHeight;
}

if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("service-worker.js");
  });
}

window.speechSynthesis.onvoiceschanged = () => {
  speechSynthesis.getVoices();
};
