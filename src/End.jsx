import React, { useEffect, useState, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { useTransition, animated } from "@react-spring/web";
import { useStore } from "./store";
import { resolveArenaMeta } from "./utils";
import { sound } from "./sound";
import { profiler } from "./profiler";
import { submitMatchScore, getLeaderboard } from "./leaderboard";
import { disconnectOnline } from "./net";
import { trackEvent } from "./telemetry";

const End = () => {
  const endGame = useStore((state) => state.endGame);
  const winner = useStore((state) => state.winner);
  const scoreOne = useStore((state) => state.playerOne);
  const scoreTwo = useStore((state) => state.playerTwo);
  const playerOneName = useStore((state) => state.playerOneName);
  const maxShotSpeed = useStore((state) => state.maxShotSpeed);
  const aiDifficulty = useStore((state) => state.aiDifficulty);
  const gameMode = useStore((state) => state.gameMode);
  const onlineRole = useStore((state) => state.onlineRole);
  const arena = useStore((state) => state.arena);
  const launchGame = useStore((state) => state.launchGame);
  const resetToMenu = useStore((state) => state.resetToMenu);

  const submittedRef = useRef(false);
  const [summary, setSummary] = useState(null);
  const [showModalBox, setShowModalBox] = useState(false);

  const isLocal = gameMode === "local";
  const isVictory = isLocal
    ? true
    : gameMode === "online" && onlineRole === "guest"
    ? scoreTwo > scoreOne
    : scoreOne > scoreTwo;

  useEffect(() => {
    if (!endGame) {
      setShowModalBox(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowModalBox(true);
    }, 1650);
    return () => clearTimeout(timer);
  }, [endGame]);

  useEffect(() => {
    if (!endGame) {
      submittedRef.current = false;
      setSummary(null);
      return;
    }
    if (submittedRef.current) return;
    submittedRef.current = true;

    const scouting = profiler.getPlayerScoutingReport();
    const isP1Winner = scoreOne > scoreTwo;
    const result = submitMatchScore({
      playerName: playerOneName,
      isWinner: isP1Winner,
      playerScore: scoreOne,
      foeScore: scoreTwo,
      maxShotKmh: maxShotSpeed || 95,
      aiDifficulty,
      gameMode,
      archetypeLabel: `${scouting.emoji} ${scouting.title}`,
      arenaName: resolveArenaMeta(arena).name,
    });

    trackEvent("match_end", {
      mode: gameMode,
      victory: isP1Winner,
      playerScore: scoreOne,
      foeScore: scoreTwo,
      maxShotKmh: maxShotSpeed || 95,
      archetype: scouting.title,
    });

    setSummary({
      scouting,
      pointsEarned: result.pointsEarned,
      rank: result.rank,
      leaderboard: result.leaderboard || getLeaderboard(),
    });
  }, [
    endGame,
    scoreOne,
    scoreTwo,
    playerOneName,
    maxShotSpeed,
    aiDifficulty,
    gameMode,
    arena,
  ]);

  const transitions = useTransition(endGame && showModalBox, {
    from: { opacity: 0, transform: "translate3d(0, 40px, 0)" },
    enter: { opacity: 1, transform: "translate3d(0, 0px, 0)" },
    leave: { opacity: 0, transform: "translate3d(0, -40px, 0)" },
  });

  if (!endGame) return null;

  const outcomeHeadline = isLocal
    ? "🏆 GAME SET!"
    : isVictory
    ? "🏆 VICTORY!"
    : "💥 DEFEAT!";
  const outcomeSub = isLocal
    ? `${winner} WINS THE CLASH!`
    : isVictory
    ? `${winner} TAKES THE CROWN!`
    : `${winner} WINS THE MATCH!`;

  const handleShareFeedback = () => {
    sound.playUiClick();
    const scoutTitle = summary?.scouting?.title || "Arcade Striker";
    const topKmh = maxShotSpeed || 95;
    trackEvent("feedback_shared", {
      mode: gameMode,
      scoreOne,
      scoreTwo,
      topKmh,
      archetype: scoutTitle,
    });
    const text = `🏒 Playtested Ultimate Smash Air Hockey (${scoreOne}-${scoreTwo} • Top Shot: ${topKmh} km/h • AI Scout: ${scoutTitle}) #threejs #r3f`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(window.location.origin)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {!showModalBox && (
        <OutcomeOverlay>
          <OutcomeSplashBanner role="status" $victory={isVictory}>
            <strong>{outcomeHeadline}</strong>
            <span>{outcomeSub}</span>
          </OutcomeSplashBanner>
        </OutcomeOverlay>
      )}

      {transitions(
        (style, item) =>
          item && (
            <EndScene as={animated.div} style={style}>
              <Card $victory={isVictory}>
                <Trophy>{isVictory ? "🏆" : "🥊"}</Trophy>
                <Title $victory={isVictory}>{outcomeHeadline}</Title>
                <WinnerSub>{outcomeSub}</WinnerSub>
                <StatsRow>
                  <StatPill>
                    SCORE: {scoreOne} — {scoreTwo}
                  </StatPill>
                  <StatPill $accent="#38bdf8">
                    TOP SHOT: {maxShotSpeed || 95} KM/H
                  </StatPill>
                  {summary && (
                    <StatPill $accent="#4ade80">
                      +{summary.pointsEarned} PTS
                    </StatPill>
                  )}
                </StatsRow>

                {summary?.scouting && (
                  <ScoutingBox>
                    <strong>
                      🎙️ AI SCOUT: {summary.scouting.emoji} {summary.scouting.title}
                    </strong>
                    <span>{summary.scouting.desc}</span>
                  </ScoutingBox>
                )}

                {summary?.leaderboard && (
                  <MiniTable>
                    <caption>
                      HALL OF FAME{" "}
                      {summary.rank > 0 ? `(YOU RANKED #${summary.rank})` : ""}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Player</th>
                        <th scope="col">Top KM/H</th>
                        <th scope="col">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.leaderboard.slice(0, 5).map((row, idx) => (
                        <tr key={row.id}>
                          <td>{idx + 1}</td>
                          <td>{row.name}</td>
                          <td>{row.topSpeed}</td>
                          <td>
                            <b>{row.score}</b>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </MiniTable>
                )}

                <ButtonRow>
                  <SecondaryBtn
                    type="button"
                    onClick={() => {
                      sound.playUiBack();
                      disconnectOnline();
                      resetToMenu();
                    }}>
                    Main Menu
                  </SecondaryBtn>
                  <PrimaryBtn
                    type="button"
                    autoFocus
                    onClick={() => {
                      sound.playUiClick();
                      trackEvent("rematch_clicked", { mode: gameMode, arena });
                      launchGame();
                    }}>
                    Play Again!
                  </PrimaryBtn>
                </ButtonRow>
                <FeedbackBtn type="button" onClick={handleShareFeedback}>
                  💬 Share Score & Playtest Feedback on X
                </FeedbackBtn>
              </Card>
            </EndScene>
          )
      )}
    </>
  );
};

export default End;

const outcomePopShake = keyframes`
  0% { opacity: 0; transform: scale(0.3) rotate(-6deg); }
  25% { opacity: 1; transform: scale(1.16) rotate(2.5deg) translateX(5px); }
  45% { transform: scale(0.95) rotate(-2deg) translateX(-5px); }
  65% { transform: scale(1.04) rotate(1deg) translateX(3px); }
  85% { transform: scale(0.99) rotate(-0.5deg) translateX(-2px); }
  100% { opacity: 1; transform: scale(1) rotate(0deg) translateX(0); }
`;

const OutcomeOverlay = styled.div`
  position: fixed;
  z-index: 98;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  padding: 16px;
`;

const OutcomeSplashBanner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px 34px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(9, 13, 28, 0.98) 100%);
  border: 5px solid ${({ $victory }) => ($victory ? "#fde047" : "#ff2a54")};
  outline: 4px solid #050a14;
  box-shadow: 0 10px 0 #050a14,
    0 0 36px ${({ $victory }) => ($victory ? "rgba(253, 224, 71, 0.45)" : "rgba(255, 42, 84, 0.45)")};
  font-family: "RussoOne", sans-serif;
  text-align: center;

  @media (prefers-reduced-motion: no-preference) {
    animation: ${outcomePopShake} 560ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  strong {
    font-size: clamp(2.1rem, 6vw, 3.6rem);
    font-style: italic;
    line-height: 1.05;
    color: ${({ $victory }) => ($victory ? "#fde047" : "#ff2a54")};
    text-shadow: 0 4px 0 #050a14;
  }

  span {
    font-size: clamp(0.85rem, 2.2vw, 1.15rem);
    color: #f8fafc;
    letter-spacing: 0.06em;
  }
`;

const EndScene = styled.div`
  position: fixed;
  z-index: 99;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: "RussoOne", sans-serif;
  text-align: center;
  background-color: rgba(9, 13, 28, 0.76);
  backdrop-filter: blur(5px);
  padding: 20px;
  box-sizing: border-box;
`;

const Card = styled.div`
  width: min(500px, calc(100vw - 36px));
  max-height: calc(100dvh - 40px);
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  padding: 22px 24px;
  border-radius: 24px;
  background: linear-gradient(180deg, #0f172a 0%, #172038 100%);
  color: #f8fafc;
  border: 4px solid ${({ $victory }) => ($victory ? "#fde047" : "#ff2a54")};
  outline: 4px solid #050a14;
  box-shadow: 0 12px 0 #050a14;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
`;

const Trophy = styled.div`
  font-size: 3rem;
  line-height: 1;
`;

const Title = styled.h1`
  margin: 0;
  padding: 0 0.5rem;
  font-size: clamp(1.9rem, 4.5vw, 2.8rem);
  font-style: italic;
  font-weight: 900;
  line-height: 1.08em;
  text-transform: uppercase;
  color: ${({ $victory }) => ($victory ? "#fde047" : "#ff2a54")};
  -webkit-text-stroke: 3px #050a14;
  text-shadow: 0 5px 0 #050a14;
`;

const WinnerSub = styled.div`
  font-size: 0.92rem;
  letter-spacing: 0.05em;
  color: #38bdf8;
`;

const StatsRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
`;

const StatPill = styled.div`
  font-size: 0.94rem;
  color: #050a14;
  background: ${({ $accent }) => $accent || "#fde047"};
  padding: 5px 11px;
  border-radius: 10px;
  border: 3px solid #050a14;
`;

const ScoutingBox = styled.div`
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border-radius: 12px;
  background: #0b1224;
  border: 2.5px solid #334155;
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: #f8fafc;

  strong {
    font-size: 0.86rem;
    color: #fde047;
  }

  span {
    font-family: system-ui, sans-serif;
    font-weight: 700;
    font-size: 0.76rem;
    color: #cbd5e1;
  }
`;

const MiniTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: system-ui, sans-serif;
  font-size: 0.78rem;
  text-align: left;

  caption {
    font-family: "RussoOne", sans-serif;
    font-size: 0.74rem;
    color: #94a3b8;
    margin-bottom: 4px;
    text-align: left;
  }

  th,
  td {
    padding: 5px 6px;
    border-bottom: 1.5px solid #1e293b;
    color: #f8fafc;
  }

  th {
    font-family: "RussoOne", sans-serif;
    font-size: 0.72rem;
    color: #38bdf8;
    background: #090e1c;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;
  justify-content: center;
  margin-top: 4px;
`;

const PrimaryBtn = styled.button`
  font-family: "RussoOne", sans-serif;
  flex: 1;
  min-height: 46px;
  padding: 10px 20px;
  border-radius: 14px;
  border: 4px solid #050a14;
  font-size: 1.15rem;
  color: #050a14;
  background: #4ade80;
  cursor: pointer;
  box-shadow: 0 5px 0 #050a14;

  &:hover {
    background: #22c55e;
  }
`;

const SecondaryBtn = styled.button`
  font-family: "RussoOne", sans-serif;
  min-height: 46px;
  padding: 10px 18px;
  border-radius: 14px;
  border: 3px solid #334155;
  font-size: 0.96rem;
  color: #f8fafc;
  background: #1e293b;
  cursor: pointer;
  box-shadow: 0 5px 0 #050a14;
`;

const FeedbackBtn = styled.button`
  font-family: "RussoOne", sans-serif;
  width: 100%;
  min-height: 38px;
  padding: 8px 14px;
  border-radius: 12px;
  border: 2px solid rgba(56, 189, 248, 0.45);
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  color: #bae6fd;
  background: rgba(15, 23, 42, 0.75);
  cursor: pointer;
  transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;

  &:hover {
    background: rgba(30, 41, 59, 0.95);
    border-color: #38bdf8;
    transform: translateY(-1px);
  }
`;
