import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [listening, setListening] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [loading, setLoading] = useState(false);

  const recognitionRef = useRef(null);

  // =========================
  // SPEECH RECOGNITION
  // =========================
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Please use Google Chrome for voice input.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";

    recognition.onstart = () => {
      console.log("Microphone started");
      setListening(true);
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript.trim();

      console.log("You said:", text);

      if (!text) return;

      setMessage(text);

      // User message show karo
      setMessages((prev) => [
        ...prev,
        {
          type: "user",
          text: text,
        },
      ]);

      // Gemini ko bhejo
      askHealthAI(text);
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);
      setListening(false);

      if (event.error === "not-allowed") {
        alert(
          "Microphone permission denied. Chrome me microphone Allow karo."
        );
      }
    };

    recognition.onend = () => {
      console.log("Microphone stopped");
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (error) {
        console.log(error);
      }
    };
  }, []);

  // =========================
  // START CONVERSATION
  // =========================
  const startConversation = () => {
    setConversationStarted(true);

    setTimeout(() => {
      startListening();
    }, 300);
  };

  // =========================
  // START LISTENING
  // =========================
  const startListening = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not available.");
      return;
    }

    if (listening || loading) return;

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.log("Recognition already running.");
    }
  };

  // =========================
  // SPEAK BUTTON
  // =========================
  const handleSpeak = () => {
    if (listening) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log(error);
      }
    } else {
      startListening();
    }
  };

  // =========================
  // GEMINI BACKEND
  // =========================
  const askHealthAI = async (question) => {
    if (!question || !question.trim()) return;

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Server error");
      }

      const answer = data.answer || "No response received.";

      console.log("AI:", answer);

      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: answer,
        },
      ]);

      // AI voice
      speakAI(answer);

    } catch (error) {
      console.error("Backend error:", error);

      const errorText =
        "Sorry, I could not connect to the AI.";

      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: errorText,
        },
      ]);

      speakAI(errorText);

    } finally {
      setLoading(false);
    }
  };

  // =========================
  // AI VOICE
  // =========================
  const speakAI = (text) => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);

    speech.lang = "en-IN";
    speech.rate = 0.95;
    speech.pitch = 1;
    speech.volume = 1;

    window.speechSynthesis.speak(speech);
  };

  // =========================
  // TEXT INPUT
  // =========================
  const handleTextAsk = () => {
    const text = message.trim();

    if (!text || loading) return;

    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        text: text,
      },
    ]);

    setMessage("");

    askHealthAI(text);
  };

  // =========================
  // CLEAR
  // =========================
  const clearChat = () => {
    setMessages([]);
    setMessage("");

    window.speechSynthesis.cancel();
  };

  // =========================
  // END
  // =========================
  const endConversation = () => {
    setConversationStarted(false);
    setListening(false);

    try {
      recognitionRef.current?.stop();
    } catch (error) {
      console.log(error);
    }

    window.speechSynthesis.cancel();
  };

  return (
    <div className="app">

      {/* HEADER */}
      <header>
        <h1>🩺 Health AI Agent</h1>
        <p>Your AI-powered health assistant</p>
      </header>

      {/* CHAT BOX */}
      <main className="chat-box">

        <div className="chat-header">
          <div>
            <h2>How can I help you?</h2>

            <div className="online-status">
              <span></span>
              AI Assistant Online
            </div>
          </div>

          {messages.length > 0 && (
            <button
              className="clear-btn"
              onClick={clearChat}
            >
              🗑️ Clear
            </button>
          )}
        </div>

        {/* WELCOME */}
        {messages.length === 0 && !conversationStarted && (
          <div className="welcome">
            <div className="welcome-icon">
              🩺
            </div>

            <h3>Welcome to Health AI</h3>

            <p>
              Start a conversation and describe
              your health concern.
            </p>
          </div>
        )}

        {/* MESSAGES */}
        <div className="messages">

          {messages.map((item, index) => (
            <div
              key={index}
              className={
                item.type === "user"
                  ? "message user-message"
                  : "message ai-message"
              }
            >
              <strong>
                {item.type === "user"
                  ? "👤 You"
                  : "🤖 Health AI"}
              </strong>

              <p>{item.text}</p>
            </div>
          ))}

          {loading && (
            <div className="message ai-message">
              <strong>🤖 Health AI</strong>
              <p>Thinking...</p>
            </div>
          )}

        </div>

        {/* VOICE BUTTONS */}
        <div className="voice-area">

          {!conversationStarted ? (
            <button
              className="mic-btn"
              onClick={startConversation}
            >
              🟢 Start Conversation
            </button>
          ) : (
            <>
              <button
                className={`mic-btn ${
                  listening ? "listening" : ""
                }`}
                onClick={handleSpeak}
                disabled={loading}
              >
                {listening
                  ? "🔴 Listening..."
                  : "🎤 Speak"}
              </button>

              <button
                className="end-btn"
                onClick={endConversation}
              >
                ⏹️ End Conversation
              </button>
            </>
          )}

          <p>
            {!conversationStarted
              ? "Start a voice conversation with Health AI"
              : listening
              ? "Speak your health concern..."
              : loading
              ? "Health AI is responding..."
              : "Conversation active — click Speak"}
          </p>

        </div>

        {/* TEXT INPUT */}
        <div className="input-area">

          <textarea
            placeholder="Or type your health concern..."
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
          />

          <button
            className="ask-btn"
            onClick={handleTextAsk}
            disabled={loading || !message.trim()}
          >
            {loading
              ? "Thinking..."
              : "Ask Health AI →"}
          </button>

        </div>

      </main>

      {/* FOOTER */}
      <footer>
        ⚠️ For informational purposes only.
        Not a substitute for a doctor.
      </footer>

    </div>
  );
}

export default App;