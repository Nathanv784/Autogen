/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatStatus, setChatStatus] = useState("ended");

  const messagesEndRef = useRef(null);

  // // Initial chat request structure
  // const initialChatRequest = {
  //   "message": "Write a quick manuscript",
  //   "agents_info": [
  //       {
  //           "name": "Personal_Assistant",
  //           "type": "AssistantAgent",
  //           "llm": {
  //               "model": "gpt-4o"
  //           },
  //           "system_message": "You are a personal assistant who can answer questions.",
  //           "description": "This is a personal assistant who can answer questions."
  //       }
  //   ],
  //   "task_info": {
  //       "id": 0,
  //       "name": "Personal Assistant",
  //       "description": "This is a powerful personal assistant.",
  //       "maxMessages": 5,
  //       "speakSelMode": "auto"
  //   }
  // };

  // Function to send message/start chat
  const handleSend = async () => {
    let apiEndpoint, requestBody;

    if (chatStatus === "Chat ongoing" || chatStatus === "inputting") {
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
    const intervalId = setInterval(fetchMessages, 1000);
    return () => clearInterval(intervalId);
  }, [messages]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const defalutMessage = [
    {id:"1",message: "Can you describe the symptoms you've been experiencing?"},
    {id:"2",message: "How long have you been feeling unwell?"},
    {id:"3",message: "Can you describe any symptoms you've been experiencing related to your diabetes?"},
    {id:"4",message: "Have you noticed any chest pain, shortness of breath, or palpitations recently? Collapse"}
  ]

  const handleHyperLink = (item) => {
    setUserInput(item);
  }
  const handleClear = () => {
    setUserInput('');
  }

  return (
    <div className="App">
      <div className="chat-window">
        <div className="messages">
          <div className="static-message">
            <div className="chat-static-contents">
              <p>
                Hello! ,Think of me as your patient simulation bot, here to help
                you practice and refine your medical skills. Please go ahead and
                ask your questions as if I were your patient. Here are a few
                questions to get you started:
              </p>
            </div>
            {defalutMessage.map((item,index) => {
              return(
                <div className="chat-static-contents-onClick" key={item.id}>
                  <p onClick={() => {handleHyperLink(item.message)}} style={{ textDecoration: 'underline' }}>{item.message}</p>
                </div>
              )
            })}
          </div>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${
                msg.user === "Interaction_Agent" ? "user" : "agent"
              }`}
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
          />
          <button onClick={handleClear} style={{marginRight:'10px'}}>clear</button>
          <button onClick={handleSend}>Send</button>
        </div>
        <p className="chat-status">Chat Status: {chatStatus}</p>
      </div>
    </div>
  );
}

export default App;
