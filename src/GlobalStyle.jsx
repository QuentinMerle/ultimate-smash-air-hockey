import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  @font-face {
    font-family: "RussoOne";
    src: local("RussoOne"),
        url("russo-one-v14-latin-regular.woff") format("woff");
  }

  @font-face {
    font-family: "Caveat";
    src: local("Caveat"),
        url("caveat-v17-latin-regular.woff") format("woff");
  }

  html,
  body,
  #root {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    background: #0b1120;
    overflow: hidden;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  canvas {
    display: block;
    touch-action: none;
  }

  :where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
    outline: 3px solid #fde047;
    outline-offset: 3px;
  }

  dialog:modal {
    overscroll-behavior: contain;
  }

  dialog::backdrop {
    overflow: hidden;
    overscroll-behavior: contain;
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(5px);
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

export default GlobalStyle;
