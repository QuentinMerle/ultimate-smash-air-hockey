import React, { useState, useRef, useEffect } from "react";
import { useStore } from "./store";
import { sound } from "./sound";
import { getLeaderboard } from "./leaderboard";
import { trackEvent } from "./telemetry";
import { isAnyGamepadConnected } from "./gamepad";
import {
  createOnlineRoom,
  joinOnlineRoom,
  getInviteUrl,
  getRoomCodeFromUrl,
  disconnectOnline,
} from "./net";
import { FighterSelectGrid } from "./menu/FighterSelectGrid";
import { StageAndPuckDeck } from "./menu/StageAndPuckDeck";
import {
  StartScene,
  Title,
  BadgeScript,
  MainTitle,
  ControllerBadge,
  ArcadeCabinet,
  ModeList,
  PrimaryModeButton,
  SecondaryModeButton,
  OnlineModeButton,
  LeaderboardBtn,
  SetupForm,
  TagRow,
  FieldGroup,
  ArcadeInput,
  ControlsHint,
  ActionRow,
  BackBtn,
  ClashButton,
  HallDialog,
  HallCard,
  LeaderboardTable,
} from "./menu/StartStyles";

const DIFFICULTY_LABELS = {
  easy: "CPU (Easy)",
  medium: "CPU (Normal)",
  hard: "CPU (Expert)",
};

function legacyCopyFallback(text) {
  const field = Object.assign(document.createElement("textarea"), { value: text });
  field.setAttribute("readonly", "");
  field.style.cssText = "position:fixed;inset-block-start:0;opacity:0";
  document.body.append(field);
  field.select();
  try {
    return document.execCommand("copy");
  } finally {
    field.remove();
  }
}

const Start = () => {
  const inputOne = useRef();
  const inputTwo = useRef();
  const leaderboardDialogRef = useRef(null);
  const lastCopyStatusRef = useRef("");

  const startGame = useStore((state) => state.startGame);
  const gameMode = useStore((state) => state.gameMode);
  const aiDifficulty = useStore((state) => state.aiDifficulty);
  const winningScore = useStore((state) => state.winningScore);
  const arena = useStore((state) => state.arena);
  const playerOneStriker = useStore((state) => state.playerOneStriker);
  const playerTwoStriker = useStore((state) => state.playerTwoStriker);
  const puckStyle = useStore((state) => state.puckStyle);
  const roomCode = useStore((state) => state.roomCode);
  const onlineRole = useStore((state) => state.onlineRole);

  const setGameMode = useStore((state) => state.setGameMode);
  const setAiDifficulty = useStore((state) => state.setAiDifficulty);
  const setWinningScore = useStore((state) => state.setWinningScore);
  const setArena = useStore((state) => state.setArena);
  const setPlayerOneStriker = useStore((state) => state.setPlayerOneStriker);
  const setPlayerTwoStriker = useStore((state) => state.setPlayerTwoStriker);
  const setPuckStyle = useStore((state) => state.setPuckStyle);
  const setPlayerOneName = useStore((state) => state.namePlayerOne);
  const setPlayerTwoName = useStore((state) => state.namePlayerTwo);
  const launchGame = useStore((state) => state.launchGame);

  const [step, setStep] = useState("mode");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [joinCodeValue, setJoinCodeValue] = useState("");
  const [gamepadReady, setGamepadReady] = useState(false);

  useEffect(() => {
    const invitedCode = getRoomCodeFromUrl();
    if (invitedCode) {
      setGameMode("online");
      setJoinCodeValue(invitedCode);
      setStep("setup");
    }

    const checkPads = () => setGamepadReady(isAnyGamepadConnected());
    checkPads();
    window.addEventListener("gamepadconnected", checkPads);
    window.addEventListener("gamepaddisconnected", checkPads);
    return () => {
      window.removeEventListener("gamepadconnected", checkPads);
      window.removeEventListener("gamepaddisconnected", checkPads);
    };
  }, [setGameMode]);

  useEffect(() => {
    const dialog = leaderboardDialogRef.current;
    if (!dialog) return;
    if (showLeaderboard && !dialog.open) {
      setLeaderboardRows(getLeaderboard());
      dialog.showModal();
    } else if (!showLeaderboard && dialog.open) {
      dialog.close();
    }
  }, [showLeaderboard]);

  if (startGame) return null;

  const chooseMode = (mode) => {
    sound.playUiClick();
    disconnectOnline();
    setGameMode(mode);
    setStep("setup");
  };

  const handleCopyInvite = async () => {
    const url = getInviteUrl(roomCode);
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      ok = legacyCopyFallback(url);
    }
    if (ok) {
      trackEvent("invite_copied", { mode: "online" });
    }
    let msg = ok ? "Copied" : "Copy failed";
    if (msg === lastCopyStatusRef.current) {
      msg += "\u00A0";
    }
    lastCopyStatusRef.current = msg;
    setCopyStatus(msg);
    sound.playUiClick();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sound.playUiClick();
    const nameOne = inputOne.current?.value?.trim() || "Player 1";

    trackEvent("match_start", {
      mode: gameMode,
      striker: playerOneStriker,
      arena,
      difficulty: aiDifficulty,
      winningScore,
    });

    if (gameMode === "online") {
      if (joinCodeValue.trim()) {
        joinOnlineRoom(joinCodeValue.trim(), nameOne, playerOneStriker);
      } else {
        createOnlineRoom(nameOne, playerOneStriker);
      }
      return;
    }

    const nameTwo =
      gameMode === "ai"
        ? DIFFICULTY_LABELS[aiDifficulty]
        : inputTwo.current?.value?.trim() || "Player 2";

    setPlayerOneName(nameOne);
    setPlayerTwoName(nameTwo);
    launchGame();
  };

  const isSetup = step === "setup";

  return (
    <StartScene as="main" $compact={isSetup}>
      <Title $compact={isSetup}>
        <BadgeScript $compact={isSetup}>ULTIMATE SMASH</BadgeScript>
        <MainTitle $compact={isSetup}>AIR HOCKEY</MainTitle>
        {!isSetup && gamepadReady && (
          <ControllerBadge>🎮 GAMEPAD CONNECTED</ControllerBadge>
        )}
      </Title>

      <ArcadeCabinet>
        {step === "mode" && (
          <ModeList>
            <PrimaryModeButton
              type="button"
              onMouseEnter={() => sound.playUiHover()}
              onClick={() => chooseMode("ai")}>
              🤖 1P ARCADE VS CPU
            </PrimaryModeButton>
            <SecondaryModeButton
              type="button"
              onMouseEnter={() => sound.playUiHover()}
              onClick={() => chooseMode("local")}>
              🎮 2P VERSUS (SIDE VIEW)
            </SecondaryModeButton>
            <OnlineModeButton
              type="button"
              onMouseEnter={() => sound.playUiHover()}
              onClick={() => chooseMode("online")}>
              🌐 ONLINE P2P ARENA
            </OnlineModeButton>
            <LeaderboardBtn
              type="button"
              onMouseEnter={() => sound.playUiHover()}
              onClick={() => {
                sound.playUiClick();
                setShowLeaderboard(true);
              }}>
              🏆 HALL OF FAME (LEADERBOARD)
            </LeaderboardBtn>
          </ModeList>
        )}

        {step === "setup" && (
          <SetupForm onSubmit={handleSubmit}>
            <TagRow>
              <FieldGroup>
                <label htmlFor="p1-name-input">
                  {gameMode === "online" ? "Your Fighter Tag" : "Player 1 Tag"}
                </label>
                <ArcadeInput
                  id="p1-name-input"
                  ref={inputOne}
                  type="text"
                  defaultValue="Player 1"
                  maxLength="14"
                />
              </FieldGroup>

              {gameMode === "local" && (
                <FieldGroup>
                  <label htmlFor="p2-name-input">Player 2 Tag</label>
                  <ArcadeInput
                    id="p2-name-input"
                    ref={inputTwo}
                    type="text"
                    defaultValue="Player 2"
                    maxLength="14"
                  />
                </FieldGroup>
              )}
            </TagRow>

            <FighterSelectGrid
              gameMode={gameMode}
              playerOneStriker={playerOneStriker}
              playerTwoStriker={playerTwoStriker}
              onSelectP1={setPlayerOneStriker}
              onSelectP2={setPlayerTwoStriker}
            />

            <StageAndPuckDeck
              gameMode={gameMode}
              arena={arena}
              puckStyle={puckStyle}
              aiDifficulty={aiDifficulty}
              winningScore={winningScore}
              roomCode={roomCode}
              onlineRole={onlineRole}
              joinCodeValue={joinCodeValue}
              copyStatus={copyStatus}
              onSelectArena={setArena}
              onSelectPuck={setPuckStyle}
              onSelectDifficulty={setAiDifficulty}
              onSelectWinningScore={setWinningScore}
              onChangeJoinCode={setJoinCodeValue}
              onCopyInvite={handleCopyInvite}
            />

            <ControlsHint>
              {gameMode === "local" ? (
                <>
                  <div>🖱️ <b>P1 (Left)</b>: Mouse / Arrows / Pad 1 — Space/Click triggers Item & Super</div>
                  <div>⌨️ <b>P2 (Right)</b>: W A S D / Pad 2 — Shift / E triggers Item & Super</div>
                </>
              ) : (
                <>
                  <div>🖱️ <b>Move</b>: Mouse, Thumb Drag (Touch), Arrow Keys, or Gamepad Stick</div>
                  <div>⚡ <b>Item / Signature Super</b>: Left Click, Double-Tap (Touch), Space, or Pad A</div>
                </>
              )}
            </ControlsHint>

            <ActionRow>
              <BackBtn
                type="button"
                data-gamepad-back="true"
                onClick={() => {
                  sound.playUiBack();
                  disconnectOnline();
                  setJoinCodeValue("");
                  setStep("mode");
                }}>
                ← BACK
              </BackBtn>
              <ClashButton type="submit">
                {gameMode === "online"
                  ? joinCodeValue.trim()
                    ? "JOIN ARENA!"
                    : roomCode
                    ? "WAITING..."
                    : "CREATE INVITE ROOM!"
                  : "⚡ SMASH IT!"}
              </ClashButton>
            </ActionRow>
          </SetupForm>
        )}
      </ArcadeCabinet>

      <HallDialog
        ref={leaderboardDialogRef}
        aria-labelledby="hall-dialog-title"
        onCancel={(e) => {
          e.preventDefault();
          setShowLeaderboard(false);
        }}>
        <HallCard>
          <h2 id="hall-dialog-title">🏆 HALL OF FAME</h2>
          <LeaderboardTable>
            <caption>Top Arcade Scores & Radar Speeds</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Player</th>
                <th scope="col">Style</th>
                <th scope="col">KM/H</th>
                <th scope="col">Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardRows.slice(0, 7).map((row, idx) => (
                <tr key={row.id}>
                  <td>{idx + 1}</td>
                  <td>{row.name}</td>
                  <td>{row.archetype}</td>
                  <td>{row.topSpeed}</td>
                  <td>
                    <b>{row.score}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </LeaderboardTable>
          <ClashButton
            type="button"
            autoFocus
            onClick={() => {
              sound.playUiBack();
              setShowLeaderboard(false);
            }}>
            CLOSE
          </ClashButton>
        </HallCard>
      </HallDialog>
    </StartScene>
  );
};

export default Start;
