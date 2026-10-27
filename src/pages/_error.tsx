import React from "react";
import { NextPageContext } from "next";

interface ErrorProps {
  statusCode?: number;
}

function ErrorPage({ statusCode }: ErrorProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0A0A0B",
        color: "#FAF9F5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        textAlign: "center",
        padding: "1.5rem",
      }}
    >
      <div style={{ maxWidth: "28rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#FDE68A", marginBottom: "0.5rem" }}>
          {statusCode ? `Error ${statusCode}` : "Experience Unavailable"}
        </h1>
        <p style={{ color: "#A8A29E", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
          {statusCode === 404
            ? "The requested birthday celebration could not be found or has expired."
            : "An unexpected error occurred while loading this experience. Please try again."}
        </p>
        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "0.625rem 1.25rem",
            backgroundColor: "#FBBF24",
            color: "#0A0A0B",
            fontWeight: 600,
            fontSize: "0.75rem",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            borderRadius: "0.5rem",
            textDecoration: "none",
          }}
        >
          Return Home
        </a>
      </div>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default ErrorPage;
