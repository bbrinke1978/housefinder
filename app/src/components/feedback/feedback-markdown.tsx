"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

interface FeedbackMarkdownProps {
  children: string;
  className?: string;
}

/**
 * FeedbackMarkdown — sanitized GFM markdown renderer.
 * Uses react-markdown + remark-gfm (tables, task lists, strikethrough)
 * + rehype-sanitize (no script execution).
 * Reused for description display, comment bodies, and email previews.
 */
export function FeedbackMarkdown({ children, className }: FeedbackMarkdownProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          img: ({ node, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              {...props}
              alt={props.alt ?? ""}
              className="max-w-full rounded-md"
              loading="lazy"
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
