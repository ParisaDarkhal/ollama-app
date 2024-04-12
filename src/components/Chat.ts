import React, { useState, ChangeEvent, KeyboardEvent } from "react";
import axios, { AxiosResponse } from "axios";
import Message from "./Message";

interface Message {
  role: string;
  content: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState<string>("");

  const sendMessage = async (e: KeyboardEvent<HTMLInputElement>) => {
    try {
      const message: string = e.currentTarget.value;
      setMessages((previousMessages) => [
        ...previousMessages,
        { role: "user", content: message },
      ]);
      const response: AxiosResponse<string> = await axios.post(
        "http://localhost:3001/messages",
        { message }
      );
      setValue("");

      setMessages((previousMessages) => [
        ...previousMessages,
        { role: "assistant", content: response.data },
      ]);
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  return (
    <div>
      <div>
        {messages.map((msg: Message, index: number) => (
          <Message key={index} message={msg} />
        ))}
      </div>
      <div className="input">
        <label>Type your question here: </label>
        <input
          type="text"
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setValue(e.target.value)
          }
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              sendMessage(e);
            }
          }}
        />
      </div>
    </div>
  );
};

export default Chat;
