const WORKER_URL =
"https://english-ai-worker.vocidicassino.workers.dev/";

let conversationHistory = [];
let recognition;
let continuousMode = false;

let xp =
Number(localStorage.getItem("xp")) || 0;

updateXP();

function showPage(pageId){

  document.querySelectorAll(".page")
    .forEach(page=>{
      page.classList.remove("active");
    });

  document.getElementById(pageId)
    .classList.add("active");
}

function addXP(value){

  xp += value;

  localStorage.setItem("xp", xp);

  updateXP();
}

function updateXP(){

  document.getElementById("xpValue")
    .innerText = xp;

  let level = "Beginner";

  if(xp >= 100){
    level = "Intermediate";
  }

  if(xp >= 300){
    level = "Advanced";
  }

  document.getElementById("levelValue")
    .innerText = level;
}

function cleanForSpeech(text){

  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function speakText(text){

  const avatar =
    document.getElementById("avatar");

  avatar.classList.add("talking");

  const speech =
    new SpeechSynthesisUtterance(
      cleanForSpeech(text)
    );

  speech.lang = "it-IT";

  speech.rate = 0.95;

  speech.onend = ()=>{
    avatar.classList.remove("talking");
  };

  speechSynthesis.cancel();

  speechSynthesis.speak(speech);
}

async function sendMessage(textFromVoice = null){

  const input =
    document.getElementById("userInput");

  const chatBox =
    document.getElementById("chatBox");

  const text =
    textFromVoice || input.value.trim();

  if(!text) return;

  chatBox.innerHTML += `
    <div class="message user">
      ${text}
    </div>
  `;

  input.value = "";

  chatBox.innerHTML += `
    <div class="message ai typing"
         id="loading">
      🤖 AI is thinking...
    </div>
  `;

  chatBox.scrollTop =
    chatBox.scrollHeight;

  try{

    const response =
      await fetch(WORKER_URL, {

      method:"POST",

      headers:{
        "Content-Type":
          "application/json"
      },

      body:JSON.stringify({

        message:text,

        history:
          conversationHistory,

        level:
          document.getElementById(
            "levelSelect"
          ).value
      })
    });

    const data =
      await response.json();

    const reply =
      data.reply ||
      "Errore AI.";

    document.getElementById(
      "loading"
    ).outerHTML = `
      <div class="message ai">
        ${reply}
      </div>
    `;

    conversationHistory.push({
      role:"user",
      content:text
    });

    conversationHistory.push({
      role:"assistant",
      content:reply
    });

    if(conversationHistory.length > 12){
      conversationHistory =
        conversationHistory.slice(-12);
    }

    speakText(reply);

    addXP(10);

  }catch(error){

    document.getElementById(
      "loading"
    ).outerHTML = `
      <div class="message ai">
        Errore collegamento AI.
      </div>
    `;
  }

  chatBox.scrollTop =
    chatBox.scrollHeight;
}

async function generateQuiz(){

  const quizContainer =
    document.getElementById(
      "quizContainer"
    );

  quizContainer.innerHTML =
    "🤖 Generazione quiz...";

  try{

    const response =
      await fetch(WORKER_URL, {

      method:"POST",

      headers:{
        "Content-Type":
          "application/json"
      },

      body:JSON.stringify({

        message:
`Crea un mini quiz inglese
molto semplice con:
- domanda
- 3 risposte
- soluzione finale

in HTML semplice.`,

        history:[]
      })
    });

    const data =
      await response.json();

    quizContainer.innerHTML =
      data.reply;

  }catch(error){

    quizContainer.innerHTML =
      "Errore quiz.";
  }
}

function toggleContinuousConversation(){

  if(!("webkitSpeechRecognition" in window)){
    alert("Usa Chrome");
    return;
  }

  if(!recognition){

    recognition =
      new webkitSpeechRecognition();

    recognition.lang = "en-US";

    recognition.continuous = true;

    recognition.interimResults = false;

    recognition.onresult =
      function(event){

      const transcript =
        event.results[
          event.results.length -1
        ][0].transcript;

      sendMessage(transcript);
    };

    recognition.onend =
      function(){

      if(continuousMode){
        recognition.start();
      }
    };
  }

  continuousMode =
    !continuousMode;

  const micBtn =
    document.getElementById(
      "micBtn"
    );

  if(continuousMode){

    micBtn.innerText =
      "🛑 Stop Live";

    recognition.start();

  }else{

    micBtn.innerText =
      "🎤 Conversazione Live";

    recognition.stop();
  }
}

if("serviceWorker" in navigator){

  window.addEventListener(
    "load",
    ()=>{

      navigator
        .serviceWorker
        .register(
          "service-worker.js"
        );
    }
  );
}
