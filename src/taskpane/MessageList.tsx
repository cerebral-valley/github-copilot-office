import * as React from "react";
import { useRef, useEffect } from "react";
import { makeStyles } from "@fluentui/react-components";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  isDarkMode: boolean;
}

const useStyles = makeStyles({
  chatContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  emptyState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    fontSize: "20px",
    fontWeight: "300",
  },
  messageUser: {
    alignSelf: "flex-end",
    backgroundColor: "#0078d4",
    color: "white",
    padding: "10px 14px",
    borderRadius: "12px",
    maxWidth: "70%",
    wordWrap: "break-word",
  },
  messageAssistant: {
    alignSelf: "flex-start",
    padding: "10px 14px",
    borderRadius: "12px",
    maxWidth: "70%",
    wordWrap: "break-word",
  },
  messageAssistantLight: {
    backgroundColor: "white",
    color: "#323130",
    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
  },
  messageAssistantDark: {
    backgroundColor: "#292827",
    color: "#f3f2f1",
    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
  },
});

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isTyping,
  isDarkMode,
}) => {
  const styles = useStyles();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className={styles.chatContainer}>
      {messages.length === 0 && (
        <div className={styles.emptyState} style={{ color: isDarkMode ? "#8a8886" : "#999" }}>
          What can I do for you?
        </div>
      )}
      
      {messages.map((message) => (
        <div
          key={message.id}
          className={
            message.sender === "user"
              ? styles.messageUser
              : `${styles.messageAssistant} ${isDarkMode ? styles.messageAssistantDark : styles.messageAssistantLight}`
          }
        >
          {message.text}
        </div>
      ))}
      
      {isTyping && (
        <div className={`${styles.messageAssistant} ${isDarkMode ? styles.messageAssistantDark : styles.messageAssistantLight}`}>
          <span>Typing...</span>
        </div>
      )}
      
      <div ref={chatEndRef} />
    </div>
  );
};
