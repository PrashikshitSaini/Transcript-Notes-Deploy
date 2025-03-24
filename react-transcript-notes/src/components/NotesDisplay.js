import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const NotesDisplay = ({ notes }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableNotes, setEditableNotes] = useState("");
  const [selectedText, setSelectedText] = useState({
    start: 0,
    end: 0,
    text: "",
  });

  // Initialize editable notes when notes prop changes
  useEffect(() => {
    setEditableNotes(notes);
  }, [notes]);

  // Function to handle text selection in the editor
  const handleSelection = (e) => {
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    const text = e.target.value.substring(start, end);
    setSelectedText({ start, end, text });
  };

  // Function to insert formatting around selected text
  const formatText = (prefix, suffix = prefix) => {
    if (selectedText.start === selectedText.end) return; // No selection

    const before = editableNotes.substring(0, selectedText.start);
    const after = editableNotes.substring(selectedText.end);

    setEditableNotes(`${before}${prefix}${selectedText.text}${suffix}${after}`);
  };

  // Common formatting functions
  const formatOperations = [
    { label: "Bold", action: () => formatText("**"), icon: "B" },
    { label: "Italic", action: () => formatText("*"), icon: "I" },
    { label: "Heading 1", action: () => formatText("# "), icon: "H1" },
    { label: "Heading 2", action: () => formatText("## "), icon: "H2" },
    { label: "Heading 3", action: () => formatText("### "), icon: "H3" },
    { label: "Quote", action: () => formatText("> "), icon: "❝" },
    { label: "Code", action: () => formatText("`"), icon: "{ }" },
    { label: "Link", action: () => formatText("[", "](url)"), icon: "🔗" },
    { label: "List Item", action: () => formatText("- "), icon: "•" },
    { label: "Number List", action: () => formatText("1. "), icon: "1." },
    { label: "Divider", action: () => formatText("\n\n---\n\n"), icon: "—" },
  ];

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Only process if Ctrl/Cmd key is pressed
    if (!(e.ctrlKey || e.metaKey)) return;

    // Common formatting shortcuts
    switch (e.key) {
      case "b": // Bold
        e.preventDefault();
        formatText("**");
        break;
      case "i": // Italic
        e.preventDefault();
        formatText("*");
        break;
      case "k": // Link
        e.preventDefault();
        formatText("[", "](url)");
        break;
      case "'": // Code
      case "`":
        e.preventDefault();
        formatText("`");
        break;
      default:
        break;
    }
  };

  return (
    <div className="notes-display">
      <div className="notes-header">
        <h3>Generated Notes:</h3>
        <div className="notes-actions">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="toggle-edit-btn"
          >
            {isEditing ? "Preview" : "Edit"}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="notes-editor">
          <div className="formatting-toolbar">
            {formatOperations.map((op, index) => (
              <button
                key={index}
                onClick={op.action}
                title={op.label}
                className="format-button"
              >
                {op.icon}
              </button>
            ))}
          </div>
          <textarea
            className="notes-edit-area"
            value={editableNotes}
            onChange={(e) => setEditableNotes(e.target.value)}
            onSelect={handleSelection}
            onKeyDown={handleKeyDown}
            placeholder="Edit your notes here..."
          />
        </div>
      ) : (
        <div className="notes-area markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            children={editableNotes || notes}
            components={{
              // Enhanced heading styling - monochrome version
              h1: ({ node, ...props }) => (
                <h1
                  style={{
                    color: "#f0f0f0",
                    borderBottom: "1px solid #444444",
                    paddingBottom: "8px",
                    marginBottom: "20px",
                  }}
                  {...props}
                />
              ),
              h2: ({ node, ...props }) => (
                <h2
                  style={{
                    color: "#e0e0e0",
                    borderBottom: "1px solid #333333",
                    paddingBottom: "6px",
                  }}
                  {...props}
                />
              ),
              h3: ({ node, ...props }) => (
                <h3
                  style={{
                    color: "#d0d0d0",
                    fontWeight: "600",
                  }}
                  {...props}
                />
              ),
              // Enhanced list styling
              ul: ({ node, ...props }) => (
                <ul
                  style={{
                    listStyleType: "disc",
                    paddingLeft: "20px",
                  }}
                  {...props}
                />
              ),
              ol: ({ node, ...props }) => (
                <ol
                  style={{
                    listStyleType: "decimal",
                    paddingLeft: "20px",
                  }}
                  {...props}
                />
              ),
              li: ({ node, children, ...props }) => (
                <li
                  style={{
                    marginBottom: "8px",
                    lineHeight: "1.6",
                    color: "#e0e0e0", // Light gray for text
                  }}
                  {...props}
                >
                  {children}
                </li>
              ),
              // Enhanced blockquote - monochrome
              blockquote: ({ node, ...props }) => (
                <blockquote
                  style={{
                    borderLeft: "3px solid #666666",
                    paddingLeft: "16px",
                    color: "#cccccc", // Light gray for quotes
                    fontStyle: "italic",
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    padding: "10px 15px",
                    borderRadius: "0 4px 4px 0",
                  }}
                  {...props}
                />
              ),
              // Emphasized styling
              em: ({ node, ...props }) => (
                <em
                  style={{
                    fontStyle: "italic",
                    color: "#d0d0d0", // Light gray for italic text
                  }}
                  {...props}
                />
              ),
              // Bold styling - monochrome
              strong: ({ node, ...props }) => (
                <strong
                  style={{
                    fontWeight: "bold",
                    color: "#ffffff", // White for bold text
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    padding: "2px 4px",
                    borderRadius: "3px",
                  }}
                  {...props}
                />
              ),
              // Enhanced link styling
              a: ({ node, ...props }) => (
                <a
                  style={{
                    color: "#cccccc", // Light gray for links
                    textDecoration: "none",
                    borderBottom: "1px dotted #888888",
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              ),
              // Enhanced code styling - monochrome
              code: ({ inline, ...props }) =>
                inline ? (
                  <code
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      padding: "2px 4px",
                      borderRadius: "3px",
                      fontSize: "85%",
                      color: "#e0e0e0", // Light gray for inline code
                      fontFamily:
                        "JetBrains Mono, SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace",
                    }}
                    {...props}
                  />
                ) : (
                  <code
                    style={{
                      display: "block",
                      padding: "16px",
                      overflow: "auto",
                      fontSize: "85%",
                      backgroundColor: "rgba(0, 0, 0, 0.2)",
                      color: "#d0d0d0", // Light gray for code blocks
                      borderRadius: "6px",
                      border: "1px solid #333",
                    }}
                    {...props}
                  />
                ),
              // Add specific styling for paragraphs to ensure high contrast
              p: ({ node, ...props }) => (
                <p
                  style={{
                    color: "#e0e0e0", // Light gray for high contrast
                    marginBottom: "1rem",
                    lineHeight: "1.6",
                  }}
                  {...props}
                />
              ),
              // Tables - monochrome styling
              table: ({ node, ...props }) => (
                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    marginBottom: "1rem",
                  }}
                  {...props}
                />
              ),
              th: ({ node, ...props }) => (
                <th
                  style={{
                    borderBottom: "2px solid #444444",
                    padding: "8px 12px",
                    textAlign: "left",
                    fontWeight: "600",
                    color: "#f0f0f0",
                  }}
                  {...props}
                />
              ),
              td: ({ node, ...props }) => (
                <td
                  style={{
                    border: "1px solid #333333",
                    padding: "8px 12px",
                    color: "#d0d0d0",
                  }}
                  {...props}
                />
              ),
              // Horizontal rule
              hr: ({ node, ...props }) => (
                <hr
                  style={{
                    border: "none",
                    height: "1px",
                    backgroundColor: "#444444",
                    margin: "24px 0",
                  }}
                  {...props}
                />
              ),
              // Image styling - grayscale
              img: ({ node, ...props }) => (
                <img
                  style={{
                    maxWidth: "100%",
                    borderRadius: "4px",
                    filter: "grayscale(100%)",
                    border: "1px solid #333333",
                  }}
                  {...props}
                  alt={props.alt || "Image"}
                />
              ),
              // Pre block (code container)
              pre: ({ node, ...props }) => (
                <pre
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    padding: "16px",
                    borderRadius: "4px",
                    overflow: "auto",
                    border: "1px solid #333333",
                    marginBottom: "1rem",
                  }}
                  {...props}
                />
              ),
            }}
          />
        </div>
      )}

      <details>
        <summary>View Raw Markdown</summary>
        <textarea
          className="raw-markdown"
          value={isEditing ? editableNotes : notes}
          readOnly
          placeholder="Notes will appear here after transcription and processing."
        />
      </details>
    </div>
  );
};

export default NotesDisplay;
