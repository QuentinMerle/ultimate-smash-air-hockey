import styled, { css, keyframes } from "styled-components";

export const arcadeFont = css`
  font-family: "RussoOne", sans-serif;
`;

const pulseClash = keyframes`
  0%, 100% { box-shadow: 0 6px 0 #050a14, 0 0 18px rgba(74, 222, 128, 0.35); }
  50% { box-shadow: 0 6px 0 #050a14, 0 0 28px rgba(74, 222, 128, 0.7); }
`;

export const StartScene = styled.div`
  ${arcadeFont}
  position: fixed;
  z-index: 99;
  inset: 0;
  height: 100dvh;
  max-height: 100dvh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  justify-content: safe center;
  text-align: center;
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  padding: ${({ $compact }) => ($compact ? "14px 20px" : "32px 20px 24px")};
  background: radial-gradient(circle at 50% 25%, rgba(30, 41, 59, 0.62), rgba(9, 13, 28, 0.86));
  backdrop-filter: blur(5px);

  @media (max-width: 640px) {
    padding: max(16px, env(safe-area-inset-top, 16px)) 16px max(20px, env(safe-area-inset-bottom, 20px));
  }

  @media (max-height: 680px), (max-width: 720px) {
    justify-content: flex-start;
  }
`;

export const Title = styled.div`
  display: flex;
  flex-direction: ${({ $compact }) => ($compact ? "row" : "column")};
  align-items: center;
  justify-content: center;
  gap: ${({ $compact }) => ($compact ? "10px" : "0")};
  margin-bottom: ${({ $compact }) => ($compact ? "6px" : "12px")};
  transform: ${({ $compact }) => ($compact ? "none" : "rotate(-1.5deg)")};
`;

export const BadgeScript = styled.span`
  padding: ${({ $compact }) => ($compact ? "2px 11px" : "4px 16px")};
  border-radius: 999px;
  background: #fde047;
  color: #0f172a;
  font-size: ${({ $compact }) => ($compact ? "0.78rem" : "0.96rem")};
  letter-spacing: 0.08em;
  border: ${({ $compact }) => ($compact ? "3px solid #0f172a" : "4px solid #0f172a")};
  box-shadow: ${({ $compact }) => ($compact ? "0 3px 0 #0f172a" : "0 4px 0 #0f172a")};
  margin-bottom: ${({ $compact }) => ($compact ? "0" : "-8px")};
  z-index: 2;
`;

export const MainTitle = styled.h1`
  margin: 0;
  font-size: ${({ $compact }) =>
    $compact ? "clamp(1.3rem, 2.5vw, 1.72rem)" : "clamp(2.1rem, 5vw, 3.85rem)"};
  font-style: italic;
  font-weight: 900;
  line-height: 1.08em;
  text-transform: uppercase;
  color: #ff2a54;
  paint-order: stroke fill;
  -webkit-text-stroke: ${({ $compact }) =>
    $compact ? "2.5px #0f172a" : "clamp(3px, 0.45vw, 5px) #0f172a"};
  text-shadow: ${({ $compact }) => ($compact ? "0 3px 0 #0f172a" : "0 6px 0 #0f172a")};
`;

export const ControllerBadge = styled.div`
  margin-top: 6px;
  padding: 3px 13px;
  border-radius: 999px;
  background: #0f172a;
  color: #4ade80;
  font-family: system-ui, sans-serif;
  font-weight: 800;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  border: 2px solid #38bdf8;
`;

export const ArcadeCabinet = styled.div`
  width: min(760px, calc(100vw - 36px));
  box-sizing: border-box;
  margin: 4px auto;
  padding: 12px 16px;
  border-radius: 20px;
  background: linear-gradient(180deg, #0f172a 0%, #172038 100%);
  color: #f8fafc;
  border: 4px solid #38bdf8;
  outline: 4px solid #050a14;
  box-shadow: 0 10px 0 #050a14, 0 22px 44px rgba(0, 0, 0, 0.55);

  @media (max-width: 640px) {
    width: calc(100vw - 32px);
    padding: 14px;
    border-radius: 18px;
  }
`;

export const ModeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 11px;
`;

export const BaseModeBtn = styled.button`
  ${arcadeFont}
  width: 100%;
  min-height: 50px;
  padding: 13px 18px;
  border-radius: 14px;
  font-size: 1.12rem;
  letter-spacing: 0.04em;
  border: 4px solid #050a14;
  box-shadow: 0 5px 0 #050a14;
  cursor: pointer;
  transition: transform 150ms ease-out, box-shadow 150ms ease-out;

  &:hover:not([disabled]) {
    transform: translateY(-2px);
    box-shadow: 0 7px 0 #050a14;
  }
  &:active:not([disabled]) {
    transform: translateY(3px);
    box-shadow: 0 2px 0 #050a14;
  }
`;

export const PrimaryModeButton = styled(BaseModeBtn)`
  background: linear-gradient(135deg, #ff2a54 0%, #f43f5e 100%);
  color: #ffffff;
  text-shadow: 0 2px 0 #050a14;
`;

export const SecondaryModeButton = styled(BaseModeBtn)`
  background: linear-gradient(135deg, #00b4d8 0%, #0284c7 100%);
  color: #ffffff;
  text-shadow: 0 2px 0 #050a14;
`;

export const OnlineModeButton = styled(BaseModeBtn)`
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  color: #ffffff;
  text-shadow: 0 2px 0 #050a14;
`;

export const LeaderboardBtn = styled(BaseModeBtn)`
  background: linear-gradient(135deg, #fde047 0%, #eab308 100%);
  color: #0f172a;
`;

export const SetupForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 7px;
`;

export const TagRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

export const FieldGroup = styled.div`
  flex: 1;
  min-width: 170px;
  display: flex;
  flex-direction: column;
  text-align: left;

  label {
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    color: #94a3b8;
    text-transform: uppercase;
  }
`;

export const ArcadeInput = styled.input`
  ${arcadeFont}
  width: 100%;
  margin-top: 2px;
  padding: 5px 10px;
  border: 3px solid #334155;
  border-radius: 9px;
  font-size: 0.88rem;
  color: #f8fafc;
  background: #090e1c;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #fde047;
    background: #111933;
  }
`;

export const ArcadeSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fde047;
  text-align: left;
  border-bottom: 2px solid #1e293b;
  padding-bottom: 3px;

  span {
    font-family: system-ui, sans-serif;
    font-weight: 700;
    font-size: 0.68rem;
    color: #94a3b8;
    text-transform: none;
  }
`;

export const FighterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const FighterCard = styled.button`
  ${arcadeFont}
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px;
  border-radius: 12px;
  border: 3px solid ${({ $active, $accent }) => ($active ? $accent : "#334155")};
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(180deg, rgba(30, 41, 59, 0.98) 0%, #090e1c 100%)"
      : "#0b1224"};
  color: #f8fafc;
  cursor: pointer;
  text-align: center;
  box-shadow: ${({ $active, $accent }) =>
    $active ? `0 0 14px ${$accent}55, 0 4px 0 #050a14` : "0 4px 0 #050a14"};
  transform: ${({ $active }) => ($active ? "translateY(-2px)" : "none")};
  transition: transform 140ms ease-out, border-color 140ms ease-out;

  &:hover {
    border-color: ${({ $accent }) => $accent};
    transform: translateY(-2px);
  }
`;

export const StrikerDisc = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: 2.5px solid #050a14;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.28), 0 0 0 2.5px ${({ $ring }) => $ring};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
`;

export const FighterName = styled.div`
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  line-height: 1.05;
`;

export const FighterRole = styled.div`
  font-family: system-ui, sans-serif;
  font-weight: 700;
  font-size: 0.6rem;
  color: #94a3b8;
`;

export const SuperPill = styled.div`
  width: 100%;
  padding: 2px 4px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.9);
  border: 1.5px solid ${({ $color }) => $color};
  color: #fde047;
  font-family: system-ui, sans-serif;
  font-weight: 800;
  font-size: 0.58rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const StatRows = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 1px;
`;

export const StatRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: system-ui, sans-serif;
  font-weight: 800;
  font-size: 0.58rem;
  color: #cbd5e1;

  span {
    width: 24px;
    text-align: left;
  }
`;

export const StatBarTrack = styled.div`
  flex: 1;
  height: 5px;
  border-radius: 999px;
  background: #1e293b;
  overflow: hidden;
`;

export const StatBarFill = styled.div`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ $color }) => $color};
  border-radius: 999px;
`;

export const BentoGrid = styled.div`
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 8px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const BentoBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 7px 10px;
  border-radius: 12px;
  background: #0b1224;
  border: 2px solid #1e293b;
`;

export const StageCards = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const StageBtn = styled.button`
  ${arcadeFont}
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 9px;
  border: 2.5px solid ${({ $active, $accent }) => ($active ? $accent : "#334155")};
  background: ${({ $active, $bg }) => ($active ? $bg : "#111a30")};
  color: #f8fafc;
  cursor: pointer;
  text-align: left;

  strong {
    display: block;
    font-size: 0.76rem;
    line-height: 1.1;
  }
  small {
    display: block;
    font-family: system-ui, sans-serif;
    font-weight: 700;
    font-size: 0.6rem;
    color: #cbd5e1;
  }
`;

export const StageSwatch = styled.span`
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: 7px;
  background: ${({ $bg }) => $bg};
  border: 2px solid ${({ $accent }) => $accent};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
`;

export const PillRow = styled.div`
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
`;

export const CompactPillBtn = styled.button`
  ${arcadeFont}
  flex: 1;
  min-width: 58px;
  min-height: 27px;
  padding: 3px 6px;
  border-radius: 8px;
  border: 2.5px solid ${({ $active, $accent }) => ($active ? $accent || "#fde047" : "#334155")};
  background: ${({ $active, $bg }) => ($active ? $bg || "#1e293b" : "#111a30")};
  color: ${({ $active, $darkText }) => ($active && $darkText ? "#0f172a" : "#f8fafc")};
  font-size: 0.68rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
`;

export const PuckDot = styled.span`
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: ${({ $main }) => $main};
  border: 2.5px solid ${({ $ring }) => $ring};
  flex: none;
`;

export const ActionRow = styled.div`
  display: flex;
  gap: 10px;
`;

export const BackBtn = styled.button`
  ${arcadeFont}
  padding: 8px 14px;
  border-radius: 12px;
  border: 3px solid #334155;
  background: #1e293b;
  color: #f8fafc;
  font-size: 0.88rem;
  cursor: pointer;
  box-shadow: 0 4px 0 #050a14;
`;

export const ClashButton = styled.button`
  ${arcadeFont}
  flex: 1;
  padding: 8px 20px;
  border-radius: 12px;
  font-size: 1.12rem;
  letter-spacing: 0.05em;
  color: #050a14;
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  border: 4px solid #050a14;
  animation: ${pulseClash} 2s infinite ease-in-out;
  cursor: pointer;
  transition: transform 140ms ease-out;

  &:hover {
    transform: translateY(-2px);
  }
`;

export const ControlsHint = styled.div`
  font-family: system-ui, sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  color: #cbd5e1;
  background: #090e1c;
  padding: 4px 8px;
  border-radius: 9px;
  border: 2px solid #1e293b;
  line-height: 1.25;
`;

export const OnlineBox = styled.div`
  padding: 10px;
  border-radius: 14px;
  background: #1a1033;
  border: 2.5px solid #a855f7;
`;

export const InvitePanel = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  flex-wrap: wrap;
`;

export const InviteInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
`;

export const CodeBadge = styled.span`
  padding: 2px 10px;
  border-radius: 8px;
  background: #fde047;
  color: #0f172a;
  font-size: 1.05rem;
  letter-spacing: 0.14em;
`;

export const CopyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const CopyBtn = styled.button`
  ${arcadeFont}
  min-width: 24px;
  min-height: 36px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 3px solid #050a14;
  background: #38bdf8;
  color: #050a14;
  font-size: 0.78rem;
  cursor: pointer;
`;

export const CopyStatus = styled.span`
  font-family: system-ui, sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  color: #4ade80;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 150ms ease-out;
`;

export const WaitingText = styled.div`
  font-family: system-ui, sans-serif;
  font-weight: 700;
  font-size: 0.78rem;
  color: #e9d5ff;
`;

export const HallDialog = styled.dialog`
  border: none;
  background: transparent;
  padding: 0;
  margin: auto;
  overflow: visible;
`;

export const HallCard = styled.div`
  ${arcadeFont}
  width: min(500px, calc(100vw - 36px));
  box-sizing: border-box;
  padding: 20px;
  border-radius: 22px;
  background: #0f172a;
  color: #f8fafc;
  border: 4px solid #fde047;
  box-shadow: 0 12px 0 #050a14;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;

  h2 {
    margin: 0;
    font-size: 1.65rem;
    color: #fde047;
  }
`;

export const LeaderboardTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: system-ui, sans-serif;
  font-size: 0.8rem;
  text-align: left;

  caption {
    margin-bottom: 8px;
    font-weight: 700;
    color: #94a3b8;
  }
  th,
  td {
    padding: 6px 8px;
    border-bottom: 1.5px solid #1e293b;
  }
  th {
    font-weight: 900;
    color: #38bdf8;
    background: #090e1c;
  }
`;
