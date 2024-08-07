import React, { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatStatus, setChatStatus] = useState("ended");

  const messagesEndRef = useRef(null);

  // Function to send message/start chat
  const handleSend = async () => {
    if (!userInput.trim() || (chatStatus !== "ended" && chatStatus !== "inputting")) return;

    let apiEndpoint, requestBody;

    if (chatStatus === "inputting") {
      // Send message request
      apiEndpoint = "http://localhost:5008/api/send_message";
      requestBody = { message: userInput };
    } else {
      // Start chat request
      apiEndpoint = "http://localhost:5008/api/start_chat";
      requestBody = { message: userInput };
    }

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to send request");
      }

      setUserInput(""); // Clear input field
      fetchMessages(); // Fetch messages to update chat status
    } catch (error) {
      console.error("Error sending request:", error);
    }
  };

  // Function to fetch messages from the backend
  const fetchMessages = async () => {
    try {
      const response = await fetch("http://localhost:5008/api/get_message");
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      if (data.message) {
        setMessages([...messages, data.message]);
      }
      setChatStatus(data.chat_status);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Use useEffect to poll for new messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch("http://localhost:5008/api/get_message");
        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }

        const data = await response.json();
        if (data.message) {
          setMessages([...messages, data.message]);
        }
        setChatStatus(data.chat_status);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
    const intervalId = setInterval(fetchMessages, 1000);

    return () => clearInterval(intervalId);
  }, [messages]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const defaultMessage = [
    { id: "1", message: "Can you describe the symptoms you've been experiencing?" },
    { id: "2", message: "How long have you been feeling unwell?" },
    { id: "3", message: "Can you describe any symptoms you've been experiencing related to your diabetes?" },
    { id: "4", message: "Have you noticed any chest pain, shortness of breath, or palpitations recently?" },
  ];

  const handleHyperLink = async (item) => {
    let apiEndpoint, requestBody;

    if (chatStatus === "inputting") {
      // Send message request
      apiEndpoint = "http://localhost:5008/api/send_message";
      requestBody = { message: item };
    } else {
      // Start chat request
      apiEndpoint = "http://localhost:5008/api/start_chat";
      requestBody = { message: item };
    }

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      fetchMessages(); // Fetch messages after sending to update UI
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="App">
      <div className="chat-window">
        <div className="messages">
          <div className="static-message">
            <div className="chat-static-contents">
              <p>
                Hello! Think of me as your patient simulation bot, here to help
                you practice and refine your medical skills. Please go ahead and
                ask your questions as if I were your patient. Here are a few
                questions to get you started:
              </p>
            </div>
            {defaultMessage.map((item) => (
              <div className="chat-static-contents-onClick" key={item.id}>
                <p onClick={() => handleHyperLink(item.message)} style={{ textDecoration: 'underline' }}>
                  {item.message}
                </p>
              </div>
            ))}
          </div>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.user === "Interaction_Agent" ? "user" : "agent"}`}
            >
              <strong>
                {msg.user === "Interaction_Agent" ? "" : msg.user}{" "}
                {msg.user === "Interaction_Agent" ? "" : ":"}
              </strong>{" "}
              {msg.message}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="input-area">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // Prevent default form submission behavior
                if (chatStatus === "ended" || chatStatus === "inputting") {
                  handleSend(); // Trigger send message function
                }
              }
            }}
          />
          <button onClick={handleSend} disabled={chatStatus !== "ended" && chatStatus !== "inputting"}>
            Send
          </button>
        </div>
        <p className="chat-status">Chat Status: {chatStatus}</p>
      </div>
    </div>
  );
}

export default App;
