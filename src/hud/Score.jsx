import React, { useEffect, useRef } from "react";
import styled, { css, keyframes } from "styled-components";
import { useStore } from "../store";
import { sound } from "../sound";
import { disconnectOnline } from "../net";

export function Score() {
  const pauseDialogRef = useRef(null);

  const namePlayerOne = useStore((state) => state.playerOneName);
  const namePlayerTwo = useStore((state) => state.playerTwoName);
  const scorePlayerOne = useStore((state) => state.playerOne);
  const scorePlayerTwo = useStore((state) => state.playerTwo);
  const winningScore = useStore((state) => state.winningScore);
  const p1Mult = useStore((state) => state.playerOneScoreMult);
  const p2Mult = useStore((state) => state.playerTwoScoreMult);
  const startGame = useStore((state) => state.startGame);
  const endGame = useStore((state) => state.endGame);
  const gameMode = useStore((state) => state.gameMode);
  const isPaused = useStore((state) => state.isPaused);
  const peerDisconnected = useStore((state) => state.peerDisconnected);
  const isGoalSlowMo = useStore((state) => state.isGoalSlowMo);
  const lastGoalSpeed = useStore((state) => state.lastGoalSpeed);
  const casterMessage = useStore((state) => state.casterMessage);

  const soundMuted = useStore((state) => state.soundMuted);
  const musicMuted = useStore((state) => state.musicMuted);
  const voiceMuted = useStore((state) => state.voiceMuted);

  const toggleSound = useStore((state) => state.toggleSound);
  const toggleMusic = useStore((state) => state.toggleMusic);
  const toggleVoice = useStore((state) => state.toggleVoice);
  const togglePause = useStore((state) => state.togglePause);
  const launchGame = useStore((state) => state.launchGame);
  const resetToMenu = useStore((state) => state.resetToMenu);

  const isMatchPoint =
    startGame &&
    !endGame &&
    (scorePlayerOne === winningScore - 1 ||
      scorePlayerTwo === winningScore - 1);

  // Sync native <dialog> showModal / close cleanly with Zustand Pause state
  useEffect(() => {
    const dialog = pauseDialogRef.current;
    if (!dialog) return;

    if (isPaused && !dialog.open) {
      dialog.showModal();
    } else if (!isPaused && dialog.open) {
      dialog.close();
    }
  }, [isPaused]);

  const handleExitToMenu = () => {
    sound.playUiBack();
    disconnectOnline();
    resetToMenu();
  };

  return (
    <>
      {startGame && (
        <TableScore>
          <CellScoreOne>
            <NameBlock>
              <span>{namePlayerOne}</span>
              {p1Mult > 1 && <MultiplierBadge>⭐ x{p1Mult}</MultiplierBadge>}
            </NameBlock>
            <CellScore>{scorePlayerOne}</CellScore>
          </CellScoreOne>
          <VsBadge title={`First to ${winningScore} goals`}>
            <div>VS</div>
            <small>/{winningScore}</small>
          </VsBadge>
          <CellScoreTwo>
            <NameBlock>
              <span>{namePlayerTwo}</span>
              {p2Mult > 1 && <MultiplierBadge>⭐ x{p2Mult}</MultiplierBadge>}
            </NameBlock>
            <CellScore>{scorePlayerTwo}</CellScore>
          </CellScoreTwo>
        </TableScore>
      )}

      {isMatchPoint && !isGoalSlowMo && (
        <MatchPointBanner>🔥 MATCH POINT!</MatchPointBanner>
      )}

      {isGoalSlowMo && !endGame && (
        <SakuraiGoalBanner role="status">
          <ImpactFlashDot />
          <span>💥 GOAL! • {lastGoalSpeed} KM/H</span>
        </SakuraiGoalBanner>
      )}

      <TopRightActions aria-label="Match Controls">
        <HudBtn
          type="button"
          aria-label={musicMuted ? "Unmute Music" : "Mute Music"}
          aria-pressed={!musicMuted}
          $muted={musicMuted}
          onClick={() => {
            sound.playUiClick();
            toggleMusic();
          }}>
          {musicMuted ? "🎵✕" : "🎵"}
        </HudBtn>
        <HudBtn
          type="button"
          aria-label={voiceMuted ? "Unmute Announcer Voice" : "Mute Announcer Voice"}
          aria-pressed={!voiceMuted}
          $muted={voiceMuted}
          onClick={() => {
            sound.playUiClick();
            toggleVoice();
          }}>
          {voiceMuted ? "🎙️✕" : "🎙️"}
        </HudBtn>
        <HudBtn
          type="button"
          aria-label={soundMuted ? "Unmute Sound Effects" : "Mute Sound Effects"}
          aria-pressed={!soundMuted}
          $muted={soundMuted}
          onClick={() => {
            toggleSound();
          }}>
          {soundMuted ? "🔇" : "🔊"}
        </HudBtn>
        {startGame && !endGame && gameMode !== "online" && (
          <HudBtn
            type="button"
            aria-label="Pause Match"
            aria-pressed={isPaused}
            onClick={togglePause}>
            ⏸️ Pause
          </HudBtn>
        )}
        {startGame && (
          <HudBtn type="button" onClick={handleExitToMenu}>
            ⚙️ Menu
          </HudBtn>
        )}
      </TopRightActions>

      {startGame && !endGame && (
        <CasterTicker role="status" aria-live="polite">
          {casterMessage}
        </CasterTicker>
      )}

      {/* Native top-layer modal <dialog> for Pause (inert background & Esc built in) */}
      <PauseDialog
        ref={pauseDialogRef}
        aria-labelledby="pause-modal-title"
        onCancel={(e) => {
          e.preventDefault();
          if (peerDisconnected) {
            handleExitToMenu();
          } else {
            togglePause();
          }
        }}>
        <PauseCard>
          <PauseHeading id="pause-modal-title">
            {peerDisconnected ? "⚠️ OPPONENT LEFT" : "⏸️ MATCH PAUSED"}
          </PauseHeading>
          <PauseSub>
            {peerDisconnected
              ? `Your rival disconnected from the P2P room (${namePlayerOne} ${scorePlayerOne} — ${scorePlayerTwo} ${namePlayerTwo}).`
              : `${namePlayerOne} ${scorePlayerOne} — ${scorePlayerTwo} ${namePlayerTwo}`}
          </PauseSub>
          <PauseActions>
            {peerDisconnected ? (
              <ResumeBtn type="button" autoFocus onClick={handleExitToMenu}>
                ⚙️ Back to Main Menu
              </ResumeBtn>
            ) : (
              <>
                <ResumeBtn type="button" autoFocus onClick={togglePause}>
                  ▶ Resume Match
                </ResumeBtn>
                <SecondaryDialogBtn
                  type="button"
                  onClick={() => {
                    sound.playUiClick();
                    launchGame();
                  }}>
                  ↻ Restart Match
                </SecondaryDialogBtn>
                <SecondaryDialogBtn type="button" onClick={handleExitToMenu}>
                  ⚙️ Quit to Main Menu
                </SecondaryDialogBtn>
              </>
            )}
          </PauseActions>
        </PauseCard>
      </PauseDialog>
    </>
  );
}

const pulseAlert = keyframes`
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.08); }
`;

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

const goalPopShake = keyframes`
  0% { opacity: 0; transform: translateX(-50%) skewX(-8deg) scale(0.35) rotate(-5deg); }
  25% { opacity: 1; transform: translateX(calc(-50% + 4px)) skewX(-8deg) scale(1.16) rotate(2deg); }
  48% { transform: translateX(calc(-50% - 4px)) skewX(-8deg) scale(0.96) rotate(-1.5deg); }
  70% { transform: translateX(calc(-50% + 2px)) skewX(-8deg) scale(1.03) rotate(1deg); }
  100% { opacity: 1; transform: translateX(-50%) skewX(-8deg) scale(1) rotate(0deg); }
`;

const base = css`
  position: fixed;
  z-index: 89;
  font-family: "RussoOne", sans-serif;
  text-transform: uppercase;
  font-weight: 900;
  line-height: 1em;
  pointer-events: none;
  color: white;
`;

const TableScore = styled.div`
  ${base}
  top: 16px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  padding: 0 16px;
  box-sizing: border-box;
  font-size: 1.15rem;
  font-style: italic;
  text-align: center;
  @media only screen and (max-width: 1080px) {
    top: max(58px, calc(env(safe-area-inset-top, 12px) + 46px));
    width: calc(100vw - 24px);
    max-width: 480px;
    padding: 0;
    font-size: 0.88rem;
  }
`;

const cellscorebase = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 215px;
  padding: 9px 20px;
  border: 4px solid #0f172a;
  box-shadow: 0 5px 0 #0f172a;

  @media only screen and (max-width: 760px) {
    min-width: 0;
    flex: 1;
    gap: 8px;
    padding: 6px 14px;
  }
`;

const CellScoreOne = styled.div`
  ${cellscorebase}
  border-radius: 18px 0 0 18px;
  background: #ff2a54;
`;

const CellScoreTwo = styled.div`
  ${cellscorebase}
  flex-direction: row-reverse;
  border-radius: 0 18px 18px 0;
  background: #00b4d8;
`;

const VsBadge = styled.div`
  z-index: 2;
  margin: 0 -14px;
  padding: 6px 10px;
  border-radius: 12px;
  background: #fde047;
  color: #0f172a;
  font-size: 0.92rem;
  border: 4px solid #0f172a;
  box-shadow: 0 4px 0 #0f172a;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.05;

  small {
    font-size: 0.65rem;
    opacity: 0.85;
  }
`;

const MatchPointBanner = styled.div`
  position: fixed;
  z-index: 89;
  top: 72px;
  left: 50%;
  padding: 4px 16px;
  border-radius: 999px;
  background: #ff2a54;
  color: #fde047;
  font-family: "RussoOne", sans-serif;
  font-size: 0.84rem;
  border: 3px solid #0f172a;
  box-shadow: 0 4px 0 #0f172a;
  pointer-events: none;
  animation: ${pulseAlert} 0.85s infinite ease-in-out;

  @media only screen and (max-width: 1080px) {
    top: 112px;
  }
`;

const SakuraiGoalBanner = styled.div`
  position: fixed;
  z-index: 94;
  top: 78px;
  left: 50%;
  transform: translateX(-50%) skewX(-8deg);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 22px;
  border-radius: 12px;
  background: linear-gradient(90deg, #ff2a54 0%, #0f172a 22%, #0f172a 78%, #00b4d8 100%);
  color: #fde047;
  font-family: "RussoOne", sans-serif;
  font-size: 1.04rem;
  letter-spacing: 0.04em;
  border: 3px solid #fde047;
  box-shadow: 0 6px 0 #0f172a;
  pointer-events: none;

  @media (prefers-reduced-motion: no-preference) {
    animation: ${goalPopShake} 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  @media only screen and (max-width: 1080px) {
    top: 116px;
    font-size: 0.88rem;
    padding: 6px 14px;
  }
`;

const ImpactFlashDot = styled.span`
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #fde047;

  @media (prefers-reduced-motion: no-preference) {
    animation: ${blink} 0.7s infinite ease-in-out;
  }
`;

const NameBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  gap: 4px;
  text-shadow: 0 2px 0 #0f172a;

  span {
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const MultiplierBadge = styled.span`
  font-size: 0.72rem;
  padding: 2px 6px;
  border-radius: 6px;
  background: #fde047;
  color: #0f172a;
  border: 2px solid #0f172a;
  text-shadow: none;
  font-style: normal;
`;

const CellScore = styled.div`
  font-size: 2.5rem;
  text-shadow: 0 3px 0 #0f172a;

  @media only screen and (max-width: 760px) {
    font-size: 1.85rem;
  }
`;

const TopRightActions = styled.nav`
  position: fixed;
  z-index: 100;
  top: 16px;
  right: 20px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;

  @media only screen and (max-width: 640px) {
    top: max(12px, env(safe-area-inset-top, 12px));
    left: 16px;
    right: 16px;
    justify-content: center;
    gap: 6px;
  }
`;

const HudBtn = styled.button`
  min-width: 38px;
  min-height: 36px;
  padding: 6px 11px;
  border-radius: 12px;
  border: 3px solid #0f172a;
  background: ${({ $muted }) => ($muted ? "#e2e8f0" : "#fde047")};
  color: #0f172a;
  font-family: "RussoOne", sans-serif;
  font-size: 0.82rem;
  cursor: pointer;
  box-shadow: 0 4px 0 #0f172a;
  transition: box-shadow 150ms ease-out, transform 150ms ease-out;

  @media only screen and (max-width: 640px) {
    min-width: 34px;
    min-height: 32px;
    padding: 4px 8px;
    font-size: 0.74rem;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 0 #0f172a;
  }
  &:active {
    transform: translateY(2px);
    box-shadow: 0 1px 0 #0f172a;
  }
`;

const CasterTicker = styled.div`
  position: fixed;
  z-index: 88;
  bottom: max(14px, env(safe-area-inset-bottom, 14px));
  left: 50%;
  transform: translateX(-50%);
  max-width: min(600px, calc(100vw - 32px));
  padding: 5px 16px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.92);
  color: #fde047;
  border: 3px solid #0f172a;
  outline: 2px solid #38bdf8;
  font-family: "RussoOne", sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  box-shadow: 0 4px 0 #0f172a;
`;

const PauseDialog = styled.dialog`
  border: none;
  background: transparent;
  padding: 0;
  margin: auto;
  overflow: visible;
`;

const PauseCard = styled.div`
  width: min(380px, calc(100vw - 36px));
  box-sizing: border-box;
  padding: 26px;
  border-radius: 26px;
  background: #ffffff;
  border: 5px solid #0f172a;
  box-shadow: 0 10px 0 #0f172a;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  font-family: "RussoOne", sans-serif;
`;

const PauseHeading = styled.h2`
  margin: 0;
  font-size: 2rem;
  color: #0f172a;
  font-style: italic;
`;

const PauseSub = styled.p`
  margin: 0 0 8px;
  font-family: system-ui, sans-serif;
  font-weight: 800;
  font-size: 0.95rem;
  color: #475569;
`;

const PauseActions = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ResumeBtn = styled.button`
  width: 100%;
  padding: 13px 20px;
  border-radius: 14px;
  border: 4px solid #0f172a;
  background: #4ade80;
  color: #0f172a;
  font-family: "RussoOne", sans-serif;
  font-size: 1.15rem;
  cursor: pointer;
  box-shadow: 0 5px 0 #0f172a;
  transition: transform 150ms ease-out;

  &:hover {
    background: #22c55e;
    transform: translateY(-2px);
  }
`;

const SecondaryDialogBtn = styled.button`
  width: 100%;
  padding: 11px 18px;
  border-radius: 14px;
  border: 3px solid #0f172a;
  background: #f1f5f9;
  color: #0f172a;
  font-family: "RussoOne", sans-serif;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 4px 0 #0f172a;
  transition: transform 150ms ease-out;

  &:hover {
    background: #e2e8f0;
    transform: translateY(-2px);
  }
`;
