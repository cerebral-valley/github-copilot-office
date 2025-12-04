import * as React from "react";
import { Button, Tooltip, makeStyles } from "@fluentui/react-components";
import { Compose24Regular } from "@fluentui/react-icons";

interface HeaderBarProps {
  onNewChat: () => void;
  isDarkMode: boolean;
}

const useStyles = makeStyles({
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "8px 12px",
    gap: "8px",
    minHeight: "40px",
  },
  headerLight: {
    borderBottom: "1px solid #e0e0e0",
    backgroundColor: "#faf9f8",
  },
  headerDark: {
    borderBottom: "1px solid #3b3a39",
    backgroundColor: "#252423",
  },
  clearButton: {
    backgroundColor: "#0078d4",
    color: "white",
    borderRadius: "4px",
    padding: "4px",
    width: "28px",
    height: "28px",
    minWidth: "28px",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ":hover": {
      backgroundColor: "#106ebe",
    },
  },
});

export const HeaderBar: React.FC<HeaderBarProps> = ({ onNewChat, isDarkMode }) => {
  const styles = useStyles();

  return (
    <div className={`${styles.header} ${isDarkMode ? styles.headerDark : styles.headerLight}`}>
      <Tooltip content="New chat" relationship="label">
        <Button
          icon={<Compose24Regular />}
          onClick={onNewChat}
          aria-label="New chat"
          className={styles.clearButton}
        />
      </Tooltip>
    </div>
  );
};
