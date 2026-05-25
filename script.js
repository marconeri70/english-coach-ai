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
    document.getElementById("quizContainer");

  quizContainer.innerHTML =
    "🤖 Generazione quiz...";

  try{

    const response = await fetch(WORKER_URL, {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        message:
`Crea UN solo quiz di inglese livello A1.
Rispondi SOLO in JSON valido, senza markdown.

Formato obbligatorio:
{
  "question": "domanda",
  "answers": ["risposta 1", "risposta 2", "risposta 3"],
  "correct": "risposta corretta",
  "explanation": "spiegazione breve in italiano"
}

Non mostrare la soluzione nella domanda.`,
        history:[],
        level: document.getElementById("levelSelect")?.value || "A1"
      })
    });

    const data = await response.json();

    let quiz;

    try{
      quiz = JSON.parse(data.reply);
    }catch(e){
      quizContainer.innerHTML =
        "Errore nel formato del quiz. Premi di nuovo Genera Quiz.";
      return;
    }

    quizContainer.innerHTML = `
      <h3>Domanda:</h3>
      <p>${quiz.question}</p>

      <div class="quiz-options">
        ${quiz.answers.map(answer => `
          <button onclick="checkQuizAnswer(
            '${answer.replace(/'/g, "\\'")}',
            '${quiz.correct.replace(/'/g, "\\'")}',
            '${quiz.explanation.replace(/'/g, "\\'")}'
          )">
            ${answer}
          </button>
        `).join("")}
      </div>

      <div id="quizResult"></div>
    `;

  }catch(error){

    quizContainer.innerHTML =
      "Errore quiz.";
  }
}

function checkQuizAnswer(answer, correct, explanation){

  const result =
    document.getElementById("quizResult");

  if(answer === correct){

    result.innerHTML = `
      <div class="quiz-correct">
        ✅ Risposta corretta!<br><br>
        🔊 Ascolta la pronuncia corretta:
        <strong>${correct}</strong>
      </div>
    `;

    addXP(20);

    speakEnglish(correct);

  }else{

    result.innerHTML = `
      <div class="quiz-wrong">
        ❌ Risposta errata.<br><br>
        <strong>Risposta corretta:</strong> ${correct}<br><br>
        <strong>Spiegazione:</strong> ${explanation}<br><br>
        🔊 Ora ascolta la pronuncia corretta:
        <strong>${correct}</strong>
      </div>
    `;

    speakText(
      "Risposta errata. " +
      explanation +
      ". La risposta corretta è: "
    );

    setTimeout(()=>{
      speakEnglish(correct);
    }, 2500);
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
