import React from "react";

interface MessageProps {
  message: {
    role: string;
    content: string;
  };
}

const Message: React.FC<MessageProps> = ({ message }) => {
  return (
    <>
      {message.role === "user" && <div className="user">{message.content}</div>}
      {message.role === "assistant" && (
        <div className="assistant">{message.content}</div>
      )}
    </>
  );
};

export default Message;
